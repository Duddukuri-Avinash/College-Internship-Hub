from __future__ import annotations

import json
import secrets
import urllib.parse
import urllib.request
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
    except (OSError, ValueError, KeyError, TypeError) as error:
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
    selected = questions[: min(15, len(questions))]
    public_questions = []
    answer_key = []
    for question in selected:
        options = [{"text": text, "correct": index == question["a"]} for index, text in enumerate(question["o"])]  # type: ignore[index]
        secrets.SystemRandom().shuffle(options)
        answer_key.append(next(index for index, option in enumerate(options) if option["correct"]))
        public_questions.append({"q": question["q"], "o": [option["text"] for option in options]})
    attempt = SkillQuizAttempt(
        id=str(uuid4()),
        user_id=user.id,
        skill=skill,
        answer_key=answer_key,
        expires_at=datetime.utcnow() + ATTEMPT_LIFETIME,
    )
    db.add(attempt)
    db.commit()
    return {"id": attempt.id, "questions": public_questions, "expiresAt": attempt.expires_at.isoformat()}


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
    return {"score": score, "total": total, "passed": passed}


@router.get("/github/oauth/start")
def github_oauth_start(user: User = Depends(current_user)) -> dict[str, str]:
    if not settings.github_client_id:
        raise HTTPException(status_code=503, detail="GitHub sign-in is not configured.")
    state = secrets.token_urlsafe(32)
    _oauth_states[state] = (user.id, datetime.utcnow() + timedelta(minutes=10))
    query = urllib.parse.urlencode({"client_id": settings.github_client_id, "redirect_uri": settings.github_oauth_redirect_uri, "scope": "read:user repo", "state": state})
    return {"url": f"https://github.com/login/oauth/authorize?{query}"}


@router.get("/github/oauth/callback")
def github_oauth_callback(code: str, state: str) -> object:
    state_data = _oauth_states.pop(state, None)
    if state_data is None or datetime.utcnow() > state_data[1] or not settings.github_client_id or not settings.github_client_secret:
        raise HTTPException(status_code=400, detail="Invalid GitHub OAuth state.")
    request = urllib.request.Request(
        "https://github.com/login/oauth/access_token",
        data=urllib.parse.urlencode({"client_id": settings.github_client_id, "client_secret": settings.github_client_secret, "code": code}).encode(),
        headers={"accept": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            token = json.loads(response.read()).get("access_token")
    except (OSError, ValueError) as error:
        raise HTTPException(status_code=502, detail="GitHub sign-in failed.") from error
    if not token:
        raise HTTPException(status_code=400, detail="GitHub did not return an access token.")
    profile = _github_request("https://api.github.com/user", token)
    if not isinstance(profile, dict) or "id" not in profile or "login" not in profile:
        raise HTTPException(status_code=502, detail="GitHub returned an invalid profile.")
    # OAuth callback has no bearer dependency; the state maps the account securely.
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        identity = db.get(GithubIdentity, state_data[0])
        if identity is None:
            identity = GithubIdentity(user_id=state_data[0], github_id=str(profile["id"]), login=str(profile["login"]), access_token=token)
            db.add(identity)
        else:
            identity.github_id = str(profile["id"])
            identity.login = str(profile["login"])
            identity.access_token = token
        db.commit()
    finally:
        db.close()
    from fastapi.responses import RedirectResponse
    return RedirectResponse(f"{settings.frontend_url}/?github=connected")


@router.get("/github/status")
def github_status(user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict[str, object]:
    _student_id(user)
    identity = db.get(GithubIdentity, user.id)
    return {"connected": identity is not None, "login": identity.login if identity else None}


@router.post("/github/verify")
def verify_github(input: GithubVerify, user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict[str, object]:
    _rate_limit(user.id, "github-verify", 5)
    student_id = _student_id(user)
    skill = _check_skill(input.skill)
    if skill not in TECHNICAL_SKILLS:
        raise HTTPException(status_code=400, detail="GitHub verification is unavailable for this skill.")
    identity = db.get(GithubIdentity, user.id)
    if identity is None:
        raise HTTPException(status_code=400, detail="Sign in with GitHub first.")
    parsed = urllib.parse.urlparse(str(input.repo_url))
    parts = [part for part in parsed.path.split("/") if part]
    if parsed.netloc != "github.com" or len(parts) != 2:
        raise HTTPException(status_code=422, detail="Enter a GitHub repository URL.")
    owner, repo = parts
    repo_data = _github_request(f"https://api.github.com/repos/{owner}/{repo}", identity.access_token)
    if not isinstance(repo_data, dict):
        raise HTTPException(status_code=502, detail="Invalid repository response.")
    text = " ".join(str(repo_data.get(key, "")) for key in ("description", "topics", "language")).lower()
    readme_text = ""
    readme = _github_request(f"https://api.github.com/repos/{owner}/{repo}/readme", identity.access_token)
    if isinstance(readme, dict):
        try:
            import base64
            readme_text = base64.b64decode(str(readme.get("content", ""))).decode("utf-8", "ignore")
            text += " " + readme_text.lower()
        except (ValueError, TypeError):
            pass
    keywords = KEYWORDS.get(skill, (skill.lower(),))
    ownership = str(repo_data.get("owner", {}).get("id")) == identity.github_id
    checks = [
        {"name": "Repository is owned by your GitHub account", "passed": ownership},
        {"name": "Repository is not a fork", "passed": not bool(repo_data.get("fork"))},
        {"name": "Repository uses this skill", "passed": any(keyword in text for keyword in keywords)},
        {"name": "At least 5 commits by your account", "passed": False},
        {"name": "Commits span at least 2 days", "passed": False},
        {"name": "README has 200+ characters", "passed": len(readme_text) >= 200},
        {"name": "Repository is at least 20 KB", "passed": int(repo_data.get("size", 0)) >= 20},
    ]
    commits = _github_request(f"https://api.github.com/repos/{owner}/{repo}/commits?author={urllib.parse.quote(identity.login)}&per_page=100", identity.access_token)
    if isinstance(commits, list):
        dates = {str(item.get("commit", {}).get("author", {}).get("date", ""))[:10] for item in commits if isinstance(item, dict)}
        checks[3]["passed"] = len(commits) >= 5
        checks[4]["passed"] = len(dates) >= 2
    passed = github_checks_pass(checks)
    if passed:
        reused = db.scalar(select(Verification).where(Verification.skill == skill, Verification.detail == str(input.repo_url), Verification.student_id != student_id))
        if reused:
            raise HTTPException(status_code=409, detail="This repository was already used for this skill by another account.")
        verification = db.scalar(select(Verification).where(Verification.student_id == student_id, Verification.skill == skill))
        if verification is None:
            verification = Verification(student_id=student_id, skill=skill)
            db.add(verification)
        verification.method = "github"
        verification.detail = str(input.repo_url)
        verification.verified_at = datetime.utcnow()
        db.commit()
    return {"passed": passed, "checks": checks}
