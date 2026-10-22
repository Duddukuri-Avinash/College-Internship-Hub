from __future__ import annotations

import pytest

from app.routers.roadmaps import merge_market_skills


def test_market_refresh_preserves_base_skills_and_orders_roles() -> None:
    roadmaps = [
        {
            "id": "backend",
            "role": "Backend Developer",
            "summary": "Build backend services.",
            "keywords": ["backend"],
            "steps": [{"skill": "Python", "why": "Language"}],
            "marketRank": 2,
        },
        {
            "id": "data",
            "role": "Data Engineer",
            "summary": "Build data pipelines.",
            "keywords": ["data"],
            "steps": [{"skill": "SQL", "why": "Query data"}],
            "marketRank": 1,
        },
    ]
    generated = {
        "roadmaps": [
            {"id": "backend", "market_rank": 2, "skills": [{"skill": "FastAPI", "why": "Common in postings"}]},
            {"id": "data", "market_rank": 1, "skills": [{"skill": "SQL", "why": "Already listed"}, {"skill": "Airflow", "why": "Common in postings"}]},
        ],
        "new_roles": [],
    }

    result = merge_market_skills(roadmaps, generated)

    assert [roadmap["id"] for roadmap in result] == ["data", "backend"]
    assert [step["skill"] for step in result[0]["steps"]] == ["SQL", "Airflow"]
    assert [step["skill"] for step in result[1]["steps"]] == ["Python", "FastAPI"]


def test_market_refresh_rejects_missing_roles_or_duplicate_ranks() -> None:
    roadmaps = [
        {"id": "one", "steps": [{"skill": "Python", "why": "Language"}]},
        {"id": "two", "steps": [{"skill": "SQL", "why": "Database"}]},
    ]

    with pytest.raises(ValueError):
        merge_market_skills(roadmaps, {"roadmaps": [{"id": "one", "market_rank": 1, "skills": []}], "new_roles": []})
    with pytest.raises(ValueError):
        merge_market_skills(
            roadmaps,
            {
                "roadmaps": [
                    {"id": "one", "market_rank": 1, "skills": []},
                    {"id": "two", "market_rank": 1, "skills": []},
                ],
                "new_roles": [],
            },
        )


def test_market_refresh_can_add_a_new_role_with_technical_skills() -> None:
    roadmaps = [{"id": "backend", "role": "Backend Developer", "steps": [{"skill": "Python", "why": "Language"}]}]
    generated = {
        "roadmaps": [{"id": "backend", "market_rank": 2, "skills": []}],
        "new_roles": [
            {
                "role": "AI Application Engineer",
                "summary": "Build production AI applications.",
                "keywords": ["AI", "LLM"],
                "market_rank": 1,
                "skills": [{"skill": "RAG", "why": "Retrieval augmented generation"}],
            },
        ],
    }

    result = merge_market_skills(roadmaps, generated)

    assert [roadmap["role"] for roadmap in result] == ["AI Application Engineer", "Backend Developer"]
    assert result[0]["id"] == "ai-application-engineer"
    assert result[0]["steps"] == [{"skill": "RAG", "why": "Retrieval augmented generation"}]
