from __future__ import annotations

import base64
import fnmatch
import json
import re
import secrets
import urllib.parse
import urllib.request
from datetime import datetime, timedelta
from pathlib import Path
from urllib.error import HTTPError

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import settings
from app.database import SessionLocal, get_db
from app.models import GithubIdentity, User, Verification
from app.routers.auth import current_user
from app.routers.skill_verification import _check_skill, _rate_limit, _student_id, github_checks_pass
from app.skill_catalog import KEYWORDS, TECHNICAL_SKILLS


router = APIRouter()
EVIDENCE_RULES_PATH = Path(__file__).resolve().parents[2] / "skill_evidence.json"
MAX_TREE_ENTRIES = 5000
MAX_FILE_BYTES = 100 * 1024
OAUTH_STATE_LIFETIME = timedelta(minutes=10)
_oauth_states: dict[str, tuple[int, datetime]] = {}


class GithubVerify(BaseModel):
    skill: str = Field(min_length=1, max_length=120)
    repo_url: str = Field(min_length=1, max_length=300)


class GithubAnalyze(BaseModel):
    repo_url: str = Field(min_length=1, max_length=300)


def _frontend_redirect(message: str) -> RedirectResponse:
    return RedirectResponse(f"{settings.frontend_url}/?github={urllib.parse.quote(message)}")


def _github_request(url: str, token: str | None = None) -> object:
    headers = {"accept": "application/vnd.github+json", "user-agent": "InternHub"}
    if token:
        headers["authorization"] = f"Bearer {token}"
    request = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            return json.loads(response.read())
    except HTTPError as error:
        if error.code == 404:
            raise HTTPException(status_code=404, detail="GitHub repository or README was not found.") from error
        if error.code in (401, 403):
            raise HTTPException(status_code=503, detail="GitHub rate limit or authorization prevented this check.") from error
        raise HTTPException(status_code=502, detail="GitHub returned an error.") from error
    except (OSError, ValueError) as error:
        raise HTTPException(status_code=502, detail="GitHub could not be reached.") from error


def _require_github_config() -> None:
    if not settings.github_client_id or not settings.github_client_secret or not settings.github_redirect_uri:
        raise HTTPException(status_code=503, detail="GitHub sign-in is not configured.")


def _parse_repo_url(value: str) -> tuple[str, str, str]:
    parsed = urllib.parse.urlsplit(value.strip())
    parts = parsed.path.split("/")
    if (
        parsed.scheme != "https"
        or parsed.netloc != "github.com"
        or parsed.query
        or parsed.fragment
        or len(parts) != 3
        or not parts[1]
        or not parts[2]
        or parts[2].endswith(".git")
    ):
        raise HTTPException(status_code=422, detail="Enter a repository URL in the form https://github.com/owner/repository.")
    owner, repo = parts[1], parts[2]
    return owner, repo, f"https://github.com/{owner}/{repo}"


def _identity_conflicts(existing: GithubIdentity | None, user_id: int) -> bool:
    return existing is not None and existing.user_id != user_id


def _owner_matches(login: str, owner: str) -> bool:
    return login.casefold() == owner.casefold()


@router.get("/github/login")
def github_login(user: User = Depends(current_user)) -> RedirectResponse:
    _require_github_config()
    state = secrets.token_urlsafe(32)
    _oauth_states[state] = (user.id, datetime.utcnow() + OAUTH_STATE_LIFETIME)
    query = urllib.parse.urlencode(
        {
            "client_id": settings.github_client_id,
            "redirect_uri": settings.github_redirect_uri,
            "state": state,
        }
    )
    return RedirectResponse(f"https://github.com/login/oauth/authorize?{query}")


