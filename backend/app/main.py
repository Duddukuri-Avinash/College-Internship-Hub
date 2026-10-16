from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers.auth import router as auth_router
from app.routers.admin import router as admin_router
from app.routers.faculty import router as faculty_router
from app.routers.students import router as students_router
from app.routers.skill_verification import router as skill_verification_router

app = FastAPI(title=settings.app_name, version="0.1.0", debug=settings.app_debug)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(admin_router, prefix="/admin", tags=["admin"])
app.include_router(faculty_router, prefix="/faculty", tags=["faculty"])
app.include_router(students_router, prefix="/students", tags=["students"])
app.include_router(skill_verification_router, prefix="/students", tags=["skill verification"])


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok", "app": settings.app_name}


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "Welcome to InternHub API"}
