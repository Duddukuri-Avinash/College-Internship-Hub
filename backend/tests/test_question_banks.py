from __future__ import annotations

import json
from pathlib import Path

from app.routers.skill_verification import _public_questions
from scripts.seed_question_banks import load_question_banks, normalize_bank


def test_seed_banks_validate_and_public_questions_hide_answers() -> None:
    source = json.loads((Path(__file__).parents[1] / "question-banks.json").read_text(encoding="utf-8"))

    for skill in ("Python", "SQL", "Excel"):
        stored = normalize_bank(skill, source[skill])
        public_questions, answer_key = _public_questions(stored)

        assert len(public_questions) == len(answer_key) == min(15, len(stored))
        assert all(set(question) == {"q", "o"} for question in public_questions)
        assert all(len(question["o"]) == 4 for question in public_questions)
        assert all("answer_index" not in question and "a" not in question for question in public_questions)
        assert all(0 <= answer < 4 for answer in answer_key)


def test_curated_bank_wins_over_generated_bank(tmp_path, monkeypatch) -> None:
    curated = {
        "Python": [
            {"question": f"Curated question {i}", "options": ["a", "b", "c", "d"], "answer_index": 0}
            for i in range(10)
        ]
    }
    generated = {
        "Python": [
            {"question": f"Generated question {i}", "options": ["a", "b", "c", "d"], "answer_index": 1}
            for i in range(10)
        ]
    }
    (tmp_path / "question-banks-batch1.json").write_text(json.dumps(curated), encoding="utf-8")
    (tmp_path / "question-banks-generated.json").write_text(json.dumps(generated), encoding="utf-8")

    import scripts.seed_question_banks as seed_module

    monkeypatch.setattr(seed_module, "BACKEND_ROOT", tmp_path)
    monkeypatch.setattr(seed_module, "PROJECT_ROOT", tmp_path)
    monkeypatch.setattr(seed_module, "QUESTION_BANKS_PATH", tmp_path / "missing.json")

    banks = load_question_banks()
    assert banks["Python"]["source"] == "curated"
    assert banks["Python"]["questions"][0]["q"] == "Curated question 0"
