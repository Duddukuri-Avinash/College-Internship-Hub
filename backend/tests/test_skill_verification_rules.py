from __future__ import annotations

import pytest

from datetime import datetime, timedelta

from app.routers.skill_verification import (
    _check_skill,
    _valid_questions,
    attempt_expired,
    cooldown_active,
    github_checks_pass,
    grade_quiz,
)


def test_question_validation_rejects_duplicate_options_and_bad_answers() -> None:
    valid = {"q": "Which is Python?", "o": ["Python", "HTML", "CSS", "SQL"], "a": 0}
    duplicate = {"q": "Bad", "o": ["A", "A", "B", "C"], "a": 0}
    bad_index = {"q": "Bad", "o": ["A", "B", "C", "D"], "a": 4}
    assert _valid_questions([valid, duplicate, bad_index]) == [valid]


def test_only_allowlisted_skills_can_start_verification() -> None:
    assert _check_skill("Python") == "Python"
    with pytest.raises(Exception):
        _check_skill("not a real skill")


def test_grading_uses_server_answer_key_and_tab_leave_failure() -> None:
    score, passed = grade_quiz([2, 0, 1, 3], [2, 0, 1, 3], 0)
    assert (score, passed) == (4, True)
    score, passed = grade_quiz([2, 0, 1, 3], [2, 0, 1, 3], 3)
    assert (score, passed) == (0, False)


def test_expired_and_submitted_attempts_are_rejected() -> None:
    now = datetime.utcnow()
    assert attempt_expired(now - timedelta(seconds=1), None, now)
    assert attempt_expired(now + timedelta(minutes=1), now, now)
    assert not attempt_expired(now + timedelta(minutes=1), None, now)


def test_cooldown_and_github_required_and_scored_checks() -> None:
    now = datetime.utcnow()
    assert cooldown_active(now - timedelta(hours=1), now)
    assert not cooldown_active(now - timedelta(hours=25), now)
    required = [{"passed": True}] * 3
    assert github_checks_pass(required + [{"passed": True}] * 3 + [{"passed": False}])
    assert not github_checks_pass(required[:2] + [{"passed": False}] + [{"passed": True}] * 4)
