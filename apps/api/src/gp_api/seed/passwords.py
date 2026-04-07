from __future__ import annotations

import os

# Черновые пароли из development-plan-v1.md §5 — только при ALLOW_INSECURE_SEED_DEFAULTS=1
_INSECURE_DEFAULTS: dict[str, str] = {
    "admin": "admin_password",
    "evgeniy": "ev_password",
    "pavel": "pav_password",
    "marketing": "marketing_password",
    "manager": "manager_password",
}

_ENV_PER_LOGIN: dict[str, str] = {
    "admin": "SEED_PASSWORD_ADMIN",
    "evgeniy": "SEED_PASSWORD_EVGENIY",
    "pavel": "SEED_PASSWORD_PAVEL",
    "marketing": "SEED_PASSWORD_MARKETING",
    "manager": "SEED_PASSWORD_MANAGER",
}


def password_for_login(login: str) -> str:
    env_name = _ENV_PER_LOGIN.get(login)
    if env_name and (value := os.environ.get(env_name)):
        return value
    if default := os.environ.get("SEED_DEFAULT_PASSWORD"):
        return default
    if os.environ.get("ALLOW_INSECURE_SEED_DEFAULTS") == "1":
        if login not in _INSECURE_DEFAULTS:
            msg = f"Нет небезопасного дефолта для логина {login!r}"
            raise RuntimeError(msg)
        return _INSECURE_DEFAULTS[login]
    msg = (
        "Задайте пароли сидов: переменные SEED_PASSWORD_* / SEED_DEFAULT_PASSWORD, "
        "или для локальной разработки ALLOW_INSECURE_SEED_DEFAULTS=1 (см. README)."
    )
    raise RuntimeError(msg)
