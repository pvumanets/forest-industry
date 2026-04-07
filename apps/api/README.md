# Grove Pulse API

FastAPI (Python 3.12), пакет `gp_api`. Точка входа ASGI: `gp_api.main:app`.

**Версия Python:** в репозитории целевая **3.12** (как в CI). Если в системе несколько версий (например 3.12 и 3.14), создавайте venv явно от 3.12: `py -3.12 -m venv .venv` (Windows) или `python3.12 -m venv .venv`.

## Локально без Docker

Из каталога `apps/api`:

```bash
python -m venv .venv
.venv\Scripts\activate   # Windows
# source .venv/bin/activate  # Linux/macOS
pip install -e ".[dev]"
```

Укажите в окружении `DATABASE_URL` и при необходимости `DATABASE_URL_SYNC` (см. корневой `.env.example`), затем:

```bash
alembic upgrade head
python -m gp_api.seed
```

Полная перезапись **только метрик** (отчётные недели, офлайн/сайт/Ozon/репутация), без удаления пользователей и точек:

```bash
python -m gp_api.seed --reset-metrics
```

Из **корня репозитория** при поднятом `docker compose` (сервис `api`):

```powershell
powershell -ExecutionPolicy Bypass -File scripts/refresh-dev-seed.ps1
```

Пароли сидов: переменные `SEED_PASSWORD_*` / `SEED_DEFAULT_PASSWORD`, либо для локальной разработки `ALLOW_INSECURE_SEED_DEFAULTS=1` (см. корневой README).

Запуск API:

```bash
uvicorn gp_api.main:app --reload --host 127.0.0.1 --port 8000
```

Проверка: `GET http://127.0.0.1:8000/api/health`.

### Аутентификация (фаза 3)

Ручная проверка (после миграций и сидов, пароли из сидов / `ALLOW_INSECURE_SEED_DEFAULTS`):

```http
POST http://127.0.0.1:8000/api/auth/login
Content-Type: application/json

{"login":"admin","password":"admin_password"}
```

Ответ **200** и заголовок `Set-Cookie: gp_session=...`. Далее:

```http
GET http://127.0.0.1:8000/api/auth/me
Cookie: gp_session=<значение из Set-Cookie>
```

Выход: `POST http://127.0.0.1:8000/api/auth/logout` с тем же cookie → **204**.

OpenAPI: `http://127.0.0.1:8000/api/openapi.json`. Переменные **`CORS_ORIGINS`**, **`ENVIRONMENT`**, **`COOKIE_SECURE`** — см. корневой `.env.example`.

### Справочники (фаза 4)

После входа (cookie):

- `GET /api/weeks/selectable` — до трёх последних **завершённых** отчётных недель (`week_start`, `label`); «сегодня» — календарная дата в **Asia/Yekaterinburg**.
- `GET /api/outlets` — физические точки без **OZON**; **owner/marketer** — все физические; **site_manager** — только из `user_outlets`.

### Ввод данных (фаза 5)

Параметр пути `week_start` — **понедельник** недели в формате `YYYY-MM-DD`. Доступны только недели из `GET /api/weeks/selectable` на «сегодня» (**Asia/Yekaterinburg**); иначе **404** `{"detail":"Неделя недоступна для ввода"}`. Если неделя в этом списке, но в БД ещё нет строки `reporting_weeks`, она **создаётся** при первом GET/PUT по этой неделе и **сразу фиксируется** (`commit`), чтобы последующие запросы и дашборды видели неделю. Не понедельник — **422** `{"detail":"Некорректная дата начала недели"}`. Без cookie — **401**.

**Офлайн** (`site_manager`, физическая точка из `user_outlets`, не OZON):

```http
GET /api/submissions/offline/2026-02-16/NOVOGRAD
PUT /api/submissions/offline/2026-02-16/NOVOGRAD
Content-Type: application/json

{"off_rev":12345.67,"off_ord":42,"off_ret_n":3,"off_ret_sum":150.0}
```

