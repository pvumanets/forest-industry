"""Синтетика 2025–2026: оборот, сезонность, якоря, Ozon с августа 2025.

Инварианты (float-слой до упаковки в заказы):
- sum(Ozon 2025) + sum(офлайн 2025) = TOTAL_2025
- sum(Ozon 2026) + sum(офлайн 2026) = TOTAL_2026 = TOTAL_2025 * GROWTH_YOY
- Март 2026 Ozon: 330_000 ₽ / 30 заказов / 6 возвратов на календарный месяц
- Карты: зимой прирост отзывов медленнее; снимок на 2026-04-07 — якорные значения (см. MAPS_*)
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal

RNG_SEED = 42

CHECK_NOVO = 6400.0
CHECK_SVER = 2800.0

TOTAL_2025 = 70_000_000.0
GROWTH_YOY = 1.15
TOTAL_2026 = TOTAL_2025 * GROWTH_YOY

OZON_START = date(2025, 8, 4)

WEB_ANCHOR_JAN_W3 = (56, 1047, 53)
WEB_ANCHOR_MAR_W3 = (85, 1022, 44)

OZON_MAR_2026_REV = 330_000.0
OZON_MAR_2026_ORD = 30
OZON_MAR_2026_RET_N = 6

# Репутация карт: якорь «на 7 апреля 2026» (дата снимка в БД — 2026-04-07, неделя с пн 2026-04-06)
ANCHOR_MAPS_WEEK_MONDAY = date(2026, 4, 6)
ANCHOR_MAPS_SNAPSHOT = date(2026, 4, 7)

RepKey = tuple[str, str]

MAPS_TARGETS: dict[RepKey, tuple[Decimal, int]] = {
    ("NOVOGRAD", "yandex"): (Decimal("5.0"), 68),
    ("NOVOGRAD", "2gis"): (Decimal("5.0"), 141),
    ("SVERDLOV", "yandex"): (Decimal("4.8"), 22),
    ("SVERDLOV", "2gis"): (Decimal("5.0"), 167),
}

MAPS_RATING_START: dict[RepKey, Decimal] = {
    ("NOVOGRAD", "yandex"): Decimal("4.52"),
    ("NOVOGRAD", "2gis"): Decimal("4.48"),
    ("SVERDLOV", "yandex"): Decimal("4.36"),
    ("SVERDLOV", "2gis"): Decimal("4.42"),
}

# Вес «скорости» новых отзывов по месяцу (ср. недели): зима низко, лето высоко
_MONTH_REVIEW_WEIGHT = [0.30, 0.28, 0.36, 0.54, 0.82, 0.98, 1.00, 0.96, 0.78, 0.58, 0.42, 0.32]


def _week_review_weight(week_start: date) -> float:
    mid = week_start + timedelta(days=3)
    return _MONTH_REVIEW_WEIGHT[mid.month - 1]


def _mondays_jan2025_dec2026() -> tuple[date, ...]:
    d = date(2025, 1, 6)
    out: list[date] = []
    while d <= date(2026, 12, 28):
        out.append(d)
        d += timedelta(days=7)
    return tuple(out)


def _season_offline(d: date) -> float:
    doy = float(d.timetuple().tm_yday)
    return 1.0 + 0.17 * math.sin(2.0 * math.pi * (doy - 105.0) / 365.25)


def _normalize_by_year(weeks: tuple[date, ...], raw: list[float]) -> None:
    for year in (2025, 2026):
        idx = [i for i, wd in enumerate(weeks) if wd.year == year]
        if not idx:
            continue
        s = sum(raw[i] for i in idx)
        m = s / len(idx)
        for i in idx:
            raw[i] /= m


def _ozon_shape(d: date, rnd: random.Random) -> float:
    if d < OZON_START:
        return 0.0
    days = (d - OZON_START).days
    w = days / 7.0
    asympt = 78_000.0
    base = asympt / (1.0 + math.exp(-0.11 * (w - 9.0)))
    if d.year == 2025 and d.month >= 11:
        base *= 1.12
    if d.year == 2025 and d.month == 12:
        base *= 1.05
    seas = 1.0 + 0.06 * math.sin(2.0 * math.pi * (d.timetuple().tm_yday - 40) / 365.25)
    return max(0.0, base * seas * (1.0 + rnd.uniform(-0.04, 0.04)))


def _distribute_monthly_total(
    n: int,
    total_rev: float,
    total_ord: int,
    total_ret: int,
    rnd: random.Random,
) -> tuple[list[float], list[int], list[int]]:
    weights = [1.0 + rnd.uniform(-0.06, 0.06) for _ in range(n)]
    ws = sum(weights)
    revs = [total_rev * w / ws for w in weights]
    ords_raw = [max(1, int(round(total_ord * w / ws))) for w in weights]
    diff = total_ord - sum(ords_raw)
    step = 1 if diff > 0 else -1
    for _ in range(abs(diff)):
        j = rnd.randrange(n)
        ords_raw[j] += step
        if ords_raw[j] < 1:
            ords_raw[j] = 1
    rets = [0] * n
    left = total_ret
    for i in range(n - 1):
        take = rnd.randint(0, min(3, left))
        rets[i] = take
        left -= take
    rets[n - 1] = max(0, left)
    return revs, ords_raw, rets


@dataclass(frozen=True)
class MetricBundle:
    week_starts: tuple[date, ...]
    novograd_offline: tuple[tuple[Decimal, int, int, Decimal], ...]
    sverdlov_offline: tuple[tuple[Decimal, int, int, Decimal], ...]
    marketing_site: tuple[tuple[Decimal, Decimal, Decimal, Decimal], ...]
    web_visitors: tuple[tuple[int, int, int], ...]
    ozon: tuple[tuple[Decimal, int, int, Decimal, Decimal], ...]
    reputation_by_week: tuple[dict[RepKey, tuple[Decimal, int]], ...]
    reputation_snapshot_dates: tuple[date, ...]


def _build_reputation_series(
    weeks: tuple[date, ...],
    anchor_i: int,
    rnd: random.Random,
) -> tuple[tuple[dict[RepKey, tuple[Decimal, int]], ...], tuple[date, ...]]:
    n = len(weeks)
    snapshot_dates = tuple(ANCHOR_MAPS_SNAPSHOT if w == ANCHOR_MAPS_WEEK_MONDAY else w for w in weeks)

    per_key_counts: dict[RepKey, list[int]] = {}
    for key, (_rt, target_c) in MAPS_TARGETS.items():
        start_c = max(2, min(target_c - 1, int(round(target_c * 0.20))))
        w_pre = [_week_review_weight(weeks[i]) for i in range(anchor_i + 1)]
        s_pre = sum(w_pre) or 1.0
        cum = 0.0
        cnt_pre: list[int] = []
        for i in range(anchor_i + 1):
            cum += w_pre[i]
            cnt_pre.append(int(round(start_c + (target_c - start_c) * (cum / s_pre))))
        for i in range(1, len(cnt_pre)):
            if cnt_pre[i] < cnt_pre[i - 1]:
                cnt_pre[i] = cnt_pre[i - 1]
        cnt_pre[-1] = target_c

        full_c = [0] * n
        for i in range(anchor_i + 1):
            full_c[i] = cnt_pre[i]
        if anchor_i > 0 and full_c[0] == 0:
            full_c[0] = start_c

        post_idx = list(range(anchor_i + 1, n))
        if post_idx:
            end_c = max(target_c + 1, int(round(target_c * 1.11)))
            w_post = [_week_review_weight(weeks[i]) for i in post_idx]
            s_post = sum(w_post) or 1.0
            cum_p = 0.0
            for j, i in enumerate(post_idx):
                cum_p += w_post[j]
                full_c[i] = int(round(target_c + (end_c - target_c) * (cum_p / s_post)))
            for j in range(1, len(post_idx)):
                a, b = post_idx[j - 1], post_idx[j]
                if full_c[b] < full_c[a]:
                    full_c[b] = full_c[a]
            full_c[post_idx[-1]] = max(full_c[post_idx[-1]], end_c)

        per_key_counts[key] = full_c

    per_key_rating: dict[RepKey, list[Decimal]] = {}
    for key, (target_r, _tc) in MAPS_TARGETS.items():
        r0 = MAPS_RATING_START[key]
        rs: list[Decimal] = []
        for i in range(n):
            if i <= anchor_i:
                t = i / max(1, anchor_i)
                noise = Decimal(str(round(rnd.uniform(-0.012, 0.012), 3)))
                rv = r0 + (target_r - r0) * Decimal(str(round(t, 5))) + noise
                rv = max(Decimal("4.05"), min(Decimal("5.0"), rv))
                rs.append(rv.quantize(Decimal("0.01")))
            else:
                noise = Decimal(str(round(rnd.uniform(-0.018, 0.018), 3)))
                rv = target_r + noise
                lo = max(Decimal("4.0"), target_r - Decimal("0.35"))
                rs.append(max(lo, min(Decimal("5.0"), rv)).quantize(Decimal("0.01")))
        rs[anchor_i] = target_r
        per_key_rating[key] = rs

    by_week: list[dict[RepKey, tuple[Decimal, int]]] = []
    for i in range(n):
        wk: dict[RepKey, tuple[Decimal, int]] = {}
        for key in MAPS_TARGETS:
            wk[key] = (per_key_rating[key][i], per_key_counts[key][i])
        by_week.append(wk)

    return tuple(by_week), snapshot_dates


def build_metric_bundle() -> MetricBundle:
    rnd = random.Random(RNG_SEED)
    weeks = _mondays_jan2025_dec2026()
    n = len(weeks)
    idx_2025 = [i for i, d in enumerate(weeks) if d.year == 2025]
    idx_2026 = [i for i, d in enumerate(weeks) if d.year == 2026]
    mar_idx = [i for i, d in enumerate(weeks) if d.year == 2026 and d.month == 3]
    mar_set = set(mar_idx)

    season = [_season_offline(d) for d in weeks]
    _normalize_by_year(weeks, season)

    w_oz = [_ozon_shape(d, rnd) for d in weeks]
    w25 = sum(w_oz[i] for i in idx_2025)
    nov25_idx = [i for i in idx_2025 if weeks[i].month == 11]
    nov25_shape = sum(w_oz[i] for i in nov25_idx)
    target_nov_month = 300_000.0
    oz_2025_total = target_nov_month * (w25 / nov25_shape) if nov25_shape > 0 else 1.54e6
    oz_2025_total = min(oz_2025_total, TOTAL_2025 * 0.045)
    oz_2025_total = max(oz_2025_total, 1.1e6)

    k25 = oz_2025_total / w25 if w25 > 0 else 0.0
    oz_rev = [0.0] * n
    for i in idx_2025:
        oz_rev[i] = w_oz[i] * k25

    sum_oz_25 = sum(oz_rev[i] for i in idx_2025)
    o26_target = sum_oz_25 * GROWTH_YOY
    w26 = sum(w_oz[i] for i in idx_2026)
    k26 = o26_target / w26 if w26 > 0 else 0.0
    for i in idx_2026:
        oz_rev[i] = w_oz[i] * k26

    revs_m, ords_m, rets_m = _distribute_monthly_total(
        len(mar_idx),
        OZON_MAR_2026_REV,
        OZON_MAR_2026_ORD,
        OZON_MAR_2026_RET_N,
        rnd,
    )
    post_mar = sum(revs_m)
    for j, i in enumerate(mar_idx):
        oz_rev[i] = revs_m[j]

    other_26 = [i for i in idx_2026 if i not in mar_set]
    s_other = sum(oz_rev[i] for i in other_26)
    need_oz_26 = o26_target
    need_other = need_oz_26 - post_mar
    if other_26 and s_other > 0:
        f = max(0.15, need_other / s_other)
        for i in other_26:
            oz_rev[i] *= f

    sum_oz_25 = sum(oz_rev[i] for i in idx_2025)
    sum_oz_26 = sum(oz_rev[i] for i in idx_2026)
    off_25_target = TOTAL_2025 - sum_oz_25
    off_26_target = TOTAL_2026 - sum_oz_26

    offline_pool = [0.0] * n
    share_nov = 0.525
    ssum25 = sum(season[i] for i in idx_2025)
    for i in idx_2025:
        offline_pool[i] = off_25_target * (season[i] / ssum25)
    ssum26 = sum(season[i] for i in idx_2026)
    for i in idx_2026:
        offline_pool[i] = off_26_target * (season[i] / ssum26)

    def pack_nov(rev_target: float) -> tuple[Decimal, int, int, Decimal]:
        on = max(1, int(round(rev_target / CHECK_NOVO)))
        rev = Decimal(str(round(on * CHECK_NOVO * (1.0 + rnd.uniform(-0.018, 0.018)), 2)))
        rn = max(4, int(round(on * rnd.uniform(0.058, 0.072))))
        rsum = Decimal(str(round(float(rev) * rnd.uniform(0.065, 0.088), 2)))
        return rev, on, rn, rsum

    def pack_sver(rev_target: float) -> tuple[Decimal, int, int, Decimal]:
        os_ = max(1, int(round(rev_target / CHECK_SVER)))
        rev = Decimal(str(round(os_ * CHECK_SVER * (1.0 + rnd.uniform(-0.018, 0.018)), 2)))
        sn = max(3, int(round(os_ * rnd.uniform(0.022, 0.032))))
        ssum = Decimal(str(round(float(rev) * rnd.uniform(0.028, 0.042), 2)))
        return rev, os_, sn, ssum

    nov_rows: list[tuple[Decimal, int, int, Decimal]] = []
    sver_rows: list[tuple[Decimal, int, int, Decimal]] = []
    for i in range(n):
        j_n = 1.0 + rnd.uniform(-0.02, 0.02)
        j_s = 2.0 - j_n
        nov_rows.append(pack_nov(offline_pool[i] * share_nov * j_n))
        sver_rows.append(pack_sver(offline_pool[i] * (1.0 - share_nov) * j_s))

    web: list[tuple[int, int, int]] = []
    for i, d in enumerate(weeks):
        if d == date(2026, 1, 19):
            web.append(WEB_ANCHOR_JAN_W3)
            continue
        if d == date(2026, 3, 16):
            web.append(WEB_ANCHOR_MAR_W3)
            continue
        yf = GROWTH_YOY if d.year == 2026 else 1.0 / GROWTH_YOY
        base = 1120.0 * yf
        seas_t = 1.0 + 0.12 * math.sin(2.0 * math.pi * (d.timetuple().tm_yday - 20) / 365.25)
        tot = base * seas_t * (1.0 + rnd.uniform(-0.05, 0.05))
        r_organic = 0.058 + rnd.uniform(-0.006, 0.006)
        r_cpc = 0.775 + rnd.uniform(-0.015, 0.015)
        r_dir = max(0.05, 1.0 - r_organic - r_cpc)
        o = max(25, int(round(tot * r_organic)))
        c = max(40, int(round(tot * r_cpc)))
        di = max(25, int(round(tot * r_dir)))
        sfix = o + c + di
        tgt = int(round(tot))
        if sfix != tgt:
            c += tgt - sfix
        web.append((o, max(40, c), di))

    mkt: list[tuple[Decimal, Decimal, Decimal, Decimal]] = []
    for i, d in enumerate(weeks):
        o, cpc, dr = web[i]
        spend = float(cpc) * 35.5 * (1.04 if d.year == 2026 else 1.0)
        spend *= 1.0 + 0.08 * math.sin(2.0 * math.pi * (d.timetuple().tm_yday - 50) / 365.25)
        spend *= 1.0 + rnd.uniform(-0.04, 0.04)
        ctx = Decimal(str(round(spend * 0.71, 2)))
        mmap = Decimal(str(round(spend * 0.29, 2)))
        bounce = Decimal(str(round(38.5 - (d.month % 6) * 0.32 + rnd.uniform(-0.7, 0.7), 2)))
        ttime = Decimal(str(round(128.0 + (o + cpc) * 0.017 + rnd.uniform(-3, 5), 2)))
        mkt.append((ctx, mmap, bounce, ttime))

    oz_rows: list[tuple[Decimal, int, int, Decimal, Decimal]] = []
    for i, d in enumerate(weeks):
        rev = oz_rev[i]
        if rev <= 0:
            oz_rows.append((Decimal("0"), 0, 0, Decimal("0"), Decimal("0")))
            continue
        if d.year == 2026 and d.month == 3 and i in mar_set:
            wi = mar_idx.index(i)
            nord = ords_m[wi]
            rnt = rets_m[wi]
            rev_d = Decimal(str(round(revs_m[wi], 2)))
        else:
            nord = max(1, int(round(rev / 10_200.0 + rnd.uniform(-0.8, 0.8))))
            rnt = max(0, int(round(nord * rnd.uniform(0.14, 0.22))))
            rev_d = Decimal(str(round(rev, 2)))
        rsum = Decimal(str(round(float(rev_d) * rnd.uniform(0.15, 0.21) * (rnt / max(1, nord)), 2)))
        ad_sp = Decimal(str(round(float(rev_d) * rnd.uniform(0.02, 0.09), 2)))
        oz_rows.append((rev_d, nord, rnt, rsum, ad_sp))

    anchor_i = weeks.index(ANCHOR_MAPS_WEEK_MONDAY)
    rep, reputation_snapshot_dates = _build_reputation_series(weeks, anchor_i, rnd)

    return MetricBundle(
        week_starts=weeks,
        novograd_offline=tuple(nov_rows),
        sverdlov_offline=tuple(sver_rows),
        marketing_site=tuple(mkt),
        web_visitors=tuple(web),
        ozon=tuple(oz_rows),
        reputation_by_week=rep,
        reputation_snapshot_dates=reputation_snapshot_dates,
    )
