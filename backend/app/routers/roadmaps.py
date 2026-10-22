from __future__ import annotations

import json
import logging
import re
import urllib.request
from datetime import datetime, timedelta
from threading import Lock
from urllib.error import HTTPError

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import RoadmapSnapshot, User
from app.routers.auth import current_user
from app.routers.skill_verification import _student_id

router = APIRouter()
logger = logging.getLogger(__name__)
_refresh_lock = Lock()
_failed_refreshes: dict[tuple[str, str], datetime] = {}


class RoadmapStepInput(BaseModel):
    skill: str = Field(min_length=1, max_length=120)
    why: str = Field(default="", max_length=300)


class RoadmapInput(BaseModel):
    id: str = Field(min_length=1, max_length=80)
    role: str = Field(min_length=1, max_length=160)
    summary: str = Field(default="", max_length=500)
    keywords: list[str] = Field(default_factory=list, max_length=30)
    steps: list[RoadmapStepInput] = Field(min_length=1, max_length=100)
    marketRank: int | None = None


class RoadmapRefreshInput(BaseModel):
    roadmaps: list[RoadmapInput] = Field(min_length=1, max_length=50)


def merge_market_skills(roadmaps: list[dict[str, object]], generated: object) -> list[dict[str, object]]:
    if not isinstance(generated, dict):
        raise ValueError("The generated roadmap set was incomplete.")
    generated_roles = generated.get("roadmaps")
    new_roles = generated.get("new_roles", [])
    if not isinstance(generated_roles, list) or len(generated_roles) != len(roadmaps):
        raise ValueError("The generated roadmap set was incomplete.")
    if not isinstance(new_roles, list) or len(new_roles) > 10:
        raise ValueError("The generated new role list was invalid.")

    generated_by_id: dict[str, dict[str, object]] = {}
    for item in generated_roles:
        if not isinstance(item, dict) or not isinstance(item.get("id"), str) or item["id"] in generated_by_id:
            raise ValueError("The generated roadmap set contained invalid roles.")
        generated_by_id[item["id"]] = item
    if set(generated_by_id) != {str(roadmap["id"]) for roadmap in roadmaps}:
        raise ValueError("The generated roadmap roles did not match the catalog.")

    total_roles = len(roadmaps) + len(new_roles)
    merged = []
    ranks: set[int] = set()
    for roadmap in roadmaps:
        item = generated_by_id[str(roadmap["id"])]
        suggestions = item.get("skills")
        rank = item.get("market_rank")
        if not isinstance(suggestions, list) or not isinstance(rank, int) or rank < 1 or rank > total_roles or rank in ranks:
            raise ValueError("The generated roadmap ranking was invalid.")
        ranks.add(rank)

        steps = list(roadmap["steps"])
        known = {str(step["skill"]).strip().casefold() for step in steps}
        for suggestion in suggestions:
            if not isinstance(suggestion, dict):
                continue
            skill = suggestion.get("skill")
            why = suggestion.get("why", "")
            if not isinstance(skill, str) or not skill.strip() or len(skill) > 120:
                continue
            if not isinstance(why, str):
                why = ""
            if skill.strip().casefold() not in known:
                steps.append({"skill": skill.strip(), "why": why[:300]})
                known.add(skill.strip().casefold())

        merged.append({**roadmap, "steps": steps, "marketRank": rank})

    existing_ids = {str(roadmap["id"]) for roadmap in roadmaps}
    existing_roles = {str(roadmap["role"]).casefold() for roadmap in roadmaps}
    for item in new_roles:
        if not isinstance(item, dict):
            raise ValueError("A generated new role was invalid.")
        role = item.get("role")
        summary = item.get("summary")
        keywords = item.get("keywords")
        suggestions = item.get("skills")
        rank = item.get("market_rank")
        if (
            not isinstance(role, str)
            or not role.strip()
            or len(role) > 160
            or role.casefold() in existing_roles
            or not isinstance(summary, str)
            or not isinstance(keywords, list)
            or not isinstance(suggestions, list)
            or not suggestions
            or not isinstance(rank, int)
            or rank < 1
            or rank > total_roles
            or rank in ranks
        ):
            raise ValueError("The generated new role data was invalid.")
        role_id = re.sub(r"[^a-z0-9]+", "-", role.casefold()).strip("-")[:80]
        if not role_id or role_id in existing_ids:
            raise ValueError("The generated new role id was invalid.")
        steps = []
        known_skills: set[str] = set()
        for suggestion in suggestions:
            if not isinstance(suggestion, dict):
                continue
            skill = suggestion.get("skill")
            why = suggestion.get("why", "")
            if not isinstance(skill, str) or not skill.strip() or len(skill) > 120:
                continue
            if not isinstance(why, str):
                why = ""
            if skill.strip().casefold() not in known_skills:
                steps.append({"skill": skill.strip(), "why": why[:300]})
                known_skills.add(skill.strip().casefold())
        if not steps:
            raise ValueError("A generated new role had no valid technical skills.")
        clean_keywords = [value.strip()[:80] for value in keywords if isinstance(value, str) and value.strip()]
        ranks.add(rank)
        existing_ids.add(role_id)
        existing_roles.add(role.casefold())
        merged.append({
            "id": role_id,
            "role": role.strip(),
            "summary": summary.strip()[:500],
            "keywords": clean_keywords[:30],
            "steps": steps,
            "marketRank": rank,
        })

    if ranks != set(range(1, total_roles + 1)):
        raise ValueError("The generated roadmap ranking was incomplete.")
    return sorted(merged, key=lambda roadmap: int(roadmap["marketRank"]))


