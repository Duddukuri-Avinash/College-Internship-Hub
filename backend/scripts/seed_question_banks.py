from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, TypedDict

# Allow `python scripts/seed_question_banks.py` as well as `python -m scripts.seed_question_banks`.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select

from app.database import SessionLocal
from app.models import SkillQuestionBank
from app.skill_catalog import SKILLS


BACKEND_ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = BACKEND_ROOT.parent
QUESTION_BANKS_PATH = BACKEND_ROOT / "question-banks.json"
GENERATED_BANK_FILENAME = "question-banks-generated.json"
CURATED_SOURCE = "curated"
AI_VERIFIED_SOURCE = "ai_verified"


class BankCandidate(TypedDict):
    questions: list[dict[str, object]]
    source: str


def normalize_bank(skill: str, questions: Any) -> list[dict[str, object]]:
    if skill not in SKILLS:
        raise ValueError(f"Unknown skill in question bank: {skill}")
    if not isinstance(questions, list) or len(questions) < 10:
        raise ValueError(f"{skill} must contain at least 10 questions")

    normalized: list[dict[str, object]] = []
    for position, item in enumerate(questions, start=1):
        if not isinstance(item, dict):
            raise ValueError(f"{skill} question {position} must be an object")
        question = item.get("question")
        options = item.get("options")
        answer_index = item.get("answer_index")
        if (
            not isinstance(question, str)
            or not question.strip()
            or not isinstance(options, list)
            or len(options) != 4
            or not all(isinstance(option, str) and option.strip() for option in options)
            or len(set(options)) != 4
            or not isinstance(answer_index, int)
            or isinstance(answer_index, bool)
            or not 0 <= answer_index < 4
        ):
            raise ValueError(f"{skill} question {position} is invalid")
        # The answer index stays in the server-side question bank under `a`.
        normalized.append({"q": question, "o": options, "a": answer_index})
    return normalized


def _read_bank_file(path: Path, source: str) -> dict[str, BankCandidate]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"{path.name} must contain an object")
    return {
        skill: {"questions": normalize_bank(skill, questions), "source": source}
        for skill, questions in payload.items()
    }


def _bank_file_paths() -> tuple[list[Path], list[Path]]:
    roots = (BACKEND_ROOT, PROJECT_ROOT)
    curated = {QUESTION_BANKS_PATH}
    generated: set[Path] = set()
    for root in roots:
        curated.update(root.glob("question-banks-batch*.json"))
        generated_path = root / GENERATED_BANK_FILENAME
        if generated_path.exists():
            generated.add(generated_path)
    return sorted(path for path in curated if path.exists()), sorted(generated)


def load_question_banks() -> dict[str, BankCandidate]:
    """Load banks with curated content taking precedence over AI content."""
    curated_paths, generated_paths = _bank_file_paths()
    candidates: dict[str, BankCandidate] = {}

    for path in curated_paths:
        for skill, candidate in _read_bank_file(path, CURATED_SOURCE).items():
            candidates.setdefault(skill, candidate)

    for path in generated_paths:
        for skill, candidate in _read_bank_file(path, AI_VERIFIED_SOURCE).items():
            if skill not in candidates:
                candidates[skill] = candidate
    return candidates


def seed_question_banks() -> int:
    normalized_banks = load_question_banks()
    with SessionLocal() as db:
        for skill, candidate in normalized_banks.items():
            bank = db.scalar(select(SkillQuestionBank).where(SkillQuestionBank.skill == skill))
            if bank is None:
                db.add(SkillQuestionBank(skill=skill, questions=candidate["questions"], source=candidate["source"]))
                continue

            existing_source = getattr(bank, "source", CURATED_SOURCE)
            if candidate["source"] == AI_VERIFIED_SOURCE and existing_source == CURATED_SOURCE:
                continue
            bank.questions = candidate["questions"]
            bank.source = candidate["source"]
        db.commit()
    return len(normalized_banks)


if __name__ == "__main__":
    curated_paths, generated_paths = _bank_file_paths()
    print(f"Loaded {len(curated_paths)} curated file(s) and {len(generated_paths)} generated file(s).")
    print(f"Seeded {seed_question_banks()} question banks.")
