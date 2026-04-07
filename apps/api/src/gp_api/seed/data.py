"""Константы сидов: отчётные недели 2025–2026 и ряды метрик (детерминированно).

Генерация: `gp_api.seed.synthetic_series.build_metric_bundle()` — оборот 2025 70M ₽,
рост 2026 ×1.15, сезонность, Ozon с 04.08.2025, ноябрь 2025 ~300k ₽/мес на Ozon,
март 2026 Ozon 330k ₽ / 30 заказов / 6 возвратов; веб-якоря 2026-01-19 и 2026-03-16;
карты 2ГИС/Яндекс: сезонный прирост отзывов (зима медленнее), якорь 2026-04-07.
"""

from __future__ import annotations

from datetime import date
from decimal import Decimal

from gp_api.seed.synthetic_series import build_metric_bundle

_bundle = build_metric_bundle()

WEEK_STARTS: tuple[date, ...] = _bundle.week_starts
NOVOGRAD_OFFLINE_WEEKLY = _bundle.novograd_offline
SVERDLOV_OFFLINE_WEEKLY = _bundle.sverdlov_offline
MARKETING_SITE_WEEKLY = _bundle.marketing_site
WEB_VISITORS_WEEKLY = _bundle.web_visitors
OZON_WEEKLY = _bundle.ozon
REPUTATION_BY_WEEK = _bundle.reputation_by_week
REPUTATION_SNAPSHOT_DATES = _bundle.reputation_snapshot_dates

CHANNEL_KEYS = ("organic", "cpc_direct", "direct")

OUTLET_SEEDS = (
    ("NOVOGRAD", "Точка на Новоградском", False, 1),
    ("SVERDLOV", "Точка на Свердловском", False, 2),
    ("OZON", "Ozon", True, 3),
)

USER_SEEDS = (
    ("admin", "Администратор", "owner"),
    ("evgeniy", "Евгений", "owner"),
    ("pavel", "Павел", "owner"),
    ("marketing", "Николай", "marketer"),
    ("manager", "Управляющий точками", "site_manager"),
)


def channel_visitors(week_index: int, channel: str) -> int:
    row = WEB_VISITORS_WEEKLY[week_index]
    idx = {"organic": 0, "cpc_direct": 1, "direct": 2}[channel]
    return row[idx]


def reputation_pair(week_index: int) -> tuple[Decimal, int]:
    """Совместимость с тестами: одна пара (рейтинг, отзывы) для недели — по NOVOGRAD / 2gis."""
    return REPUTATION_BY_WEEK[week_index][("NOVOGRAD", "2gis")]
