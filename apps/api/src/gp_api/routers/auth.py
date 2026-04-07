from __future__ import annotations

import secrets
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from gp_api.auth_tokens import sha256_hex
from gp_api.config import get_settings
from gp_api.deps import SESSION_COOKIE, SESSION_MAX_AGE, get_current_user, get_db
from gp_api.models.tables import Outlet, User, UserOutlet, UserRole, UserSession
from gp_api.password_verify import verify_user_password
from gp_api.schemas.auth import LoginRequest, LoginResponse, MeResponse, OutletMe, UserPublic

router = APIRouter()


def _set_session_cookie(response: Response, raw_token: str) -> None:
    s = get_settings()
    response.set_cookie(
        key=SESSION_COOKIE,
        value=raw_token,
        max_age=SESSION_MAX_AGE,
        httponly=True,
        samesite="lax",
        secure=s.cookie_secure(),
        path="/",
    )


def _clear_session_cookie(response: Response) -> None:
    s = get_settings()
    response.delete_cookie(
        key=SESSION_COOKIE,
        path="/",
        httponly=True,
        samesite="lax",
        secure=s.cookie_secure(),
    )


@router.post("/login")
def auth_login(
    body: LoginRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> JSONResponse:
    user = db.scalar(select(User).where(User.login == body.login))
    if user is None or not user.is_active or not verify_user_password(user, body.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный логин или пароль",
        )
    raw = secrets.token_urlsafe(32)
    now = datetime.now(UTC)
    sess = UserSession(
        user_id=user.id,
        token_hash=sha256_hex(raw),
        expires_at=now + timedelta(days=14),
        last_seen_at=now,
        user_agent=request.headers.get("user-agent"),
        ip=request.client.host if request.client else None,
    )
    db.add(sess)
    db.commit()
    payload = LoginResponse(
        user=UserPublic(
            id=user.id,
            login=user.login,
            display_name=user.display_name,
            role=user.role.value,
        ),
    ).model_dump()
    response = JSONResponse(content=payload)
    _set_session_cookie(response, raw)
    return response


@router.post("/logout")
def auth_logout(request: Request, db: Session = Depends(get_db)) -> Response:
    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    raw = request.cookies.get(SESSION_COOKIE)
    if raw:
        th = sha256_hex(raw)
        row = db.scalar(select(UserSession).where(UserSession.token_hash == th))
        if row:
            db.delete(row)
            db.commit()
    _clear_session_cookie(response)
    return response


@router.get("/me", response_model=MeResponse)
def auth_me(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MeResponse:
    outlets_list: list[OutletMe] = []
    if user.role == UserRole.site_manager:
        q = (
            select(Outlet)
            .join(UserOutlet, UserOutlet.outlet_id == Outlet.id)
            .where(UserOutlet.user_id == user.id)
            .order_by(Outlet.sort_order, Outlet.id)
        )
        outlets_list = [OutletMe.model_validate(o) for o in db.scalars(q).all()]
    return MeResponse(
        id=user.id,
        login=user.login,
        display_name=user.display_name,
        role=user.role.value,
        outlets=outlets_list,
    )
