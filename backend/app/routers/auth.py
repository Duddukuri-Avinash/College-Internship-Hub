from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import Admin, Department, Faculty, Student, User, UserRole

router = APIRouter()
bearer = HTTPBearer(auto_error=False)
passwords = CryptContext(schemes=["bcrypt"], deprecated="auto")
DEPARTMENTS = {
    "CSE": "Computer Science and Engineering (CSE)",
    "CSE-AIML": "Computer Science and Engineering (AI & ML)",
    "CSE-DS": "Computer Science and Engineering (Data Science)",
    "AI": "Artificial Intelligence (AI)",
    "AI-DS": "Artificial Intelligence & Data Science (AI & DS)",
    "QC": "Quantum Computing",
    "IT": "Information Technology (IT)",
    "ECE": "Electronics and Communication Engineering (ECE)",
    "EEE": "Electrical and Electronics Engineering (EEE)",
    "MECH": "Mechanical Engineering (MECH)",
    "CIV": "Civil Engineering (CIV)",
    "CHEM": "Chemical Engineering (CHEM)",
}


class LoginRequest(BaseModel):
    identifier: str = Field(min_length=1, max_length=254)
    password: str = Field(min_length=1, max_length=1024)
    role: Literal["student", "faculty", "admin"]


class StudentRegistration(BaseModel):
    name: str = Field(min_length=3, max_length=200)
    roll: str = Field(min_length=1, max_length=30)
    email: EmailStr
    phone: str = Field(min_length=7, max_length=30)
    password: str = Field(min_length=8, max_length=128)


class FacultyRegistration(BaseModel):
    name: str = Field(min_length=3, max_length=200)
    employeeId: str = Field(min_length=1, max_length=50)
    dept: str = Field(min_length=1, max_length=20)
    designation: str = Field(min_length=1, max_length=150)
    email: EmailStr
    phone: str = Field(min_length=7, max_length=30)
    password: str = Field(min_length=8, max_length=128)


class PasswordUpdate(BaseModel):
    password: str = Field(min_length=8, max_length=128)


def _profile(user: User) -> dict[str, str | int | bool]:
    role = user.role.value if isinstance(user.role, UserRole) else str(user.role)
    return {
        "id": str(user.id),
        "email": user.email,
        "full_name": f"{user.first_name} {user.last_name}".strip(),
        "role": role,
        "status": "active" if user.is_active else "inactive",
        "first_login": user.is_first_login,
    }


def _name_parts(name: str) -> tuple[str, str]:
    parts = name.strip().split(maxsplit=1)
    return parts[0], parts[1] if len(parts) == 2 else ""


def _token(user: User) -> str:
    expires = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_access_token_expire_minutes)
    return jwt.encode({"sub": str(user.id), "exp": expires}, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def _find_user(db: Session, identifier: str, role: str) -> User | None:
    normalized = identifier.strip()
    if role == UserRole.STUDENT.value:
        user = db.scalar(select(User).join(Student).where(Student.roll_number == normalized.upper()))
    elif role == UserRole.FACULTY.value:
        user = db.scalar(select(User).join(Faculty).where(Faculty.employee_id == normalized.upper()))
    else:
        user = db.scalar(select(User).join(Admin).where(Admin.employee_id == normalized.upper()))
    if user is not None:
        return user
    return db.scalar(select(User).where(User.email == normalized.lower(), User.role == role))


def current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")
    try:
        payload = jwt.decode(credentials.credentials, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        user_id = int(payload["sub"])
    except (JWTError, KeyError, TypeError, ValueError) as error:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication token.") from error
    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account is not active.")
    return user


@router.post("/login")
def login(input: LoginRequest, db: Session = Depends(get_db)) -> dict[str, object]:
    user = _find_user(db, input.identifier, input.role)
    if user is None or not user.password_hash or not passwords.verify(input.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account or password is incorrect.")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This account is not active.")
    if input.role == UserRole.FACULTY.value and not user.faculty.is_verified:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This faculty account is pending admin approval.")
    return {"profile": _profile(user), "access_token": _token(user)}


@router.post("/register/student", status_code=status.HTTP_201_CREATED)
def register_student(input: StudentRegistration, db: Session = Depends(get_db)) -> dict[str, object]:
    roll = input.roll.strip().upper()
    email = str(input.email).lower()
    if db.scalar(select(Student).where(Student.roll_number == roll)) or db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account already exists for this roll number.")
    first_name, last_name = _name_parts(input.name)
    user = User(email=email, password_hash=passwords.hash(input.password), first_name=first_name, last_name=last_name, role=UserRole.STUDENT)
    db.add(user)
    db.flush()
    db.add(Student(user_id=user.id, roll_number=roll, year=1, phone=input.phone.strip()))
    db.commit()
    return {"profile": _profile(user)}


@router.post("/register/faculty", status_code=status.HTTP_201_CREATED)
def register_faculty(input: FacultyRegistration, db: Session = Depends(get_db)) -> dict[str, object]:
    email = str(input.email).lower()
    employee_id = input.employeeId.strip().upper()
    department_code = input.dept.strip().upper()
    department_name = DEPARTMENTS.get(department_code)
    if department_name is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Select a valid department.")
    if db.scalar(select(User).where(User.email == email)) or db.scalar(select(Faculty).where(Faculty.employee_id == employee_id)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account already exists for this faculty member.")
    department = db.scalar(select(Department).where(Department.code == department_code))
    if department is None:
        department = Department(code=department_code, name=department_name)
        db.add(department)
        db.flush()
    first_name, last_name = _name_parts(input.name)
    user = User(email=email, password_hash=passwords.hash(input.password), first_name=first_name, last_name=last_name, role=UserRole.FACULTY)
    db.add(user)
    db.flush()
    db.add(Faculty(user_id=user.id, department_id=department.id, employee_id=employee_id, designation=input.designation))
    db.commit()
    return {"profile": _profile(user)}


@router.get("/me")
def me(user: User = Depends(current_user)) -> dict[str, object]:
    return {"profile": _profile(user)}


@router.post("/password")
def update_password(input: PasswordUpdate, user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict[str, str]:
    user.password_hash = passwords.hash(input.password)
    user.is_first_login = False
    db.commit()
    return {"status": "updated"}
