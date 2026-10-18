from __future__ import annotations

import json
import logging
import secrets
import urllib.parse
import urllib.request
from urllib.error import HTTPError
from datetime import datetime, timedelta
from threading import Lock
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field, HttpUrl
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import GithubIdentity, SkillQuestionBank, SkillQuizAttempt, SkillQuizCooldown, User, Verification
from app.routers.auth import current_user
from app.skill_catalog import KEYWORDS, SKILLS, TECHNICAL_SKILLS

router = APIRouter()
logger = logging.getLogger(__name__)
_rate_lock = Lock()
_rate_hits: dict[tuple[int, str], list[datetime]] = {}
_oauth_states: dict[str, tuple[int, datetime]] = {}
PASS_MARK = 0.7
COOLDOWN = timedelta(hours=24)
ATTEMPT_LIFETIME = timedelta(minutes=16)


def grade_quiz(answer_key: list[int], answers: list[int], tab_leaves: int) -> tuple[int, bool]:
    score = 0 if tab_leaves > 2 else sum(answer == key for answer, key in zip(answers, answer_key))
    return score, score / len(answer_key) >= PASS_MARK


def attempt_expired(expires_at: datetime, submitted_at: datetime | None, now: datetime | None = None) -> bool:
    return submitted_at is not None or (now or datetime.utcnow()) > expires_at


def cooldown_active(failed_at: datetime, now: datetime | None = None) -> bool:
    return (now or datetime.utcnow()) - failed_at < COOLDOWN


def github_checks_pass(checks: list[dict[str, object]]) -> bool:
    return all(bool(item["passed"]) for item in checks[:3]) and sum(bool(item["passed"]) for item in checks[3:]) / 4 >= 0.75


class SkillInput(BaseModel):
    skill: str = Field(min_length=1, max_length=120)


class QuizSubmit(BaseModel):
    id: str = Field(min_length=1, max_length=36)
    answers: list[int] = Field(min_length=1, max_length=15)


class GithubVerify(BaseModel):
    skill: str = Field(min_length=1, max_length=120)
    repo_url: HttpUrl


def _check_skill(skill: str) -> str:
    value = skill.strip()
    if value not in SKILLS:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Unknown skill.")
    return value


def _student_id(user: User) -> int:
    if user.student is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Skill verification is available to students only.")
    return user.student.id


def _rate_limit(user_id: int, action: str, limit: int = 10) -> None:
    now = datetime.utcnow()
    key = (user_id, action)
    with _rate_lock:
        hits = [hit for hit in _rate_hits.get(key, []) if now - hit < timedelta(minutes=1)]
        if len(hits) >= limit:
            raise HTTPException(status_code=429, detail="Too many requests. Try again shortly.")
        hits.append(now)
        _rate_hits[key] = hits


def _valid_questions(value: object) -> list[dict[str, object]]:
    if not isinstance(value, list):
        return []
    result = []
    for item in value:
        if not isinstance(item, dict):
            continue
        question = item.get("q")
        options = item.get("o")
        answer = item.get("a")
        if (
            isinstance(question, str)
            and isinstance(options, list)
            and len(options) == 4
            and all(isinstance(option, str) for option in options)
            and len(set(options)) == 4
            and isinstance(answer, int)
            and 0 <= answer < 4
        ):
            result.append({"q": question, "o": options, "a": answer})
    return result


def _public_questions(questions: list[dict[str, object]]) -> tuple[list[dict[str, object]], list[int]]:
    public_questions = []
    answer_key = []
    for question in questions[:15]:
        options = [{"text": text, "correct": index == question["a"]} for index, text in enumerate(question["o"])]  # type: ignore[index]
        secrets.SystemRandom().shuffle(options)
        answer_key.append(next(index for index, option in enumerate(options) if option["correct"]))
        public_questions.append({"q": question["q"], "o": [option["text"] for option in options]})
    return public_questions, answer_key


