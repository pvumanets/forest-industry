from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


class LoginRequest(BaseModel):
    login: str = Field(default="")
    password: str = Field(default="")

    @field_validator("login")
    @classmethod
    def login_stripped(cls, v: str) -> str:
        s = v.strip()
        if not s:
            msg = "Введите логин"
            raise ValueError(msg)
        return s

    @field_validator("password")
    @classmethod
    def password_nonempty(cls, v: str) -> str:
        if not v:
            msg = "Введите пароль"
            raise ValueError(msg)
        return v


class UserPublic(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    login: str
    display_name: str
    role: str


class LoginResponse(BaseModel):
    user: UserPublic


class OutletMe(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    code: str
    display_name: str
    is_virtual: bool


class MeResponse(BaseModel):
    id: int
    login: str
    display_name: str
    role: str
    outlets: list[OutletMe]