def _generate_market_roadmaps(roadmaps: list[dict[str, object]]) -> tuple[list[dict[str, object]], list[dict[str, str]]]:
    if not settings.gemini_api_key:
        raise RuntimeError("Gemini is not configured for roadmap research.")

    role_context = [
        {
            "id": roadmap["id"],
            "role": roadmap["role"],
            "summary": roadmap["summary"],
            "existing_skills": [step["skill"] for step in roadmap["steps"]],
        }
        for roadmap in roadmaps
    ]
    prompt = (
        f"Research current {settings.roadmap_market} internship and entry-level hiring demand for every role below using Google Search. "
        f"Order all roles by observed demand in current job postings. For each role, identify additional technical skills explicitly requested "
        f"by recent postings (programming languages, frameworks, platforms, tools, technical methods, and domain technologies). "
        f"Do not remove or repeat existing skills. Do not add soft skills. Return every supplied role exactly once and rank all supplied plus new roles. "
        "Also identify up to 10 materially distinct, currently hiring technical roles absent from the supplied catalog; include their role titles, short summaries, "
        "search keywords, and technical skills explicitly requested by recent postings. Include technical skills explicitly listed across the postings, not soft skills. "
        "Use recent, real job listing evidence; do not claim this is exhaustive.\n\n"
        f"Role catalog: {json.dumps(role_context, ensure_ascii=True)}"
    )
    response_schema = {
        "type": "object",
        "properties": {
            "roadmaps": {
                "type": "array",
                "minItems": len(roadmaps),
                "maxItems": len(roadmaps),
                "items": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "string"},
                        "market_rank": {"type": "integer", "minimum": 1, "maximum": len(roadmaps)},
                        "skills": {
                            "type": "array",
                            "maxItems": 60,
                            "items": {
                                "type": "object",
                                "properties": {
                                    "skill": {"type": "string"},
                                    "why": {"type": "string"},
                                },
                                "required": ["skill", "why"],
                            },
                        },
                    },
                    "required": ["id", "market_rank", "skills"],
                },
            },
            "new_roles": {
                "type": "array",
                "maxItems": 10,
                "items": {
                    "type": "object",
                    "properties": {
                        "role": {"type": "string"},
                        "summary": {"type": "string"},
                        "keywords": {"type": "array", "items": {"type": "string"}},
                        "market_rank": {"type": "integer", "minimum": 1, "maximum": len(roadmaps) + 10},
                        "skills": {
                            "type": "array",
                            "minItems": 1,
                            "maxItems": 60,
                            "items": {
                                "type": "object",
                                "properties": {
                                    "skill": {"type": "string"},
                                    "why": {"type": "string"},
                                },
                                "required": ["skill", "why"],
                            },
                        },
                    },
                    "required": ["role", "summary", "keywords", "market_rank", "skills"],
                },
            },
        },
        "required": ["roadmaps", "new_roles"],
    }
    request = urllib.request.Request(
        "https://generativelanguage.googleapis.com/v1beta/interactions",
        data=json.dumps(
            {
                "model": settings.gemini_model,
                "input": prompt,
                "system_instruction": "Research carefully and return valid JSON that matches the supplied schema. Ground findings in recent job listings from the requested market.",
                "tools": [{"type": "google_search"}],
                "response_format": [{"type": "text", "mime_type": "application/json", "schema": response_schema}],
                "generation_config": {"temperature": 0.2, "max_output_tokens": 12000},
                "store": False,
            }
        ).encode(),
        headers={"content-type": "application/json", "x-goog-api-key": settings.gemini_api_key},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            payload = json.loads(response.read())
    except HTTPError as error:
        provider_error = error.read().decode("utf-8", "replace")
        logger.error("ROADMAP ERROR: Gemini returned HTTP %s: %s", error.code, provider_error)
        raise RuntimeError(f"Gemini roadmap research failed with HTTP {error.code}.") from error

    text_parts = []
    sources: dict[str, dict[str, str]] = {}
    for step in payload.get("steps", []):
        if step.get("type") != "model_output":
            continue
        for content in step.get("content", []):
            if content.get("type") != "text":
                continue
            text_parts.append(content.get("text", ""))
            for annotation in content.get("annotations", []):
                citation = annotation.get("url_citation", annotation)
                url = citation.get("url") or citation.get("uri")
                title = citation.get("title")
                if isinstance(url, str) and url.startswith(("https://", "http://")):
                    sources[url] = {"title": title if isinstance(title, str) and title else url, "url": url}

    if not sources:
        raise RuntimeError("Gemini returned no verifiable market sources.")
    result = json.loads("".join(text_parts))
    merged = merge_market_skills(roadmaps, result)
    return merged, list(sources.values())[:30]


def _snapshot_response(snapshot: RoadmapSnapshot, is_current: bool) -> dict[str, object]:
    return {
        "roadmaps": snapshot.roadmaps,
        "sources": snapshot.sources,
        "market": snapshot.market,
        "month": snapshot.month,
        "updatedAt": snapshot.updated_at.isoformat() + "Z",
        "isCurrent": is_current,
    }


@router.post("/roadmaps/monthly")
def get_monthly_roadmaps(
    input: RoadmapRefreshInput,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> dict[str, object]:
    _student_id(user)
    now = datetime.utcnow()
    month = now.strftime("%Y-%m")
    market = settings.roadmap_market
    current = db.scalar(select(RoadmapSnapshot).where(RoadmapSnapshot.market == market, RoadmapSnapshot.month == month))
    if current:
        return _snapshot_response(current, True)

    base_roadmaps = [roadmap.model_dump() for roadmap in input.roadmaps]
    with _refresh_lock:
        current = db.scalar(select(RoadmapSnapshot).where(RoadmapSnapshot.market == market, RoadmapSnapshot.month == month))
        if current:
            return _snapshot_response(current, True)
        retry_after = _failed_refreshes.get((market, month))
        if retry_after is None or now >= retry_after:
            try:
                roadmaps, sources = _generate_market_roadmaps(base_roadmaps)
                snapshot = RoadmapSnapshot(market=market, month=month, roadmaps=roadmaps, sources=sources, updated_at=datetime.utcnow())
                db.add(snapshot)
                db.commit()
                db.refresh(snapshot)
                _failed_refreshes.pop((market, month), None)
                return _snapshot_response(snapshot, True)
            except Exception:
                db.rollback()
                _failed_refreshes[(market, month)] = datetime.utcnow() + timedelta(minutes=15)
                logger.exception("Monthly roadmap refresh failed for market %s", market)

    latest = db.scalar(
        select(RoadmapSnapshot)
        .where(RoadmapSnapshot.market == market)
        .order_by(RoadmapSnapshot.month.desc())
        .limit(1)
    )
    if latest:
        return _snapshot_response(latest, False)
    return {
        "roadmaps": base_roadmaps,
        "sources": [],
        "market": market,
        "month": month,
        "updatedAt": None,
        "isCurrent": False,
    }
