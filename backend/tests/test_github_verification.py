from __future__ import annotations

from datetime import datetime, timedelta
from types import SimpleNamespace
import base64

import pytest
from fastapi import HTTPException

from app.models import GithubIdentity
import app.routers.github as github_module
from app.routers.github import GithubVerify, _analyze_evidence, _identity_conflicts, _oauth_states, _owner_matches, _parse_repo_url, _skill_is_present, github_callback, verify_github
from app.routers.skill_verification import github_checks_pass
from app.skill_catalog import TECHNICAL_SKILLS


def test_state_mismatch_is_rejected() -> None:
    with pytest.raises(HTTPException) as error:
        github_callback(code="code", state="not-known")
    assert error.value.status_code == 400


def test_expired_state_is_rejected() -> None:
    _oauth_states["expired"] = (123, datetime.utcnow() - timedelta(seconds=1))
    try:
        with pytest.raises(HTTPException) as error:
            github_callback(code="code", state="expired")
        assert error.value.status_code == 400
    finally:
        _oauth_states.pop("expired", None)


def test_github_account_cannot_be_linked_to_two_users() -> None:
    identity = GithubIdentity(user_id=1, github_id="42", login="octocat")
    assert _identity_conflicts(identity, 2)
    assert not _identity_conflicts(identity, 1)


def test_owner_check_fails_for_someone_elses_repo() -> None:
    assert not _owner_matches("octocat", "someone-else")


def test_forks_are_rejected_by_required_check() -> None:
    checks = [
        {"passed": True},
        {"passed": False},
        {"passed": True},
        {"passed": True},
        {"passed": True},
        {"passed": True},
        {"passed": True},
    ]
    assert not github_checks_pass(checks)


def test_required_checks_and_three_of_four_scored_checks_pass() -> None:
    checks = [{"passed": True}] * 6 + [{"passed": False}]
    assert github_checks_pass(checks)


def test_non_technical_resume_only_skill_never_becomes_github_verified() -> None:
    assert "Negotiation" not in TECHNICAL_SKILLS
    assert "Communication" not in TECHNICAL_SKILLS


def test_repository_url_is_strict() -> None:
    assert _parse_repo_url("https://github.com/octocat/Hello-World")[2] == "https://github.com/octocat/Hello-World"
    with pytest.raises(HTTPException):
        _parse_repo_url("https://github.com/octocat/Hello-World/issues")


def test_skill_check_requires_repository_evidence() -> None:
    assert not _skill_is_present(("python", "py"), "javascript node react")
    assert _skill_is_present(("python", "py"), "This repository uses Python for data processing")


def test_dependency_and_dockerfile_evidence_are_strong() -> None:
    evidence = _analyze_evidence(
        ["package.json", "Dockerfile", "README.md"],
        {"package.json": '{"dependencies":{"react":"18.0.0"}}', "Dockerfile": "FROM python:3.13", "README.md": "A React application"},
        {"JavaScript": 100, "Python": 20},
    )
    by_skill = {item["skill"]: item for item in evidence}
    assert by_skill["React"]["strength"] == "strong"
    assert any("package.json has react" == item for item in by_skill["React"]["evidence"])
    assert by_skill["Docker"]["strength"] == "strong"
    assert "Dockerfile found" in by_skill["Docker"]["evidence"]


def test_weak_evidence_does_not_verify() -> None:
    evidence = _analyze_evidence(["README.md"], {"README.md": "This is a Python project"}, {})
    python = next(item for item in evidence if item["skill"] == "Python")
    assert python["detected"] is True
    assert python["strength"] == "weak"


def test_verification_uses_mocked_github_api(monkeypatch) -> None:
    readme = base64.b64encode(("Python project documentation. " * 10).encode()).decode()
    commits = [
        {"commit": {"author": {"date": "2026-01-01T00:00:00Z"}}},
        {"commit": {"author": {"date": "2026-01-01T01:00:00Z"}}},
        {"commit": {"author": {"date": "2026-01-02T00:00:00Z"}}},
        {"commit": {"author": {"date": "2026-01-02T01:00:00Z"}}},
        {"commit": {"author": {"date": "2026-01-02T02:00:00Z"}}},
    ]

    def fake_github_request(url: str, token: str | None = None) -> object:
        if url.endswith("/languages"):
            return {"Python": 1000}
        if "/git/trees/HEAD?recursive=1" in url:
            return {"tree": [{"path": "requirements.txt", "type": "blob"}, {"path": "README.md", "type": "blob"}]}
        if "/contents/requirements.txt" in url:
            return {"encoding": "base64", "content": base64.b64encode(b"fastapi\n").decode()}
        if "/contents/README.md" in url:
            return {"encoding": "base64", "content": readme}
        if url.endswith("/readme"):
            return {"content": readme}
        if "/commits?" in url:
            return commits
        return {"fork": False, "size": 25, "description": "A Python project", "topics": [], "owner": {"login": "octocat"}}

    class FakeDB:
        def __init__(self) -> None:
            self.identity = GithubIdentity(user_id=1, github_id="42", login="octocat")
            self.scalar_calls = 0
            self.saved: list[object] = []

        def get(self, model, key):
            return self.identity if model is GithubIdentity else None

        def scalar(self, query):
            self.scalar_calls += 1
            return None

        def add(self, value):
            self.saved.append(value)

        def commit(self):
            return None

    monkeypatch.setattr(github_module, "_github_request", fake_github_request)
    user = SimpleNamespace(id=1, student=SimpleNamespace(id=10))
    result = verify_github(GithubVerify(skill="Python", repo_url="https://github.com/octocat/project"), user, FakeDB())
    assert result["passed"] is True
    assert result["strength"] == "strong"


def test_fewer_than_five_commits_does_not_verify(monkeypatch) -> None:
    monkeypatch.setattr(github_module, "_repo_analysis", lambda url, identity: (url, {}, {}, [{"skill": "Python", "detected": True, "strength": "strong", "evidence": ["requirements.txt has python"]}], {"count": 4, "days": 2, "first_date": "2026-01-01", "last_date": "2026-01-02"}))

    class FakeDB:
        identity = GithubIdentity(user_id=1, github_id="42", login="octocat")
        def get(self, model, key): return self.identity
        def scalar(self, query): return None
        def add(self, value): raise AssertionError("verification must not be stored")
        def commit(self): raise AssertionError("verification must not be committed")

    result = verify_github(GithubVerify(skill="Python", repo_url="https://github.com/octocat/project"), SimpleNamespace(id=1, student=SimpleNamespace(id=10)), FakeDB())
    assert result["passed"] is False


def test_wrong_owner_and_fork_are_rejected() -> None:
    with pytest.raises(HTTPException) as owner_error:
        github_module._repo_analysis("https://github.com/someone/project", GithubIdentity(user_id=1, github_id="42", login="octocat"))
    assert owner_error.value.status_code == 403

    original = github_module._github_request
    try:
        github_module._github_request = lambda url, token=None: {"fork": True, "size": 1} if "/repos/" in url and "/languages" not in url and "/git/" not in url else {}
        with pytest.raises(HTTPException) as fork_error:
            github_module._repo_analysis("https://github.com/octocat/project", GithubIdentity(user_id=1, github_id="42", login="octocat"))
        assert fork_error.value.status_code == 400
    finally:
        github_module._github_request = original
