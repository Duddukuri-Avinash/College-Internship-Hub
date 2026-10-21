from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.config import settings
from app.database import get_db
from app.models import Document, Faculty, InternshipApplication, Student, User, UserRole, Verification
from app.routers.auth import current_user

router = APIRouter()


class VerificationUpdate(BaseModel):
    decision: Literal["verified", "rejected", "additional_proof_required"]
    notes: str = Field(default="", max_length=2000)


def _verification_status(status: str) -> str:
    return {
        "pending": "Pending",
        "verified": "Verified",
        "approved": "Verified",
        "rejected": "Rejected",
        "additional_proof_required": "Additional Proof Required",
    }.get(status, "Pending")


def _verification_type(document_type: str) -> str:
    return {
        "offer_letter": "Offer Letter",
        "certificate": "Certificate",
        "other": "Self-Found",
    }.get(document_type.strip().lower(), "Experience")


@router.get("/profile")
def faculty_profile(user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict[str, object]:
    if user.role != UserRole.FACULTY or user.faculty is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Faculty access required.")

    faculty = db.scalar(select(Faculty).options(joinedload(Faculty.department)).where(Faculty.id == user.faculty.id))
    if faculty is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Faculty profile was not found.")

    return {
        "name": f"{user.first_name} {user.last_name}".strip(),
        "employeeId": faculty.employee_id,
        "dept": faculty.department.code if faculty.department else "Unassigned",
        "designation": faculty.designation,
        "email": user.email,
        "phone": "",
    }


@router.get("/students")
def faculty_students(user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict[str, list[dict[str, object]]]:
    if user.role != UserRole.FACULTY or user.faculty is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Faculty access required.")

    faculty = db.scalar(select(Faculty).options(joinedload(Faculty.department)).where(Faculty.id == user.faculty.id))
    if faculty is None or faculty.department is None:
        return {"students": []}

    rows = db.scalars(
        select(Student)
        .options(
            joinedload(Student.user),
            joinedload(Student.department),
            selectinload(Student.applications).selectinload(InternshipApplication.internship),
            selectinload(Student.documents),
            selectinload(Student.verifications),
        )
        .where(or_(Student.department_id == faculty.department_id, Student.branch == faculty.department.code))
        .order_by(Student.created_at.desc())
    ).all()
    return {
        "students": [
            {
                "id": str(row.id),
                "name": f"{row.user.first_name} {row.user.last_name}".strip(),
                "regNo": row.roll_number,
                "branch": row.branch,
                "year": row.year,
                "section": row.section or "A",
                "cgpa": row.cgpa or 0,
                "readiness": row.readiness_score,
                "status": (
                    "Completed"
                    if any(application.status == "Completed" for application in row.applications)
                    else "Ongoing"
                    if any(application.status == "Selected" for application in row.applications)
                    else "Applied"
                    if any(application.status == "Applied" for application in row.applications)
                    else "Not started"
                ),
                "verification": (
                    _verification_status(max(row.verifications, key=lambda verification: verification.created_at).decision)
                    if row.verifications
                    else "No submissions"
                ),
                "skills": row.skills or [],
                "email": row.user.email,
                "phone": row.phone or "",
                "applications": [
                    {
                        "company": application.internship.company,
                        "role": application.internship.role,
                        "status": application.status,
                        "date": application.created_at.date().isoformat(),
                    }
                    for application in row.applications
                ],
                "internships": [
                    {
                        "company": application.internship.company,
                        "role": application.internship.role,
                        "period": application.internship.duration,
                        "status": "Completed" if application.status == "Completed" else "Ongoing",
                    }
                    for application in row.applications
                    if application.status in {"Selected", "Completed"}
                ],
                "documents": [
                    {
                        "name": document.title or document.file_name,
                        "type": document.document_type,
                        "status": _verification_status(document.status),
                        "date": document.created_at.date().isoformat(),
                    }
                    for document in row.documents
                    if document.document_type.strip().lower() != "resume"
                ],
                "timeline": [
                    {
                        "date": verification.created_at.date().isoformat(),
                        "event": f"{verification.skill} verification" if verification.skill else "Document verification",
                        "by": "Faculty review",
                        "status": _verification_status(verification.decision),
                    }
                    for verification in row.verifications
                ],
            }
            for row in rows
        ]
    }


@router.get("/verifications")
def faculty_verifications(user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict[str, list[dict[str, object]]]:
    if user.role != UserRole.FACULTY or user.faculty is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Faculty access required.")

    faculty = db.scalar(select(Faculty).options(joinedload(Faculty.department)).where(Faculty.id == user.faculty.id))
    if faculty is None or faculty.department is None:
        return {"verifications": []}

    documents = db.scalars(
        select(Document)
        .join(Document.student)
        .options(joinedload(Document.student).joinedload(Student.user))
        .where(
            Document.document_type.in_(("offer_letter", "certificate", "other")),
            or_(Student.department_id == faculty.department_id, Student.branch == faculty.department.code),
        )
        .order_by(Document.created_at.desc())
    ).all()
    return {
        "verifications": [
            {
                "id": str(document.id),
                "documentId": str(document.id),
                "type": _verification_type(document.document_type),
                "student": f"{document.student.user.first_name} {document.student.user.last_name}".strip(),
                "regNo": document.student.roll_number,
                "branch": document.student.branch,
                "company": document.title or document.file_name,
                "role": document.document_type.replace("_", " ").title(),
                "submitted": document.created_at.date().isoformat(),
                "status": _verification_status(document.status),
                "file": document.file_name,
            }
            for document in documents
        ]
    }


@router.get("/documents/{document_id}/download")
def download_faculty_document(document_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)) -> FileResponse:
    if user.role != UserRole.FACULTY or user.faculty is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Faculty access required.")

    faculty = db.scalar(select(Faculty).options(joinedload(Faculty.department)).where(Faculty.id == user.faculty.id))
    if faculty is None or faculty.department is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Faculty department was not found.")

    document = db.scalar(
        select(Document)
        .join(Document.student)
        .where(
            Document.id == document_id,
            Document.document_type != "resume",
            or_(Student.department_id == faculty.department_id, Student.branch == faculty.department.code),
        )
    )
    if document is None or not document.storage_key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    path = Path(settings.upload_dir) / document.storage_key
    if not path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document file is not available.")
    return FileResponse(
        path,
        media_type=document.mime_type or "application/octet-stream",
        filename=document.file_name,
        content_disposition_type="inline",
    )


@router.patch("/verifications/{document_id}")
def update_faculty_verification(
    document_id: int,
    input: VerificationUpdate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    if user.role != UserRole.FACULTY or user.faculty is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Faculty access required.")

    faculty = db.scalar(select(Faculty).options(joinedload(Faculty.department)).where(Faculty.id == user.faculty.id))
    if faculty is None or faculty.department is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Faculty department was not found.")

    document = db.scalar(
        select(Document)
        .join(Document.student)
        .where(
            Document.id == document_id,
            Document.document_type != "resume",
            or_(Student.department_id == faculty.department_id, Student.branch == faculty.department.code),
        )
    )
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    document.status = input.decision
    db.add(
        Verification(
            student_id=document.student_id,
            document_id=document.id,
            reviewer_id=faculty.id,
            decision=input.decision,
            notes=input.notes.strip() or None,
            verified_at=datetime.utcnow() if input.decision == "verified" else None,
        )
    )
    db.commit()
    return {"status": _verification_status(input.decision)}