Пустой **GET** (нет строки в БД): числовые поля `null`. **403** — не `site_manager`, виртуальная точка, точка не из `user_outlets`, owner/marketer.

**Маркетинг** (`marketer`):

```http
GET /api/submissions/marketing/2026-02-16
PUT /api/submissions/marketing/2026-02-16
Content-Type: application/json
```

Тело **PUT** маркетинга — JSON **без** блока репутации: `week_start` (должен совпадать с путём), `advertising`, `web_channels`, `web_behavior`, `ozon` (как раньше). **403** для `owner` и `site_manager`.

**Репутация** (отдельно, тот же тег **`submissions`**):

```http
GET /api/submissions/reputation/2026-02-17
PUT /api/submissions/reputation
Content-Type: application/json
```

`GET` — снимок на **конкретную дату** `snapshot_date` (в пути `YYYY-MM-DD`): четыре ячейки или `null`, если записей на эту дату нет. Неделя, в календарный интервал пн–вс которой попадает дата, должна быть **доступна для ввода** (как у маркетинговых недель); иначе **404**.

`PUT` — тело `{ "snapshot_date": "YYYY-MM-DD", "cells": [ ... ] }` (ровно четыре ячейки NOVOGRAD/SVERDLOV × 2gis/yandex, `rating` 0–5, `review_cnt` ≥ 0). Неделя выводится из `snapshot_date`; перед вставкой удаляются снимки этих точек/площадок с датой в интервале **[понедельник; воскресенье]** той же недели, затем записываются четыре строки с указанной `snapshot_date`.

**GET** `/api/submissions/marketing/{week_start}` по-прежнему возвращает агрегированный блок `reputation` за неделю (последняя дата снимка в интервале недели), как для дашбордов.

OpenAPI-тег **`submissions`** для этих маршрутов.

### Дашборд и отчёты (фаза 6)

Только **owner** и **marketer**; **site_manager** — **403**. Периоды и «сегодня» — календарь **Asia/Yekaterinburg**.

**Сводка** (тег **`dashboard`**):

```http
GET /api/dashboard/summary?period=week&anchor=2026-02-23
GET /api/dashboard/summary?period=month&anchor=2026-01-15
GET /api/dashboard/summary?period=quarter&anchor=2026-02-10
```

`period`: `week` \| `month` \| `quarter`. Для **week** `anchor` — **понедельник**; иначе **422**. Якорь **позже «сегодня»** в Екатеринбурге — **422**.

**Ряды** (тег **`reports`**): `topic` = `site` \| `outlets` \| `company` \| `marketing` \| `maps-2gis` \| `maps-yandex` \| `ozon` \| `returns`. Опционально `outlet_code` (физическая точка; для `company` — офлайн одной точки). `site` отдаёт итого посетителей и три канала (`WEB-TRF-CH-organic` и т.д.).

```http
GET /api/reports/site/series?from=2026-01-05&to=2026-02-23
GET /api/reports/maps-2gis/series?from=2026-01-01&to=2026-01-31&outlet_code=NOVOGRAD
```

`from` ≤ `to`; иначе **422**. Без cookie — **401**.

## Docker Compose

Из корня репозитория (после `cp .env.example .env` и правок при необходимости):

```bash
docker compose up -d db
docker compose exec api alembic upgrade head
docker compose exec api python -m gp_api.seed
```

(или поднимите все сервисы и выполните команды в контейнере `api`.)

## Тесты и линт

Интеграционные тесты БД требуют PostgreSQL и переменных `DATABASE_URL` / `DATABASE_URL_SYNC` с драйвером **psycopg** (`postgresql+psycopg://...`). Без них соответствующие тесты пропускаются.

```bash
python -m pytest
python -m ruff check src tests
```

## Миграции

- `alembic upgrade head` — применить схему
- `alembic downgrade base` — откат (только dev, потеря данных)

Первая ревизия: `20260331_initial`.