def _generate_questions(skill: str) -> list[dict[str, object]]:
    if not settings.gemini_api_key:
        raise HTTPException(status_code=503, detail="Quiz generation is not configured.")
    prompt = (
        f'Write 15 multiple-choice questions testing practical knowledge of "{skill}". '
        'Return JSON only: [{"q":"...","o":["...","...","...","..."],"a":0}]. '
        "Each question must have exactly four distinct options and one correct index."
    )
    request = urllib.request.Request(
        f"https://generativelanguage.googleapis.com/v1beta/models/{settings.gemini_model}:generateContent",
        data=json.dumps(
            {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "responseMimeType": "application/json",
                    "maxOutputTokens": 4000,
                    "temperature": 0.7,
                },
            }
        ).encode(),
        headers={
            "content-type": "application/json",
            "x-goog-api-key": settings.gemini_api_key,
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            payload = json.loads(response.read())
        parts = payload.get("candidates", [{}])[0].get("content", {}).get("parts", [])
        text = "".join(item.get("text", "") for item in parts)
        questions = _valid_questions(json.loads(text[text.find("[") : text.rfind("]") + 1]))
    except HTTPError as error:
        provider_error = error.read().decode("utf-8", "replace")
        logger.error("QUIZ ERROR: Gemini API returned HTTP %s: %s", error.code, provider_error)
        raise HTTPException(status_code=502, detail="Unable to prepare the quiz.") from error
    except (OSError, ValueError, KeyError, TypeError) as error:
        logger.error("QUIZ ERROR: %s", error)
        raise HTTPException(status_code=502, detail="Unable to prepare the quiz.") from error
    if len(questions) < 10:
        raise HTTPException(status_code=502, detail="Generated question bank was invalid.")
    return questions


def _question_bank(db: Session, skill: str) -> list[dict[str, object]]:
    bank = db.scalar(select(SkillQuestionBank).where(SkillQuestionBank.skill == skill))
    if bank is None:
        bank = SkillQuestionBank(skill=skill, questions=_generate_questions(skill))
        db.add(bank)
        db.commit()
        db.refresh(bank)
    questions = _valid_questions(bank.questions)
    if len(questions) < 10:
        raise HTTPException(status_code=502, detail="The stored question bank is invalid.")
    return questions


def _github_request(url: str, token: str) -> object:
    request = urllib.request.Request(url, headers={"accept": "application/vnd.github+json", "authorization": f"Bearer {token}"})
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            return json.loads(response.read())
    except (OSError, ValueError) as error:
        raise HTTPException(status_code=502, detail="GitHub could not be reached.") from error


@router.get("/verifications")
def get_verifications(user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict[str, object]:
    student_id = _student_id(user)
    rows = db.scalars(select(Verification).where(Verification.student_id == student_id, Verification.skill.is_not(None))).all()
    return {
        "verifications": [
            {"skill": row.skill, "method": row.method, "detail": row.detail, "verifiedAt": row.verified_at.isoformat() if row.verified_at else None}
            for row in rows
        ]
    }


@router.post("/quiz/start")
def start_quiz(input: SkillInput, user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict[str, object]:
    _rate_limit(user.id, "quiz-start")
    _student_id(user)
    skill = _check_skill(input.skill)
    cooldown = db.scalar(select(SkillQuizCooldown).where(SkillQuizCooldown.user_id == user.id, SkillQuizCooldown.skill == skill))
    if cooldown and cooldown_active(cooldown.failed_at):
        remaining = COOLDOWN - (datetime.utcnow() - cooldown.failed_at)
        raise HTTPException(status_code=429, detail=f"Retake available in {max(1, int(remaining.total_seconds() // 3600) + 1)} hour(s).")
    questions = _question_bank(db, skill)
    public_questions, answer_key = _public_questions(questions)
    attempt = SkillQuizAttempt(
        id=str(uuid4()),
        user_id=user.id,
        skill=skill,
        answer_key=answer_key,
        expires_at=datetime.utcnow() + ATTEMPT_LIFETIME,
    )
    db.add(attempt)
    db.commit()
    return {"id": attempt.id, "questions": public_questions, "expiresAt": f"{attempt.expires_at.isoformat()}Z"}


@router.post("/quiz/tab-leave")
def quiz_tab_leave(attempt_id: str = Query(min_length=1, max_length=36), user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict[str, bool]:
    _student_id(user)
    attempt = db.scalar(select(SkillQuizAttempt).where(SkillQuizAttempt.id == attempt_id, SkillQuizAttempt.user_id == user.id))
    if attempt and attempt.submitted_at is None:
        attempt.tab_leaves += 1
        db.commit()
    return {"recorded": bool(attempt)}


@router.post("/quiz/submit")
def submit_quiz(input: QuizSubmit, user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict[str, object]:
    _rate_limit(user.id, "quiz-submit")
    student_id = _student_id(user)
    attempt = db.scalar(select(SkillQuizAttempt).where(SkillQuizAttempt.id == input.id, SkillQuizAttempt.user_id == user.id))
    if attempt is None or attempt_expired(attempt.expires_at, attempt.submitted_at):
        raise HTTPException(status_code=400, detail="This attempt expired or was already submitted.")
    attempt.submitted_at = datetime.utcnow()
    total = len(attempt.answer_key)
    score, passed = grade_quiz(attempt.answer_key, input.answers, attempt.tab_leaves)
    if passed:
        verification = db.scalar(select(Verification).where(Verification.student_id == student_id, Verification.skill == attempt.skill))
        if verification is None:
            verification = Verification(student_id=student_id, skill=attempt.skill)
            db.add(verification)
        verification.method = "quiz"
        verification.detail = str(score)
        verification.verified_at = datetime.utcnow()
    else:
        cooldown = db.scalar(select(SkillQuizCooldown).where(SkillQuizCooldown.user_id == user.id, SkillQuizCooldown.skill == attempt.skill))
        if cooldown is None:
            db.add(SkillQuizCooldown(user_id=user.id, skill=attempt.skill, failed_at=datetime.utcnow()))
        else:
            cooldown.failed_at = datetime.utcnow()
    db.commit()
    return {"score": score, "total": total, "passed": passed, "correctAnswers": attempt.answer_key}
