from __future__ import annotations

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

from gp_api.models.tables import User

_hasher = PasswordHasher()


def verify_user_password(user: User, plain_password: str) -> bool:
    try:
        _hasher.verify(user.password_hash, plain_password)
        return True
    except VerifyMismatchError:
        return False
