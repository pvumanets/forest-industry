"""Зависимости FastAPI: БД и текущий пользователь.

Все защищённые маршруты фаз 4+ должны использовать get_current_user.
"""

from __future__ import annotations

from collections.abc import Generator
from datetime import UTC, date, datetime, timedelta

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from gp_api.auth_tokens import sha256_hex
from gp_api.db.sync import get_session_factory
from gp_api.models.tables import User, UserSession
from gp_api.selectable_weeks import today_in_yekaterinburg

SESSION_COOKIE = "gp_session"
SESSION_MAX_AGE = 14 * 24 * 3600


def _expires_as_utc(exp: datetime) -> datetime:
    if exp.tzinfo is None:
        return exp.replace(tzinfo=UTC)
    return exp


def get_db() -> Generator[Session, None, None]:
    factory = get_session_factory()
    db = factory()
    try:
        yield db
    finally:
        db.close()


def _resolve_session_user(
    request: Request,
    db: Session,
    *,
    apply_sliding: bool,
) -> User | None:
    raw = request.cookies.get(SESSION_COOKIE)
    if not raw:
        return None
    token_hash = sha256_hex(raw)
    row = db.scalar(select(UserSession).where(UserSession.token_hash == token_hash))
    if row is None:
        return None
    now = datetime.now(UTC)
    if _expires_as_utc(row.expires_at) < now:
        db.delete(row)
        db.commit()
        return None
    user = db.get(User, row.user_id)
    if user is None or not user.is_active:
        return None
    if apply_sliding:
        row.last_seen_at = now
        row.expires_at = now + timedelta(days=14)
        db.commit()
    return user


def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
) -> User:
    user = _resolve_session_user(request, db, apply_sliding=True)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Требуется вход",
        )
    return user


def get_current_user_optional(
    request: Request,
    db: Session = Depends(get_db),
) -> User | None:
    return _resolve_session_user(request, db, apply_sliding=False)


def get_today_yekaterinburg() -> date:
    """Подменяется в тестах через app.dependency_overrides (без env в production)."""
    return today_in_yekaterinburg()
