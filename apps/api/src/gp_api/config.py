from __future__ import annotations

import os
from functools import lru_cache


@lru_cache
def get_settings() -> Settings:
    return Settings.from_env()


class Settings:
    __slots__ = ("cors_origins_raw", "environment", "cookie_secure_flag")

    def __init__(
        self,
        cors_origins_raw: str,
        environment: str,
        cookie_secure_flag: str | None,
    ) -> None:
        self.cors_origins_raw = cors_origins_raw
        self.environment = environment
        self.cookie_secure_flag = cookie_secure_flag

    @classmethod
    def from_env(cls) -> Settings:
        return cls(
            cors_origins_raw=os.environ.get("CORS_ORIGINS", "http://localhost:5173"),
            environment=os.environ.get("ENVIRONMENT", "development"),
            cookie_secure_flag=os.environ.get("COOKIE_SECURE"),
        )

    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins_raw.split(",") if o.strip()]

    def cookie_secure(self) -> bool:
        if self.environment.strip().lower() == "production":
            return True
        if self.cookie_secure_flag is None:
            return False
        return self.cookie_secure_flag.strip().lower() in ("1", "true", "yes")
