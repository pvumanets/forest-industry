from __future__ import annotations

import os

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker

_engine: Engine | None = None


def get_database_url() -> str:
    url = os.environ.get("DATABASE_URL_SYNC") or os.environ.get("DATABASE_URL")
    if not url:
        msg = "Укажите DATABASE_URL_SYNC или DATABASE_URL"
        raise RuntimeError(msg)
    # Alembic и sync SQLAlchemy используют psycopg3, не asyncpg
    if "+asyncpg" in url:
        return url.replace("+asyncpg", "+psycopg", 1)
    return url


def get_engine() -> Engine:
    global _engine
    if _engine is None:
        _engine = create_engine(
            get_database_url(),
            pool_pre_ping=True,
            connect_args={"connect_timeout": 10},
        )
    return _engine


def get_session_factory():
    return sessionmaker(bind=get_engine(), autoflush=False, autocommit=False, expire_on_commit=False)
