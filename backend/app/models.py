from __future__ import annotations

from datetime import datetime
from enum import Enum

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class UserRole(str, Enum):
    STUDENT = "student"
    FACULTY = "faculty"
    ADMIN = "admin"


class VerificationDecision(str, Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"
    ADDITIONAL_PROOF_REQUIRED = "additional_proof_required"


class InternshipMode(str, Enum):
    REMOTE = "Remote"
    ON_SITE = "On-site"
    HYBRID = "Hybrid"


class InternshipSource(str, Enum):
    COLLEGE_OPPORTUNITY = "College Opportunity"
    SELF_FOUND = "Self-Found"
    SENIOR_REFERRAL = "Senior Referral"


class ApplicationStatus(str, Enum):
    SAVED = "Saved"
    APPLIED = "Applied"
    INTERVIEW = "Interview"
    SELECTED = "Selected"
    REJECTED = "Rejected"
    WITHDRAWN = "Withdrawn"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    role: Mapped[UserRole] = mapped_column(String(20), default=UserRole.STUDENT, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_email_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_first_login: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    student: Mapped["Student | None"] = relationship(back_populates="user")
    faculty: Mapped["Faculty | None"] = relationship(back_populates="user")
    admin: Mapped["Admin | None"] = relationship(back_populates="user")
    notifications: Mapped[list["Notification"]] = relationship(back_populates="user")
    audit_logs: Mapped[list["AuditLog"]] = relationship(back_populates="actor")


class Department(Base):
    __tablename__ = "departments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    students: Mapped[list["Student"]] = relationship(back_populates="department")
    faculty: Mapped[list["Faculty"]] = relationship(back_populates="department")
    admin: Mapped[list["Admin"]] = relationship(back_populates="department")
    announcements: Mapped[list["Announcement"]] = relationship(back_populates="department")
    internships: Mapped[list["Internship"]] = relationship(back_populates="department")


class Student(Base):
    __tablename__ = "students"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, nullable=False)
    department_id: Mapped[int | None] = mapped_column(ForeignKey("departments.id"), nullable=True)
    mentor_id: Mapped[int | None] = mapped_column(ForeignKey("faculty.id"), nullable=True)
    roll_number: Mapped[str] = mapped_column(String(30), unique=True, nullable=False, index=True)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    section: Mapped[str | None] = mapped_column(String(10), nullable=True)
    cgpa: Mapped[float | None] = mapped_column(Float, nullable=True)
    profile_completion: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    readiness_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    branch: Mapped[str] = mapped_column(String(120), default="Unassigned", nullable=False)
    skills: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    programming_languages: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    tools: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    certifications: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    linked_in: Mapped[str | None] = mapped_column(String(500), nullable=True)
    github: Mapped[str | None] = mapped_column(String(500), nullable=True)
    preferred_domain: Mapped[str | None] = mapped_column(String(150), nullable=True)
    preferred_mode: Mapped[str | None] = mapped_column(String(40), nullable=True)
    preferred_location: Mapped[str | None] = mapped_column(String(150), nullable=True)
    dob: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    gender: Mapped[str | None] = mapped_column(String(20), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    about: Mapped[str | None] = mapped_column(Text, nullable=True)
    resume_file_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    resume_updated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user: Mapped[User] = relationship(back_populates="student")
    department: Mapped[Department | None] = relationship(back_populates="students")
    mentor: Mapped["Faculty | None"] = relationship(back_populates="mentored_students")
    applications: Mapped[list["InternshipApplication"]] = relationship(back_populates="student")
    documents: Mapped[list["Document"]] = relationship(back_populates="student")
    verifications: Mapped[list["Verification"]] = relationship(back_populates="student")
    experiences: Mapped[list["Experience"]] = relationship(back_populates="student")
    notifications: Mapped[list["Notification"]] = relationship(back_populates="student")


class Faculty(Base):
    __tablename__ = "faculty"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, nullable=False)
    department_id: Mapped[int | None] = mapped_column(ForeignKey("departments.id"), nullable=True)
    employee_id: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    designation: Mapped[str] = mapped_column(String(150), nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    user: Mapped[User] = relationship(back_populates="faculty")
    department: Mapped[Department | None] = relationship(back_populates="faculty")
    mentored_students: Mapped[list[Student]] = relationship(back_populates="mentor")
    created_internships: Mapped[list["Internship"]] = relationship(back_populates="created_by_faculty")
    verifications: Mapped[list["Verification"]] = relationship(back_populates="reviewer")
    student_notifications: Mapped[list["Notification"]] = relationship(back_populates="faculty")
    announcements: Mapped[list["Announcement"]] = relationship(back_populates="created_by_faculty")


class Admin(Base):
    __tablename__ = "admins"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, nullable=False)
    department_id: Mapped[int | None] = mapped_column(ForeignKey("departments.id"), nullable=True)
    employee_id: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    designation: Mapped[str] = mapped_column(String(150), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    user: Mapped[User] = relationship(back_populates="admin")
    department: Mapped[Department | None] = relationship(back_populates="admin")


class Internship(Base):
    __tablename__ = "internships"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    department_id: Mapped[int | None] = mapped_column(ForeignKey("departments.id"), nullable=True)
    created_by_faculty_id: Mapped[int | None] = mapped_column(ForeignKey("faculty.id"), nullable=True)
    company: Mapped[str] = mapped_column(String(200), nullable=False)
    role: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    source: Mapped[str] = mapped_column(String(30), default=InternshipSource.COLLEGE_OPPORTUNITY.value, nullable=False)
    mode: Mapped[str] = mapped_column(String(30), default=InternshipMode.HYBRID.value, nullable=False)
    location: Mapped[str] = mapped_column(String(200), default="Remote", nullable=False)
    duration: Mapped[str] = mapped_column(String(100), default="8 weeks", nullable=False)
    stipend: Mapped[int | None] = mapped_column(Integer, nullable=True)
    deadline: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    min_cgpa: Mapped[float | None] = mapped_column(Float, nullable=True)
    min_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    max_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    skills: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    branches: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    years: Mapped[list[int]] = mapped_column(JSON, default=list, nullable=False)
    match_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    link: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    department: Mapped[Department | None] = relationship(back_populates="internships")
    created_by_faculty: Mapped["Faculty | None"] = relationship(back_populates="created_internships")
    applications: Mapped[list["InternshipApplication"]] = relationship(back_populates="internship")


class InternshipApplication(Base):
    __tablename__ = "internship_applications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), nullable=False)
    internship_id: Mapped[int] = mapped_column(ForeignKey("internships.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default=ApplicationStatus.SAVED.value, nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    student: Mapped[Student] = relationship(back_populates="applications")
    internship: Mapped[Internship] = relationship(back_populates="applications")

    __table_args__ = (UniqueConstraint("student_id", "internship_id", name="uq_student_internship"),)


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    student_id: Mapped[int | None] = mapped_column(ForeignKey("students.id"), nullable=True)
    internship_id: Mapped[int | None] = mapped_column(ForeignKey("internships.id"), nullable=True)
    document_type: Mapped[str] = mapped_column(String(60), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    storage_key: Mapped[str | None] = mapped_column(String(500), nullable=True)
    mime_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    file_size_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(40), default=VerificationDecision.PENDING.value, nullable=False)
    uploaded_by: Mapped[str | None] = mapped_column(String(80), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    student: Mapped[Student | None] = relationship(back_populates="documents")
    verifications: Mapped[list["Verification"]] = relationship(back_populates="document")


class Verification(Base):
    __tablename__ = "verifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    student_id: Mapped[int | None] = mapped_column(ForeignKey("students.id"), nullable=True)
    document_id: Mapped[int | None] = mapped_column(ForeignKey("documents.id"), nullable=True)
    reviewer_id: Mapped[int | None] = mapped_column(ForeignKey("faculty.id"), nullable=True)
    decision: Mapped[str] = mapped_column(String(40), default=VerificationDecision.PENDING.value, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    skill: Mapped[str | None] = mapped_column(String(120), nullable=True)
    method: Mapped[str | None] = mapped_column(String(20), nullable=True)
    detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    student: Mapped[Student | None] = relationship(back_populates="verifications")
    reviewer: Mapped["Faculty | None"] = relationship(back_populates="verifications")
    document: Mapped[Document | None] = relationship(back_populates="verifications")


class SkillQuestionBank(Base):
    __tablename__ = "skill_question_banks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    skill: Mapped[str] = mapped_column(String(120), unique=True, nullable=False, index=True)
    questions: Mapped[list[dict[str, object]]] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class SkillQuizAttempt(Base):
    __tablename__ = "skill_quiz_attempts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    skill: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    answer_key: Mapped[list[int]] = mapped_column(JSON, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    tab_leaves: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class SkillQuizCooldown(Base):
    __tablename__ = "skill_quiz_cooldowns"
    __table_args__ = (UniqueConstraint("user_id", "skill", name="uq_quiz_cooldown_user_skill"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    skill: Mapped[str] = mapped_column(String(120), nullable=False)
    failed_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class GithubIdentity(Base):
    __tablename__ = "github_identities"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    github_id: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    login: Mapped[str] = mapped_column(String(120), nullable=False)
    access_token: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class Experience(Base):
    __tablename__ = "experiences"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), nullable=False)
    company: Mapped[str] = mapped_column(String(150), nullable=False)
    role: Mapped[str] = mapped_column(String(150), nullable=False)
    duration: Mapped[str] = mapped_column(String(100), nullable=False)
    internship_type: Mapped[str] = mapped_column(String(40), default="College Opportunity", nullable=False)
    skills_used: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    project_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    what_learned: Mapped[str | None] = mapped_column(Text, nullable=True)
    interview_process: Mapped[str | None] = mapped_column(Text, nullable=True)
    challenges: Mapped[str | None] = mapped_column(Text, nullable=True)
    recommendation: Mapped[str | None] = mapped_column(Text, nullable=True)
    rating: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="pending", nullable=False)
    approved_by: Mapped[int | None] = mapped_column(ForeignKey("faculty.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    student: Mapped[Student] = relationship(back_populates="experiences")


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    student_id: Mapped[int | None] = mapped_column(ForeignKey("students.id"), nullable=True)
    faculty_id: Mapped[int | None] = mapped_column(ForeignKey("faculty.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    notification_type: Mapped[str] = mapped_column(String(40), default="info", nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    user: Mapped[User | None] = relationship(back_populates="notifications")
    student: Mapped[Student | None] = relationship(back_populates="notifications")
    faculty: Mapped["Faculty | None"] = relationship(back_populates="student_notifications")


class Announcement(Base):
    __tablename__ = "announcements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    department_id: Mapped[int | None] = mapped_column(ForeignKey("departments.id"), nullable=True)
    created_by_faculty_id: Mapped[int | None] = mapped_column(ForeignKey("faculty.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    audience_scope: Mapped[str] = mapped_column(String(50), default="department", nullable=False)
    target_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    target_section: Mapped[str | None] = mapped_column(String(10), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    department: Mapped[Department | None] = relationship(back_populates="announcements")
    created_by_faculty: Mapped["Faculty | None"] = relationship(back_populates="announcements")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    actor_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    actor_role: Mapped[str] = mapped_column(String(30), nullable=False)
    action: Mapped[str] = mapped_column(String(200), nullable=False)
    target_type: Mapped[str | None] = mapped_column(String(80), nullable=True)
    target_id: Mapped[str | None] = mapped_column(String(80), nullable=True)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    actor: Mapped[User | None] = relationship(back_populates="audit_logs")


class Setting(Base):
    __tablename__ = "settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    key: Mapped[str] = mapped_column(String(120), unique=True, nullable=False, index=True)
    value: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(80), default="general", nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


__all__ = [
    "Admin",
    "Announcement",
    "ApplicationStatus",
    "AuditLog",
    "Department",
    "Document",
    "Experience",
    "Faculty",
    "Internship",
    "InternshipApplication",
    "InternshipMode",
    "InternshipSource",
    "Notification",
    "Setting",
    "Student",
    "User",
    "UserRole",
    "Verification",
    "VerificationDecision",
]
