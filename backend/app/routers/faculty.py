from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.database import get_db
from app.models import Faculty, InternshipApplication, Student, User, UserRole
from app.routers.auth import current_user

router = APIRouter()


def _verification_status(status: str) -> str:
    return {
        "pending": "Pending",
        "verified": "Verified",
        "approved": "Verified",
        "rejected": "Rejected",
        "additional_proof_required": "Additional Proof Required",
    }.get(status, "Pending")


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
