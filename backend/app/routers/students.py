from __future__ import annotations

from pathlib import Path
from typing import Literal
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import Document, Student, User
from app.routers.auth import current_user

router = APIRouter()


class StudentDetailsUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    branch: str = Field(min_length=1, max_length=120)
    year: int = Field(ge=1, le=10)
    section: str = Field(min_length=1, max_length=10)
    phone: str = Field(default="", max_length=30)
    skills: list[str] = Field(default_factory=list)
    languages: list[str] = Field(default_factory=list)
    tools: list[str] = Field(default_factory=list)
    certifications: list[str] = Field(default_factory=list)
    linkedin: str = Field(default="", max_length=500)
    github: str = Field(default="", max_length=500)
    domain: str = Field(default="", max_length=150)
    mode: str = Field(default="", max_length=40)
    location: str = Field(default="", max_length=150)


def _student_for_user(db: Session, user: User) -> Student:
    student = db.scalar(select(Student).where(Student.user_id == user.id))
    if student is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student account details were not found.")
    return student


def _document(document: Document) -> dict[str, object]:
    return {
        "id": str(document.id),
        "fileName": document.file_name,
        "storagePath": document.storage_key or "",
        "mimeType": document.mime_type or "application/octet-stream",
        "sizeBytes": document.file_size_bytes or 0,
    }


def _account(student: Student, user: User, resume: Document | None) -> dict[str, object]:
    return {
        "fullName": f"{user.first_name} {user.last_name}".strip(),
        "email": user.email,
        "rollNumber": student.roll_number,
        "phone": student.phone or "",
        "branch": student.branch,
        "year": student.year,
        "section": student.section or "Unassigned",
        "skills": student.skills or [],
        "languages": student.programming_languages or [],
        "tools": student.tools or [],
        "certifications": student.certifications or [],
        "linkedin": student.linked_in or "",
        "github": student.github or "",
        "domain": student.preferred_domain or "",
        "mode": student.preferred_mode or "",
        "location": student.preferred_location or "",
        "resume": _document(resume) if resume else None,
    }


@router.get("/me")
def get_student_account(user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict[str, object]:
    student = _student_for_user(db, user)
    resume = db.scalar(
        select(Document)
        .where(Document.student_id == student.id, Document.document_type == "resume")
        .order_by(Document.created_at.desc())
    )
    return {"account": _account(student, user, resume)}


@router.patch("/me")
def update_student_account(
    input: StudentDetailsUpdate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> dict[str, object]:
    student = _student_for_user(db, user)
    student.branch = input.branch.strip()
    student.year = input.year
    student.section = input.section.strip()
    student.phone = input.phone.strip() or None
    student.skills = input.skills
    student.programming_languages = input.languages
    student.tools = input.tools
    student.certifications = input.certifications
    student.linked_in = input.linkedin.strip() or None
    student.github = input.github.strip() or None
    student.preferred_domain = input.domain.strip() or None
    student.preferred_mode = input.mode.strip() or None
    student.preferred_location = input.location.strip() or None
    db.commit()
    return {"status": "updated"}


def _save_document(
    upload: UploadFile,
    student: Student,
    kind: Literal["resume", "offer_letter", "certificate", "other"],
    db: Session,
) -> Document:
    upload_dir = Path(settings.upload_dir) / str(student.user_id)
    upload_dir.mkdir(parents=True, exist_ok=True)
    safe_name = Path(upload.filename or "upload.bin").name
    storage_key = f"{student.user_id}/{uuid4().hex}-{safe_name}"
    target = Path(settings.upload_dir) / storage_key
    with target.open("wb") as output:
        while chunk := upload.file.read(1024 * 1024):
            output.write(chunk)
    document = Document(
        student_id=student.id,
        document_type=kind,
        title=safe_name,
        file_name=safe_name,
        storage_key=storage_key,
        mime_type=upload.content_type,
        file_size_bytes=target.stat().st_size,
        uploaded_by=str(student.user_id),
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    return document


@router.post("/me/documents/{kind}")
def upload_student_document(
    kind: Literal["resume", "offer_letter", "certificate", "other"],
    file: UploadFile = File(...),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> dict[str, object]:
    student = _student_for_user(db, user)
    document = _save_document(file, student, kind, db)
    return {"document": _document(document)}


@router.get("/documents/{document_id}/download")
def download_student_document(
    document_id: int,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> FileResponse:
    student = _student_for_user(db, user)
    document = db.scalar(select(Document).where(Document.id == document_id, Document.student_id == student.id))
    if document is None or not document.storage_key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")
    path = Path(settings.upload_dir) / document.storage_key
    if not path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document file is not available.")
    return FileResponse(path, media_type=document.mime_type, filename=document.file_name)
