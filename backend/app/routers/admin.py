from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.database import get_db
from app.models import Admin, Faculty, InternshipApplication, Student, User, UserRole
from app.routers.auth import current_user

router = APIRouter()


def _require_admin(user: User = Depends(current_user)) -> User:
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Administrator access required.")
    return user


def _verification_status(status: str) -> str:
    return {
        "pending": "Pending",
        "verified": "Verified",
        "approved": "Verified",
        "rejected": "Rejected",
        "additional_proof_required": "Additional Proof Required",
    }.get(status, "Pending")


@router.get("/data")
def admin_data(_: User = Depends(_require_admin), db: Session = Depends(get_db)) -> dict[str, list[dict[str, object]]]:
    faculty_rows = db.scalars(
        select(Faculty).options(joinedload(Faculty.user), joinedload(Faculty.department)).order_by(Faculty.created_at.desc())
    ).all()
    student_rows = db.scalars(
        select(Student)
        .options(
            joinedload(Student.user),
            joinedload(Student.department),
            selectinload(Student.applications).selectinload(InternshipApplication.internship),
            selectinload(Student.documents),
            selectinload(Student.verifications),
        )
        .order_by(Student.created_at.desc())
    ).all()

    faculty = [
        {
            "id": str(row.id),
            "name": f"{row.user.first_name} {row.user.last_name}".strip(),
            "empId": row.employee_id,
            "dept": row.department.code if row.department else "Unassigned",
            "designation": row.designation,
            "email": row.user.email,
            "roles": ["Faculty Mentor"],
            "groups": [],
            "status": "Active" if row.is_active and row.user.is_active else "Inactive",
            "verified": 0,
            "turnaround": 0,
            "pending": {"verifications": 0, "requests": 0, "reviews": 0},
        }
        for row in faculty_rows
    ]
    approvals = [
        {
            "id": str(row.id),
            "name": f"{row.user.first_name} {row.user.last_name}".strip(),
            "empId": row.employee_id,
            "dept": row.department.code if row.department else "Unassigned",
            "designation": row.designation,
            "email": row.user.email,
            "date": row.created_at.isoformat(),
            "status": "Approved" if row.is_verified else "Pending",
        }
        for row in faculty_rows
    ]
    students = [
        {
            "id": str(row.id),
            "name": f"{row.user.first_name} {row.user.last_name}".strip(),
            "roll": row.roll_number,
            "branch": row.branch or (row.department.code if row.department else ""),
            "year": row.year,
            "section": row.section or "",
            "email": row.user.email,
            "phone": row.phone or "",
            "cgpa": row.cgpa or 0,
            "status": "Active" if row.is_active and row.user.is_active else "Inactive",
            "internship": (
                "Completed"
                if any(application.status == "Completed" for application in row.applications)
                else "Interning"
                if any(application.status == "Selected" for application in row.applications)
                else "Applied"
                if any(application.status == "Applied" for application in row.applications)
                else "None"
            ),
            "internships": sum(application.status in {"Selected", "Completed"} for application in row.applications),
            "profile": row.profile_completion,
            "resume": 100 if row.resume_file_name or any(document.document_type == "resume" for document in row.documents) else 0,
            "docs": [
                {
                    "name": document.title or document.file_name,
                    "status": _verification_status(document.status),
                }
                for document in row.documents
            ],
            "activity": [
                {
                    "time": document.created_at.isoformat(),
                    "text": f"Uploaded {document.title or document.file_name}",
                }
                for document in row.documents
            ],
        }
        for row in student_rows
    ]
    return {"faculty": faculty, "approvals": approvals, "students": students}


@router.post("/faculty/{employee_id}/approve")
def approve_faculty(employee_id: str, _: User = Depends(_require_admin), db: Session = Depends(get_db)) -> dict[str, str]:
    faculty = db.scalar(select(Faculty).where(Faculty.employee_id == employee_id.strip().upper()))
    if faculty is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Faculty registration not found.")
    faculty.is_verified = True
    db.commit()
    return {"status": "approved"}
