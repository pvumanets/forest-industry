"""Схемы ввода данных (фаза 5): офлайн и маркетинг."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, field_validator

REQUIRED_BLOCK = "Заполните все обязательные поля"


def _money(v: Any) -> Decimal:
    if v is None:
        raise ValueError(REQUIRED_BLOCK)
    return Decimal(str(v))


def _non_negative_int(name: str):
    def _v(v: Any) -> int:
        if v is None:
            raise ValueError(REQUIRED_BLOCK)
        if isinstance(v, bool):
            raise ValueError(f"{name} должно быть целым числом")
        i = int(v)
        if i < 0:
            raise ValueError(f"{name} не может быть отрицательным")
        return i

    return _v


class OfflinePutBody(BaseModel):
    model_config = ConfigDict(extra="forbid")

    off_rev: Decimal
    off_ord: int
    off_ret_n: int
    off_ret_sum: Decimal

    @field_validator("off_rev", "off_ret_sum", mode="before")
    @classmethod
    def _money_in(cls, v: Any) -> Decimal:
        return _money(v)

    @field_validator("off_rev", "off_ret_sum", mode="after")
    @classmethod
    def _money_q(cls, v: Decimal) -> Decimal:
        if v < 0:
            raise ValueError("Сумма не может быть отрицательной")
        return v.quantize(Decimal("0.01"))

    @field_validator("off_ord", "off_ret_n", mode="before")
    @classmethod
    def _int_in(cls, v: Any) -> int:
        if v is None:
            raise ValueError(REQUIRED_BLOCK)
        if isinstance(v, bool):
            raise ValueError("Значение должно быть целым числом")
        i = int(v)
        if i < 0:
            raise ValueError("Количество не может быть отрицательным")
        return i


class OfflineSubmissionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    week_start: date
    outlet_code: str
    off_rev: float | None = None
    off_ord: int | None = None
    off_ret_n: int | None = None
    off_ret_sum: float | None = None
    updated_at: datetime | None = None


WebChannelKey = Literal["organic", "cpc_direct", "direct"]
MapsPlatform = Literal["2gis", "yandex"]


class MarketingAdvertisingPut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    mkt_ad_ctx: Decimal
    mkt_ad_map: Decimal

    @field_validator("mkt_ad_ctx", "mkt_ad_map", mode="before")
    @classmethod
    def _in(cls, v: Any) -> Decimal:
        return _money(v)

    @field_validator("mkt_ad_ctx", "mkt_ad_map", mode="after")
    @classmethod
    def _q(cls, v: Decimal) -> Decimal:
        if v < 0:
            raise ValueError("Расход не может быть отрицательным")
        return v.quantize(Decimal("0.01"))


class MarketingWebChannelRowPut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    channel: WebChannelKey
    visitors: int

    @field_validator("visitors", mode="before")
    @classmethod
    def _v(cls, v: Any) -> int:
        return _non_negative_int("Число посетителей")(v)


class MarketingWebBehaviorPut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    web_beh_bounce: Decimal
    web_beh_time: Decimal

    @field_validator("web_beh_bounce", "web_beh_time", mode="before")
    @classmethod
    def _in(cls, v: Any) -> Decimal:
        return _money(v)

    @field_validator("web_beh_bounce", mode="after")
    @classmethod
    def _bounce(cls, v: Decimal) -> Decimal:
        if v < 0 or v > 100:
            raise ValueError("Отказы должны быть в диапазоне от 0 до 100%")
        return v.quantize(Decimal("0.01"))

    @field_validator("web_beh_time", mode="after")
    @classmethod
    def _time(cls, v: Decimal) -> Decimal:
        if v < 0:
            raise ValueError("Длительность визита не может быть отрицательной")
        return v.quantize(Decimal("0.01"))


class MarketingReputationCellPut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    outlet_code: Literal["NOVOGRAD", "SVERDLOV"]
    platform: MapsPlatform
    rating: Decimal
    review_cnt: int

    @field_validator("rating", mode="before")
    @classmethod
    def _rin(cls, v: Any) -> Decimal:
        return _money(v)

    @field_validator("rating", mode="after")
    @classmethod
    def _r(cls, v: Decimal) -> Decimal:
        if v < 0 or v > 5:
            raise ValueError("Оценка должна быть от 0 до 5")
        return v.quantize(Decimal("0.01"))

    @field_validator("review_cnt", mode="before")
    @classmethod
    def _cnt(cls, v: Any) -> int:
        return _non_negative_int("Количество отзывов")(v)


class MarketingReputationPut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    snapshot_date: date
    cells: list[MarketingReputationCellPut]

    @field_validator("cells", mode="after")
    @classmethod
    def _cells(cls, cells: list[MarketingReputationCellPut]) -> list[MarketingReputationCellPut]:
        expected = {
            ("NOVOGRAD", "2gis"),
            ("NOVOGRAD", "yandex"),
            ("SVERDLOV", "2gis"),
            ("SVERDLOV", "yandex"),
        }
        got = {(c.outlet_code, c.platform) for c in cells}
        if len(cells) != 4 or got != expected:
            raise ValueError(
                "В репутации должны быть ровно четыре ячейки: NOVOGRAD×2gis, NOVOGRAD×yandex, "
                "SVERDLOV×2gis, SVERDLOV×yandex (по одной каждой)",
            )
        return cells


class MarketingOzonPut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    oz_rev: Decimal
    oz_ord: int
    oz_ret_n: int
    oz_ret_sum: Decimal
    oz_ad_spend: Decimal

    @field_validator("oz_rev", "oz_ret_sum", "oz_ad_spend", mode="before")
    @classmethod
    def _m_in(cls, v: Any) -> Decimal:
        return _money(v)

    @field_validator("oz_rev", "oz_ret_sum", "oz_ad_spend", mode="after")
    @classmethod
    def _m_q(cls, v: Decimal) -> Decimal:
        if v < 0:
            raise ValueError("Показатель Ozon не может быть отрицательным")
        return v.quantize(Decimal("0.01"))

    @field_validator("oz_ord", "oz_ret_n", mode="before")
    @classmethod
    def _oi(cls, v: Any) -> int:
        return _non_negative_int("Показатель Ozon")(v)


class MarketingPutBody(BaseModel):
    """Маркетинг без репутации (репутация — отдельный PUT /submissions/reputation)."""

    model_config = ConfigDict(extra="forbid")

    week_start: date
    advertising: MarketingAdvertisingPut
    web_channels: list[MarketingWebChannelRowPut]
    web_behavior: MarketingWebBehaviorPut
    ozon: MarketingOzonPut

    @field_validator("web_channels", mode="after")
    @classmethod
    def _channels(
        cls,
        ch: list[MarketingWebChannelRowPut],
    ) -> list[MarketingWebChannelRowPut]:
        keys = {"organic", "cpc_direct", "direct"}
        got = {r.channel for r in ch}
        if len(ch) != 3 or got != keys:
            raise ValueError(
                "В блоке трафика должны быть ровно три канала: organic, cpc_direct, direct",
            )
        return ch


class ReputationSubmissionResponse(BaseModel):
    """Снимок репутации на конкретную дату (все четыре ячейки)."""

    snapshot_date: date
    cells: list[MarketingReputationCellOut]


class MarketingReputationCellOut(BaseModel):
    outlet_code: str
    platform: MapsPlatform
    rating: float | None = None
    review_cnt: int | None = None


class MarketingReputationOut(BaseModel):
    snapshot_date: date | None = None
    cells: list[MarketingReputationCellOut]


class MarketingSubmissionResponse(BaseModel):
    week_start: date
    advertising: dict[str, float | None]
    web_channels: list[dict[str, Any]]
    web_behavior: dict[str, float | None]
    reputation: MarketingReputationOut
    ozon: dict[str, Any]
    updated_at: datetime | None = None
