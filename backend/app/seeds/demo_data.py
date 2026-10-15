from __future__ import annotations

from app.database import Base, engine


def seed_demo_data() -> None:
    """Create the schema without inserting placeholder users or records."""
    Base.metadata.create_all(bind=engine)
    print("Schema created. No demo data was inserted.")


if __name__ == "__main__":
    seed_demo_data()
