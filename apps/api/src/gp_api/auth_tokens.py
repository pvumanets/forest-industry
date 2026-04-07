from __future__ import annotations

import hashlib


def sha256_hex(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