@router.get("/github/callback")
def github_callback(code: str | None = Query(default=None), state: str | None = Query(default=None)) -> RedirectResponse:
    if not state or not code:
        raise HTTPException(status_code=400, detail="GitHub callback is missing code or state.")
    state_data = _oauth_states.pop(state, None)
    if state_data is None or datetime.utcnow() > state_data[1]:
        raise HTTPException(status_code=400, detail="Invalid or expired GitHub OAuth state.")
    _require_github_config()
    request = urllib.request.Request(
        "https://github.com/login/oauth/access_token",
        data=urllib.parse.urlencode(
            {
                "client_id": settings.github_client_id,
                "client_secret": settings.github_client_secret,
                "code": code,
                "redirect_uri": settings.github_redirect_uri,
            }
        ).encode(),
        headers={"accept": "application/json", "content-type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            token_response = json.loads(response.read())
    except HTTPError as error:
        try:
            token_response = json.loads(error.read())
        except (OSError, ValueError):
            token_response = {}
        provider_error = token_response.get("error_description") or token_response.get("error")
        if provider_error:
            raise HTTPException(status_code=400, detail=f"GitHub token exchange failed: {provider_error}") from error
        raise HTTPException(status_code=502, detail="GitHub sign-in failed during token exchange.") from error
    except (OSError, ValueError) as error:
        raise HTTPException(status_code=502, detail="GitHub sign-in failed.") from error
    token = token_response.get("access_token") if isinstance(token_response, dict) else None
    if not token:
        provider_error = token_response.get("error_description") or token_response.get("error") if isinstance(token_response, dict) else None
        detail = f"GitHub token exchange failed: {provider_error}" if provider_error else "GitHub did not return an access token."
        raise HTTPException(status_code=400, detail=detail)

    profile = _github_request("https://api.github.com/user", token)
    if not isinstance(profile, dict) or not profile.get("id") or not profile.get("login"):
        raise HTTPException(status_code=502, detail="GitHub returned an invalid profile.")
    github_id, login = str(profile["id"]), str(profile["login"])
    with SessionLocal() as db:
        linked = db.scalar(select(GithubIdentity).where(GithubIdentity.github_id == github_id))
        if _identity_conflicts(linked, state_data[0]):
            return _frontend_redirect("already-linked")
        identity = db.get(GithubIdentity, state_data[0])
        if identity is None:
            db.add(GithubIdentity(user_id=state_data[0], github_id=github_id, login=login))
        else:
            identity.github_id = github_id
            identity.login = login
        try:
            db.commit()
        except IntegrityError as error:
            db.rollback()
            return _frontend_redirect("already-linked")
    return _frontend_redirect("connected")


@router.get("/github/status")
def github_status(user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict[str, object]:
    _student_id(user)
    identity = db.get(GithubIdentity, user.id)
    return {"connected": identity is not None, "login": identity.login if identity else None}


@router.delete("/github/disconnect")
def github_disconnect(user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict[str, bool]:
    _student_id(user)
    identity = db.get(GithubIdentity, user.id)
    if identity is not None:
        db.delete(identity)
        db.commit()
    return {"connected": False}


def _skill_text(repo: dict[str, object], languages: object, readme_text: str) -> str:
    language_text = " ".join(languages.keys()) if isinstance(languages, dict) else ""
    topics = repo.get("topics", [])
    topic_text = " ".join(str(topic) for topic in topics) if isinstance(topics, list) else str(topics)
    return " ".join((language_text, topic_text, str(repo.get("description") or ""), readme_text)).lower()


def _skill_is_present(keywords: tuple[str, ...], text: str) -> bool:
    return any(re.search(rf"(?<![a-z0-9]){re.escape(keyword.casefold())}(?![a-z0-9])", text.casefold()) for keyword in keywords)


def _load_evidence_rules() -> dict[str, dict[str, list[str]]]:
    try:
        payload = json.loads(EVIDENCE_RULES_PATH.read_text(encoding="utf-8"))
        rules = payload.get("skills", {})
        if not isinstance(rules, dict):
            raise ValueError("skills must be an object")
        return {skill: rule for skill, rule in rules.items() if isinstance(skill, str) and isinstance(rule, dict)}
    except (OSError, ValueError, TypeError, json.JSONDecodeError) as error:
        raise HTTPException(status_code=500, detail="Skill evidence rules are unavailable.") from error


def _tree_paths(repo_tree: object) -> list[str]:
    if not isinstance(repo_tree, dict) or not isinstance(repo_tree.get("tree"), list):
        return []
    return [str(item.get("path")) for item in repo_tree["tree"][:MAX_TREE_ENTRIES] if isinstance(item, dict) and item.get("path")]


def _content_paths(paths: list[str]) -> list[str]:
    selected: list[str] = []
    names = {"package.json", "requirements.txt", "pyproject.toml", "pom.xml", "build.gradle", "dockerfile", "docker-compose.yml"}
    for path in paths:
        normalized = path.casefold()
        name = normalized.rsplit("/", 1)[-1]
        if name in names or normalized.startswith(".github/workflows/") or name.startswith("readme"):
            selected.append(path)
    return selected


def _decode_content(payload: object) -> str:
    if not isinstance(payload, dict) or payload.get("encoding") != "base64":
        return ""
    try:
        return base64.b64decode(str(payload.get("content", "")), validate=False)[:MAX_FILE_BYTES].decode("utf-8", "ignore")
    except (ValueError, TypeError):
        return ""


def _file_evidence(paths: list[str], contents: dict[str, str], rule: dict[str, list[str]]) -> list[str]:
    evidence: list[str] = []
    rule_names = [str(value).casefold() for value in rule.get("file_names", [])]
    extensions = [str(value).casefold() for value in rule.get("extensions", [])]
    for path in paths:
        normalized = path.casefold()
        name = normalized.rsplit("/", 1)[-1]
        if any(normalized == value or fnmatch.fnmatch(name, value) or normalized.startswith(value.rstrip("/") + "/") for value in rule_names):
            evidence.append(f"{path} found")
        else:
            matched_extension = next((extension for extension in extensions if normalized.endswith(extension)), None)
            if matched_extension:
                evidence.append(f"{path} matches {matched_extension}")
    return evidence


def _dependency_evidence(contents: dict[str, str], rule: dict[str, list[str]]) -> list[str]:
    evidence: list[str] = []
    dependencies = [str(value).casefold() for value in rule.get("dependency_names", [])]
    for path, content in contents.items():
        if path.casefold().rsplit("/", 1)[-1] in {"readme.md", "readme", "readme.txt"}:
            continue
        for dependency in dependencies:
            if _skill_is_present((dependency,), content):
                evidence.append(f"{path} has {dependency}")
    return evidence


def _readme_evidence(contents: dict[str, str], rule: dict[str, list[str]]) -> list[str]:
    readme = " ".join(content for path, content in contents.items() if path.casefold().rsplit("/", 1)[-1].startswith("readme"))
    return [f"README mentions {keyword}" for keyword in rule.get("readme_keywords", []) if _skill_is_present((str(keyword),), readme)]


def _analyze_evidence(paths: list[str], contents: dict[str, str], languages: object) -> list[dict[str, object]]:
    rules = _load_evidence_rules()
    language_names = {str(language).casefold() for language in languages} if isinstance(languages, dict) else set()
    results: list[dict[str, object]] = []
    for skill, rule in rules.items():
        evidence = _file_evidence(paths, contents, rule)
        evidence.extend(_dependency_evidence(contents, rule))
        for language in rule.get("languages", []):
            if str(language).casefold() in language_names:
                evidence.append(f"GitHub reports {language} language")
        evidence.extend(_readme_evidence(contents, rule))
        strong = any(" found" in item or " has " in item or " matches " in item for item in evidence)
        results.append({"skill": skill, "detected": bool(evidence), "strength": "strong" if strong else ("weak" if evidence else None), "evidence": evidence})
    return results


def _commit_summary(commits: object) -> dict[str, object]:
    dates = sorted({str(item.get("commit", {}).get("author", {}).get("date", ""))[:10] for item in commits if isinstance(item, dict) and str(item.get("commit", {}).get("author", {}).get("date", ""))} if isinstance(commits, list) else set())
    return {"count": len(commits) if isinstance(commits, list) else 0, "days": len(dates), "first_date": dates[0] if dates else None, "last_date": dates[-1] if dates else None}


def _repo_analysis(repo_url: str, identity: GithubIdentity) -> tuple[str, dict[str, object], object, list[dict[str, object]], dict[str, object]]:
    owner, repo, canonical_url = _parse_repo_url(repo_url)
    if not _owner_matches(identity.login, owner):
        raise HTTPException(status_code=403, detail="Repository owner must match your linked GitHub login.")
    base = f"https://api.github.com/repos/{urllib.parse.quote(owner)}/{urllib.parse.quote(repo)}"
    repo_data = _github_request(base, settings.github_api_token)
    if not isinstance(repo_data, dict):
        raise HTTPException(status_code=502, detail="Invalid repository response from GitHub.")
    if bool(repo_data.get("fork")):
        raise HTTPException(status_code=400, detail="Forked repositories cannot be verified.")
    languages = _github_request(f"{base}/languages", settings.github_api_token)
    tree = _github_request(f"{base}/git/trees/HEAD?recursive=1", settings.github_api_token)
    paths = _tree_paths(tree)
    contents = {path: _decode_content(_github_request(f"{base}/contents/{urllib.parse.quote(path, safe='/')}", settings.github_api_token)) for path in _content_paths(paths)}
    commits = _github_request(f"{base}/commits?author={urllib.parse.quote(identity.login)}&per_page=100", settings.github_api_token)
    return canonical_url, repo_data, languages, _analyze_evidence(paths, contents, languages), _commit_summary(commits)


@router.post("/github/analyze")
def analyze_github(input: GithubAnalyze, user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict[str, object]:
    _rate_limit(user.id, "github-analyze", 5)
    student_id = _student_id(user)
    identity = db.get(GithubIdentity, user.id)
    if identity is None:
        raise HTTPException(status_code=400, detail="Sign in with GitHub first.")
    canonical_url, _, languages, skills, commits = _repo_analysis(input.repo_url, identity)
    commit_ready = int(commits["count"]) >= 5 and int(commits["days"]) >= 2
    eligible = [item["skill"] for item in skills if item["detected"] and item["strength"] == "strong" and commit_ready]
    stored = db.scalars(select(Verification).where(Verification.student_id == student_id, Verification.method == "github", Verification.detail == canonical_url)).all()
    verified = [row.skill for row in stored if row.skill]
    return {"repo_url": canonical_url, "languages": languages, "skills": skills, "commits": commits, "commit_requirement_met": commit_ready, "eligible": eligible, "verified": verified}


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
    canonical_url, _, _, skills, commits = _repo_analysis(input.repo_url, identity)
    skill_result = next(item for item in skills if item["skill"] == skill)
    commit_ready = int(commits["count"]) >= 5 and int(commits["days"]) >= 2
    passed = bool(skill_result["strength"] == "strong" and commit_ready)
    if passed:
        reused = db.scalar(select(Verification).where(Verification.skill == skill, Verification.detail == canonical_url, Verification.student_id != student_id))
        if reused:
            raise HTTPException(status_code=409, detail="This repository was already used for this skill by another account.")
        verification = db.scalar(select(Verification).where(Verification.student_id == student_id, Verification.skill == skill))
        if verification is None:
            verification = Verification(student_id=student_id, skill=skill)
            db.add(verification)
        verification.method = "github"
        verification.detail = canonical_url
        verification.verified_at = datetime.utcnow()
        db.commit()
    return {"passed": passed, "skill": skill, "detected": skill_result["detected"], "strength": skill_result["strength"], "evidence": skill_result["evidence"], "commits": commits}
