# Поэтапный план разработки v1 — Grove Pulse

**Версия:** 1.0.8  
**Дата:** 2026-04-08  
**Назначение:** **10 фаз** с **подшагами** для поочерёдной реализации. Каждая фаза **прорабатывается** до уровня «агент может выполнить без додумывания», затем реализуется. **Спецификация всех 10 фаз** приведена к этому уровню (текущий статус: **детально готовы фазы 1–10**). Порядок реализации кода — по решению владельца; рекомендуется последовательность **1 → 10**.

**Связанные документы:** [`development-plan-v1.md`](./development-plan-v1.md), [`dev-handoff-spec.md`](./dev-handoff-spec.md), [`architecture-draft.md`](./architecture-draft.md), [`runbook.md`](./runbook.md).

**Статус проработки по фазам**

| Фаза | Проработка спецификации | Реализация кода |
|------|-------------------------|-----------------|
| 1 | **Готово** | **Выполнено** |
| 2 | **Готово** | **Выполнено** |
| 3 | **Готово** | **Выполнено** |
| 4 | **Готово** (§ ниже) | **Выполнено** |
| 5 | **Готово** (§ ниже) | **Выполнено** |
| 6 | **Готово** (§ ниже) | **Выполнено** |
| 7 | **Готово** (§ ниже) | **Выполнено** |
| 8 | **Готово** (§ ниже) | **Выполнено** |
| 9 | **Готово** (§ ниже) | **Выполнено** |
| 10 | **Готово** (§ ниже) | не начата |

**Как вести документ**

- После реализации фазы: статус **готово** + дата; подшаги `[x]`.
- **Обязательно синхронизировать три места:** (1) строка этой фазы в **сводной таблице** выше («Реализация кода»); (2) строка **`Статус реализации`** в § соответствующей фазы; (3) **чеклист приёмки** фазы — отметить выполненные пункты как `[x]`. Иначе статус в начале документа и в § расходятся.
- Для каждой новой проработки — блоки: границы, артефакты, критерии, риски, тесты выхода.

---

## Фаза 1 — Каркас монорепозитория и локальная инфраструктура

**Статус проработки:** готово к исполнению агентом (после команды владельца).  
**Статус реализации:** выполнено (Compose, `GET /api/health`, Vite-заглушка, pytest)

### Назначение

Поднять **PostgreSQL 15**, **FastAPI (Python 3.12)** с единственным публичным контрактом **health**, и **Vite + React + TypeScript** с одной страницей-заглушкой — так, чтобы разработчик на Windows/macOS/Linux повторил шаги из README и увидел рабочую связку. **Бизнес-логики, Alembic, авторизации, таблиц БД в этой фазе нет.**

### Границы фазы (явно вне scope)

- Миграции, модели SQLAlchemy, сиды, любые маршруты кроме **`GET /api/health`**.
- Tailwind, shadcn/ui, React Router, TanStack Query (подключаются с **фазы 7+**).
- nginx, prod-сборка, TLS.
- Подключение API к БД в коде **не обязательно** в фазе 1; достаточно, что контейнер PostgreSQL **healthy** в Compose.

### Входные условия

- Установлены **Docker Desktop** (или Docker Engine + Compose v2) и **Node.js 20+**, **pnpm** (`corepack enable` или `npm i -g pnpm`). В CI фронта — **Node 22** (`.github/workflows/ci.yml`).
- Репозиторий — корень проекта `forest-industry` (или фактическое имя; пути ниже относительно корня).

### Нормативная структура каталогов

Создать **точно** такую схему (имена папок фиксированы; внутри `api`/`web` допускается стандартное добавление файлов инструментов):

```text
.
├── apps/
│   ├── api/
│   │   ├── pyproject.toml          # Python 3.12, FastAPI, uvicorn
│   │   ├── README.md               # кратко: как запустить api без compose (опционально)
│   │   └── src/
│   │       └── gp_api/
│   │           ├── __init__.py
│   │           └── main.py         # FastAPI app, роут /api/health
│   └── web/
│       ├── package.json            # type: module, React 18+, TS, Vite
│       ├── pnpm-lock.yaml          # после pnpm install
│       ├── vite.config.ts
│       ├── tsconfig.json
│       ├── index.html
│       └── src/
│           ├── main.tsx
│           ├── App.tsx             # одна заглушка «Grove Pulse»
│           └── vite-env.d.ts
├── infra/                          # пустая заготовка или .gitkeep (nginx позже — фаза 10)
├── docker-compose.yml              # корень репозитория
├── .env.example                    # все ключи без секретных значений по умолчанию с пометкой change_me
├── .gitignore
└── README.md                       # обязательный «как запустить»
```

Пакет Python назвать **`gp_api`** (коротко, без конфликта с именем приложения на PyPI). Точка входа ASGI: **`gp_api.main:app`**.

### Docker Compose (норматив)

Файл **`docker-compose.yml`** в корне. Сервисы:

| Сервис | Образ / build | Назначение |
|--------|----------------|------------|
| `db` | `postgres:15-alpine` | БД; переменные `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` из env или `.env` |
| `api` | `build: ./apps/api` | FastAPI + uvicorn **с reload** для разработки |
| `web` | `build: ./apps/web` **или** образ Node + монтирование тома | Dev-сервер Vite на `0.0.0.0:5173` |

**Обязательные требования**

1. **`db`**: именованный volume для данных PostgreSQL; **`healthcheck`** через `pg_isready` (интервал и retries стандартные, чтобы `depends_on: condition: service_healthy` работал).
2. **`api`**: 
   - `depends_on: db: condition: service_healthy`;
   - проброс порта **`8000:8000`**;
   - переменная окружения **`DATABASE_URL`** (строка подключения к `db`) **прокидывается уже в фазе 1** для единообразия `.env.example`, даже если код в фазе 1 её не читает;
   - команда запуска: **`uvicorn gp_api.main:app --host 0.0.0.0 --port 8000 --reload`** с `WORKDIR` и `PYTHONPATH` так, чтобы модуль `gp_api` импортировался из `apps/api/src`.
3. **`web`**:
   - порт **`5173:5173`**;
   - в **`vite.config.ts`** настроить **`server.proxy`**: путь **`/api`** → **`http://api:8000`** (чтобы с браузера пользователя запросы шли на тот же origin `localhost:5173` и проксировались в API без CORS-танцев на фазе 1);
   - `server.host: true` (или `0.0.0.0`) для работы из контейнера.

**Dockerfile для `api`:** базовый образ `python:3.12-slim`; установка зависимостей из `pyproject.toml` (pip или uv — на выбор, зафиксировать один способ в README); копирование `apps/api`; CMD как выше.

**Dockerfile для `web`:** базовый образ `node:22-alpine` (или 20-alpine); `corepack enable && pnpm install`; `pnpm dev --host 0.0.0.0 --port 5173`; рабочая директория `apps/web`. Альтернатива без отдельного Dockerfile для web: в README описать запуск web **только на хосте** — **нежелательно**, цель фазы — **одна команда `docker compose up`** для трёх сервисов.

### Переменные окружения (`.env.example`)

Документировать **все** используемые в compose ключи (значения-заглушки допустимы, с комментарием `смените в .env`):

- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- `DATABASE_URL` — пример для SQLAlchemy/async:  
  `postgresql+asyncpg://USER:PASSWORD@db:5432/DBNAME` **или** синхронный вариант, если в фазе 2 выберете sync (на фазе 1 строка может не использоваться кодом).

В корневом **README** явно: скопировать `.env.example` → `.env`, при необходимости поменять пароль.

### API: контракт health

- **Метод и путь:** `GET /api/health`
- **Ответ:** HTTP **200**, `Content-Type: application/json`
- **Тело (стабильный контракт):**  
  `{"status": "ok", "service": "grove-pulse-api"}`  
  Дополнительные поля в фазе 1 **не добавлять** (чтобы не плодить дрейф контракта).
- **Корневой префикс:** вся будущая API будет под `/api` ([`dev-handoff-spec.md`](./dev-handoff-spec.md) §8); приложение FastAPI монтирует маршруты с префиксом `/api` **или** единый `APIRouter(prefix="/api")` с путём `/health` → итог **`/api/health`**.

### Фронтенд: заглушка

- Один экран: заголовок **«Grove Pulse»** и короткий подзаголовок вроде «Локальная среда разработки».
- **Без** Router, **без** запросов к API в фазе 1 (опционально для проверки прокси: мелкая кнопка «Проверить API», дергающая `fetch('/api/health')` — по желанию владельца; если добавляете — обработать JSON и показать `status`).
- Стиль: достаточно дефолтного Vite/React без обязательного Tailwind в фазе 1.

### `.gitignore` (минимум)

`__pycache__/`, `*.py[cod]`, `.venv/`, `venv/`, `.env`, `node_modules/`, `dist/`, `.pnpm-store/`, IDE-папки (`.idea/`, `.vscode/` опционально), `*.egg-info/`, `.pytest_cache/`, `htmlcov/`.

### Корневой README (обязательное содержание)

1. Требования: Docker, Node/pnpm (если web собирается локально без compose — не при фазе 1 по нормативу выше).
2. Шаги: `cp .env.example .env` → `docker compose up --build`.
3. URL: фронт **http://localhost:5173**, API напрямую **http://localhost:8000/api/health**.
4. Как остановить: `docker compose down` (и при желании `down -v` для сброса БД — с предупреждением).
5. Ссылка на [`docs/development docs/development-phases-v1.md`](./development-phases-v1.md) и на корневой [`AGENTS.md`](../../AGENTS.md).

### Автотесты (минимум на фазу 1)

- В **`apps/api`**: один тест **`TestClient`** FastAPI — `GET /api/health` → **200**, тело содержит `"status":"ok"`.
- Инструмент: **pytest**, зависимость `httpx` для Starlette client при необходимости.
- Команда в README или в `pyproject.toml` scripts: `pytest` из каталога `apps/api`.

### CI (опционально, но рекомендуется)

Файл **`.github/workflows/ci.yml`** (или аналог): на `push` — job **api**: установка Python 3.12, `pip install .[dev]`, `ruff check` (если добавлен `ruff`) + `pytest`; job **web**: `pnpm install --frozen-lockfile`, `pnpm build` (production build Vite должен проходить даже если локально вы dev-only — добавьте скрипт `build` в `package.json`). Если CI не вводите в фазе 1 — явная строка в README «CI будет в фазе X».

### Риски и заметки агенту

- **Windows:** пути в volume-монтах для hot-reload иногда капризны; при сбое — описать в README fallback «только Linux/macOS» или запуск api/web на хосте.
- **Порты:** 5432 наружу **не** обязательно публиковать; достаточно внутренней сети compose.
- Не коммитить файл **`.env`**.

### Чеклист приёмки фазы 1 (агент сдаёт владельцу)

- [x] `docker compose up --build` без ошибок; контейнер `db` **healthy**.
- [x] `curl -s http://localhost:8000/api/health` возвращает JSON с `"status":"ok"`.
- [x] В браузере открывается `http://localhost:5173`, видна заглушка **Grove Pulse**.
- [x] `pytest` в `apps/api` проходит.
- [x] `.env` отсутствует в git; `.env.example` присутствует.
- [x] Корневой README содержит полные шаги запуска.

### Исходные подшаги (сводка для Issues)

1. Создать дерево `apps/api`, `apps/web`, `infra`, корневые файлы.
2. Реализовать `pyproject.toml`, `gp_api.main`, Dockerfile api, health.
3. Реализовать Vite React TS, Dockerfile web, proxy `/api` → api.
4. Собрать `docker-compose.yml`, `.env.example`, `.gitignore`.
5. Добавить pytest + README + опционально CI.
6. Прогон чеклиста приёмки; сообщить владельцу результаты команд.

---

## Фаза 2 — Схема БД, миграции, сиды

**Статус проработки спецификации:** готово к исполнению агентом (после команды владельца).  
**Статус реализации:** выполнено (Alembic `20260331_initial`, модели SQLAlchemy, сиды `gp_api.seed`, тесты `test_phase2_db`)

### Назначение

Зафиксировать **полную схему v1** в PostgreSQL через **Alembic** + **SQLAlchemy 2.x**, загрузить **сиды**: справочник точек (включая виртуальный **OZON**), пользователи по [`development-plan-v1.md`](./development-plan-v1.md) §5, **ровно 8 отчётных недель** (понедельники) с синтетическими метриками для будущих дашбордов и тестов **%** / «рост с нуля». **HTTP-эндпоинты бизнес-логики в этой фазе не добавлять** (кроме уже существующего `GET /api/health` из фазы 1).

### Входные условия

- **Фаза 1** выполнена: Compose, API, web, `DATABASE_URL` в `.env`.
- Зависимости API: **SQLAlchemy 2.x**, **Alembic**, драйвер **`asyncpg`** (async) или **`psycopg`** (sync) — **один** стек на весь проект; для Alembic `env.py` чаще используют **синхронный** URL `postgresql://...` (отдельная переменная `DATABASE_URL_SYNC` допустима, если основной async).

### Границы фазы (явно вне scope)

- Маршруты login / submissions / dashboard (фазы 3–6).
- **JWT**; только таблица `user_sessions` под будущую фазу 3.
- UI-изменения.

### Норматив: перечень таблиц и связей

Источник полей — [`dev-handoff-spec.md`](./dev-handoff-spec.md) §7. Имена таблиц **snake_plural** как ниже (можно `weekly_offline_metric` vs `weekly_offline_metrics` — зафиксировать **множественное** имя).

| Таблица | Назначение |
|---------|------------|
| `users` | Учётные записи |
| `user_sessions` | Сессии (заполняется с фазы 3) |
| `outlets` | Точки + виртуальный Ozon |
| `user_outlets` | M:N руководитель ↔ **только физические** точки |
| `reporting_weeks` | Отчётная неделя по дате пн |
| `weekly_offline_metrics` | OFF-* по неделе и **физической** точке |
| `weekly_marketing_site` | Реклама + поведение сайта по неделе (компания) |
| `weekly_web_channels` | Три канала посетителей по неделе |
| `weekly_ozon` | OZ-* по неделе и **outlet_id = OZON** |
| `reputation_snapshots` | REP-* снимки по точке×площадка×дата |

### DDL-уровень (колонки, типы, ограничения)

Общие правила: **`id`** где BIGSERIAL PRIMARY KEY; **`created_at` / `updated_at`** типа `TIMESTAMPTZ`, default `now()` где уместно; **FK** `ON DELETE` — для метрик по неделе: **`ON DELETE CASCADE`** от `reporting_weeks`; пользователи: **`RESTRICT`** или **`SET NULL`** для `updated_by` — для v1 **`ON DELETE SET NULL`** на audit user id.

#### Перечисления PostgreSQL

1. **`user_role`:** `'owner'`, `'marketer'`, `'site_manager'` ([`dev-handoff-spec.md`](./dev-handoff-spec.md) §3).
2. **`maps_platform`:** `'2gis'`, `'yandex'` — репутация 2ГИС / Яндекс.Карты.

#### Таблица `users`

| Колонка | Тип | Ограничения |
|---------|-----|-------------|
| `id` | BIGSERIAL | PK |
| `login` | VARCHAR(64) | UNIQUE NOT NULL |
| `password_hash` | TEXT | NOT NULL |
| `display_name` | VARCHAR(255) | NOT NULL |
| `role` | `user_role` | NOT NULL |
| `is_active` | BOOLEAN | NOT NULL DEFAULT true |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() |

#### Таблица `user_sessions`

| Колонка | Тип | Ограничения |
|---------|-----|-------------|
| `id` | UUID | PK, default `gen_random_uuid()` |
| `user_id` | BIGINT | FK → `users(id)` ON DELETE CASCADE |
| `token_hash` | CHAR(64) | UNIQUE NOT NULL (hex SHA-256) |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() |
| `expires_at` | TIMESTAMPTZ | NOT NULL |
| `last_seen_at` | TIMESTAMPTZ | NOT NULL |
| `user_agent` | TEXT | NULL |
| `ip` | VARCHAR(45) | NULL (IPv6) |

Индекс: `(user_id)` для выборки сессий пользователя.

#### Таблица `outlets`

| Колонка | Тип | Ограничения |
|---------|-----|-------------|
| `id` | BIGSERIAL | PK |
| `code` | VARCHAR(32) | UNIQUE NOT NULL |
| `display_name` | VARCHAR(255) | NOT NULL |
| `is_virtual` | BOOLEAN | NOT NULL DEFAULT false |
| `sort_order` | INT | NOT NULL DEFAULT 0 |

Сид-строки (норматив):

| code | display_name | is_virtual | sort_order |
|------|--------------|------------|------------|
| NOVOGRAD | Точка на Новоградском | false | 1 |
| SVERDLOV | Точка на Свердловском | false | 2 |
| OZON | Ozon | true | 3 |

#### Таблица `user_outlets`

| Колонка | Тип | Ограничения |
|---------|-----|-------------|
| `user_id` | BIGINT | PK (composite), FK → users |
| `outlet_id` | BIGINT | PK (composite), FK → outlets |

Для **`manager`**: две строки — только **физические** `NOVOGRAD` и `SVERDLOV` (не **OZON**).

#### Таблица `reporting_weeks`

| Колонка | Тип | Ограничения |
|---------|-----|-------------|
| `id` | BIGSERIAL | PK |
| `week_start_date` | DATE | UNIQUE NOT NULL |

**CHECK:** день недели — **понедельник**. В PostgreSQL:  
`EXTRACT(ISODOW FROM week_start_date) = 1`  
(ISODOW: 1 = Monday).

#### Таблица `weekly_offline_metrics`

| Колонка | Тип | Ограничения |
|---------|-----|-------------|
| `id` | BIGSERIAL | PK |
| `week_id` | BIGINT | FK → reporting_weeks, NOT NULL |
| `outlet_id` | BIGINT | FK → outlets, NOT NULL |
| `off_rev` | NUMERIC(14,2) | NOT NULL |
| `off_ord` | INT | NOT NULL |
| `off_ret_n` | INT | NOT NULL |
| `off_ret_sum` | NUMERIC(14,2) | NOT NULL |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() |
| `updated_by_user_id` | BIGINT | FK → users, NULL |

**UNIQUE(`week_id`, `outlet_id`)**.  
В сидах **не** вставлять строки для `outlet` = OZON (только физические точки).

#### Таблица `weekly_marketing_site`

| Колонка | Тип | Ограничения |
|---------|-----|-------------|
| `id` | BIGSERIAL | PK |
| `week_id` | BIGINT | FK → reporting_weeks, UNIQUE NOT NULL |
| `mkt_ad_ctx` | NUMERIC(14,2) | NOT NULL |
| `mkt_ad_map` | NUMERIC(14,2) | NOT NULL |
| `web_beh_bounce` | NUMERIC(5,2) | NOT NULL (0–100) |
| `web_beh_time` | NUMERIC(10,2) | NOT NULL (секунды) |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() |
| `updated_by_user_id` | BIGINT | FK → users, NULL |

#### Таблица `weekly_web_channels`

| Колонка | Тип | Ограничения |
|---------|-----|-------------|
| `id` | BIGSERIAL | PK |
| `week_id` | BIGINT | FK → reporting_weeks, NOT NULL |
| `channel_key` | VARCHAR(32) | NOT NULL |
| `visitors` | INT | NOT NULL |

**UNIQUE(`week_id`, `channel_key`)**.  
**CHECK:** `channel_key IN ('organic', 'cpc_direct', 'direct')` ([`dev-handoff-spec.md`](./dev-handoff-spec.md) §5.3).

#### Таблица `weekly_ozon`

| Колонка | Тип | Ограничения |
|---------|-----|-------------|
| `id` | BIGSERIAL | PK |
| `week_id` | BIGINT | FK → reporting_weeks, NOT NULL |
| `outlet_id` | BIGINT | FK → outlets, NOT NULL |
| `oz_rev` | NUMERIC(14,2) | NOT NULL |
| `oz_ord` | INT | NOT NULL |
| `oz_ret_n` | INT | NOT NULL |
| `oz_ret_sum` | NUMERIC(14,2) | NOT NULL |
| `oz_ad_spend` | NUMERIC(14,2) | NOT NULL |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() |
| `updated_by_user_id` | BIGINT | FK → users, NULL |

**UNIQUE(`week_id`, `outlet_id`)**. В сидах **`outlet_id`** всегда id строки **`OZON`**.

#### Таблица `reputation_snapshots`

| Колонка | Тип | Ограничения |
|---------|-----|-------------|
| `id` | BIGSERIAL | PK |
| `outlet_id` | BIGINT | FK → outlets, NOT NULL — **только физические** точки в данных |
| `platform` | `maps_platform` | NOT NULL |
| `snapshot_date` | DATE | NOT NULL |
| `rating` | NUMERIC(3,2) | NOT NULL |
| `review_cnt` | INT | NOT NULL |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() |
| `created_by_user_id` | BIGINT | FK → users, NULL |

**UNIQUE(`outlet_id`, `platform`, `snapshot_date`)** — одна запись на пару точка×площадка×дата (упрощение v1).  
Индекс для отчётов: **`(outlet_id, platform, snapshot_date)`** (если не покрывается UNIQUE).

### Alembic (норматив)

- Расположение: `apps/api/alembic.ini`, `apps/api/alembic/env.py`, `apps/api/alembic/versions/`.
- **`script_location`:** относительно `apps/api`.
- Одна **первая ревизия** с осмысленным id, например **`YYYYMMDD_initial_schema`**, создаёт **все** объекты схемы (enum, таблицы, индексы, FK, CHECK). Последующие фазы добавляют новые ревизии.
- Команды (документировать в корневом README и в `apps/api/README`):
  - `alembic upgrade head`
  - `alembic downgrade base` (только dev; осторожно с потерей данных)
- `env.py` читает URL из переменной окружения; для async-приложения допускается **`DATABASE_URL_SYNC`** для миграций.

### SQLAlchemy-модели

- Расположение: `apps/api/src/gp_api/models/` (или `db/models/`) — **один модуль на таблицу** или единый `models.py` на v1; типы **`Mapped[]`**, **`mapped_column`**.
- **`metadata`** одна для `target_metadata` в Alembic при autogenerate; для фазы 2 допустимо **ручное** написание миграции 1:1 с этой спецификацией (autogenerate как вспомогательный шаг).

### Сиды: порядок выполнения

1. **Outlets** (UPSERT или delete+insert только в dev — зафиксировать в коде «seed только для development»).
2. **Users** с **Argon2id** или **bcrypt** хэшами паролей.
3. **user_outlets** для `login = manager`.
4. **reporting_weeks** — 8 недель.
5. **weekly_offline_metrics** — по 2 строки на неделю (NOVOGRAD, SVERDLOV).
6. **weekly_marketing_site** — 8 строк.
7. **weekly_web_channels** — 8×3 строки.
8. **weekly_ozon** — 8 строк (outlet OZON).
9. **reputation_snapshots** — на каждую неделю **4** строки (2 точки × 2 платформы), одна **`snapshot_date`** на неделю (например понедельник недели или +0 дней).

**Пароли:** не хардкодить в репозитории при публичном git. Норматив: читать из **env** `SEED_PASSWORD_ADMIN`, `SEED_PASSWORD_EVGENIY`, … или одна переменная `SEED_DEFAULT_PASSWORD` для dev; fallback на значения из [`development-plan-v1.md`](./development-plan-v1.md) §5 **только если** установлен флаг `ALLOW_INSECURE_SEED_DEFAULTS=1` (в README предупредить).

**Пользователи (display_name произвольно разумное):**

| login | role | display_name (пример) |
|-------|------|------------------------|
| admin | owner | Администратор |
| evgeniy | owner | Евгений |
| pavel | owner | Павел |
| marketing | marketer | Николай |
| manager | site_manager | Управляющий точками |

### Синтетические 8 недель (норматив для воспроизводимости)

- Зафиксировать **8 последовательных понедельников** в прошлом относительно фиксированной «эпохи» для тестов, например: **`2026-01-05`, `2026-01-12`, …, `2026-02-23`** (8 штук). Любой другой непрерывный блок из 8 пн допустим, но **закрепить в коде сида константой** и **упомянуть в README**, чтобы тесты не плавали.
- **Тренды:** монотонное лёгкое увеличение выручки/заказов по неделям для большинства рядов.
- **«Рост с нуля» (для будущих тестов UI):** на **первой** неделе для **одной** метрики (например `off_rev` точки NOVOGRAD) поставить **0**, на **второй** — **> 0**; аналогично можно один раз обнулить пару для Ozon или посетителей канала (опционально одна ячейка).
- Числа **реалистичные по порядку величины** (выручка тысячи–сотни тысяч руб., отзывы десятки, рейтинг 4.2–4.8).

### Команда запуска сидов

- CLI: **`python -m gp_api.seed`** или **`gp-seed`** entry point в `pyproject.toml`.
- В Docker: после `alembic upgrade head` в entrypoint **не** обязательно автосид — лучше явная команда в README:  
  `docker compose exec api python -m gp_api.seed`

### Тесты (обязательный минимум фазы 2)

1. **Миграция:** на чистой БД (test database URL) — `upgrade head` проходит; опционально `downgrade base` + снова `upgrade` (если одна ревизия).
2. **Сид:** после seed — `SELECT count(*) FROM reporting_weeks` = **8**; offline metrics = **16**; web_channels = **24**; ozon = **8**; reputation ≥ **32** (8×4).
3. **Идемпотентность:** повторный запуск сида **не** дублирует уникальные строки (UPSERT или проверка «уже засеяно»).

Инструмент: **pytest** + фикстура БД (можно SQLite in-memory **только** если модели совместимы; для Postgres-специфичных enum предпочтительно **testcontainers** или отдельный сервис `db` в CI).

### Чеклист приёмки фазы 2

- [x] `alembic upgrade head` на пустой БД успешен.
- [x] Все enum и CHECK из спецификации созданы.
- [x] Сид выполняется без ошибки; повторный запуск не ломает уникальности.
- [x] `pytest` для миграции/сида зелёный.
- [x] README обновлён: миграции, сид, переменные для паролей сидов.
- [x] Нет сырого пароля в коде при `ALLOW_INSECURE_SEED_DEFAULTS` выключенном по умолчанию.

### Исходные подшаги (сводка для Issues)

1. Зависимости SQLAlchemy, Alembic, драйвер БД; модели и enums.
2. Ревизия Alembic `initial_schema`.
3. Модуль сида + env для паролей.
4. Синтетические 8 недель + сценарий «0 → положительное».
5. Тесты + документация.
6. Прогон чеклиста; отчёт владельцу.

---

## Фаза 3 — Аутентификация и сессии (API)

**Статус проработки спецификации:** готово к исполнению агентом (после команды владельца).  
**Статус реализации:** выполнено (`gp_api.routers.auth`, cookie `gp_session`, `get_current_user`, тесты `test_phase3_auth`)

### Назначение

Реализовать **три эндпоинта** аутентификации по [`dev-handoff-spec.md`](./dev-handoff-spec.md) §8–9: вход с **opaque cookie-сессией** (данные сессии в PostgreSQL), выход, профиль текущего пользователя. **JWT не использовать.** Заложить **зависимость FastAPI** «текущий пользователь» для **будущих** защищённых маршрутов (фазы 4+). **Новых таблиц не добавлять** — использовать `users` и `user_sessions` из фазы 2.

### Входные условия

- Фазы **1–2** выполнены: миграции, сиды пользователей с **корректными хэшами** паролей (Argon2id или bcrypt — тот же алгоритм, что применяется при проверке в этой фазе).

### Границы фазы (явно вне scope)

- Эндпоинты `/api/weeks/*`, `/api/outlets`, submissions, dashboard (фазы 4–6).
- Страница логина на фронте (фаза 7) — в фазе 3 достаточно **API + тестов**; опционально ручная проверка через curl/Thunder Client.
- Сброс пароля, rate limiting, CAPTCHA, аудит логинов.
- **HTTPS** на localhost — не требуется; флаг **Secure** на cookie управляется env (см. ниже).

### Норматив: имена и сроки

| Параметр | Значение |
|----------|----------|
| Имя cookie | **`gp_session`** |
| Сырой токен в cookie | **≥ 32 байта энтропии**, например `secrets.token_urlsafe(32)` (строка ~43 символа) |
| Хэш в БД | **SHA-256** от **сырого** значения cookie, в виде **строчных hex 64 символа** (колонка уже `CHAR(64)` из фазы 2) |
| Срок жизни сессии | **14 суток** с момента **последней успешной** валидации (**sliding**) |
| Атрибуты cookie | **`HttpOnly`**, **`SameSite=Lax`**, **`Path=/`** |
| **`Secure`** | **`true`**, если `ENVIRONMENT=production` **или** `COOKIE_SECURE=true`; иначе **`false`** (dev / localhost по [`dev-handoff-spec.md`](./dev-handoff-spec.md) NFR-07) |

**Sliding (обязательно):** при каждом успешном запросе, где сессия признана валидной (в т.ч. **`GET /api/auth/me`** и любой будущий защищённый маршрут), обновить в БД:

- `last_seen_at = now()` (UTC),
- `expires_at = now() + 14 days` (UTC).

Опционально повторно отдать **`Set-Cookie`** с тем же именем и обновлённым **`Max-Age=1209600`** (14×24×3600), чтобы браузер и сервер были согласованы; если не отдаёте — полагаться только на серверный `expires_at` при разборе cookie (предпочтительно **всегда** проверять **`expires_at` в БД** как источник правды).

**Просроченная сессия:** если `now() > expires_at` — считать сессию недействительной, отвечать **401**, строку сессии **удалить** (опционально, для гигиены).

### Алгоритм паролей

- Проверка: **Argon2id** (предпочтительно, `argon2-cffi` или `passlib[argon2]`) **или** **bcrypt** (`passlib[bcrypt]`).
- Хэши в сиде фазы 2 должны быть сгенерированы **тем же** алгоритмом.
- Пароли **не** логировать; в ответах об ошибке **не** указывать «пользователь не найден» vs «неверный пароль» раздельно — одно сообщение (**см. ошибки**).
- При **bcrypt** длина пароля ограничена **72 байтами** UTF-8; политика v1 (≥10 символов) укладывается. **Argon2id** предпочтителен при новых проектах.

### CORS

- Подключить **`CORSMiddleware`** (или эквивалент Starlette).
- **`allow_credentials=True`**.
- **`allow_origins`:** список из переменной **`CORS_ORIGINS`** (через запятую), например `http://localhost:5173`. Для prod — фактический origin фронта ([`dev-handoff-spec.md`](./dev-handoff-spec.md) §9).
- Методы: как минимум **GET, POST, OPTIONS**; заголовки — достаточно дефолта + **`Authorization`** не обязателен (cookie).

---

### `POST /api/auth/login`

**Назначение:** проверить логин/пароль, создать строку в **`user_sessions`**, установить cookie.

**Заголовки:** `Content-Type: application/json`

**Тело запроса (JSON):**

```json
{
  "login": "string",
  "password": "string"
}
```

**Валидация входа (422):**

- `login` после `strip` не пустой.
- `password` не пустой.

Сообщения тел на **русском** ([`ui-copy-guidelines.md`](../product%20docs/ui-copy-guidelines.md)): например «Введите логин», «Введите пароль».

**Логика (401):**

- Пользователь с таким `login` не найден **или** `is_active = false` **или** пароль не совпадает с хэшем → **HTTP 401**, тело:  
  `{"detail": "Неверный логин или пароль"}`  
  (единый текст для всех случаев, без утечки существования логина).

**Успех (200):**

- Создать запись **`user_sessions`**: `token_hash`, `expires_at`, `last_seen_at`, опционально `user_agent`, `ip` из запроса.
- Заголовок ответа **`Set-Cookie`:**  
  `gp_session=<сырой_токен>; Path=/; HttpOnly; SameSite=Lax; Max-Age=1209600`  
  + при **`Secure`:** добавить `; Secure`.
- **Тело ответа:** **не** содержать токена сессии и не содержать `password_hash`. Допускается передать публичные поля пользователя (это **не** JWT):

```json
{
  "user": {
    "id": 1,
    "login": "marketing",
    "display_name": "Николай",
    "role": "marketer"
  }
}
```

Поле **`outlets`** в ответе login **не обязательно** (фронт возьмёт из **`/api/auth/me`**); допустимо дублировать как в `/me` для удобства — тогда единая схема DTO.

---

### `POST /api/auth/logout`

**Назначение:** удалить сессию по cookie и сбросить cookie в браузере.

**Cookie:** если **`gp_session`** отсутствует или токен не найден в БД — всё равно ответить **204** и при возможности отдать **`Set-Cookie`** с очисткой `gp_session` (**`Max-Age=0`**, те же `Path`, `HttpOnly`, `SameSite`).

**Если сессия найдена:** удалить строку из **`user_sessions`**, затем то же **204** + очистка cookie.

**Тело ответа:** пустое.

---

### `GET /api/auth/me`

**Назначение:** вернуть текущего пользователя по валидной сессии; обновить **sliding**.

**Cookie:** обязателен валидный **`gp_session`**.

**401:** нет cookie / неверный токен / сессия не найдена / просрочена / пользователь `is_active=false` —  
`{"detail": "Требуется вход"}` или согласованное короткое сообщение на русском.

**200 — тело (нормативная схема):**

```json
{
  "id": 1,
  "login": "manager",
  "display_name": "Управляющий точками",
  "role": "site_manager",
  "outlets": [
    {
      "id": 10,
      "code": "NOVOGRAD",
      "display_name": "Точка на Новоградском",
      "is_virtual": false
    },
    {
      "id": 11,
      "code": "SVERDLOV",
      "display_name": "Точка на Свердловском",
      "is_virtual": false
    }
  ]
}
```

- Для ролей **`owner`** и **`marketer`:** массив **`outlets` — пустой `[]`** (ключ **обязателен** для единообразия фронта).
- В **`outlets`** для `site_manager` перечислять **только** строки из **`user_outlets`** с join к **`outlets`**; **не** включать **OZON**, если у пользователя нет связи (у `manager` в сиде — только две физические точки).

**После успешной валидации:** выполнить обновление **`last_seen_at`** и **`expires_at`** (sliding).

---

### Разбор сессии (внутренняя функция / dependency)

1. Прочитать cookie **`gp_session`**; если нет — `None`.
2. Вычислить **`sha256(cookie_value).hexdigest()`**, найти строку в **`user_sessions`** по **`token_hash`**.
3. Если не найдено или **`now() > expires_at`** — невалидно.
4. Загрузить **`users`**; если **`is_active`** ложно — невалидно.
5. Вернуть объект пользователя (+ при необходимости объект сессии для обновления sliding).

**Зависимость FastAPI (норматив):**

- **`get_current_user`** — обязательный пользователь; при невалидной сессии **HTTPException 401**.
- **`get_current_user_optional`** — для маршрутов, где допустим гость (в фазе 3 может не использоваться).

Документировать в коде, что **все** защищённые маршруты фаз 4+ используют **`get_current_user`**.

---

### Единый формат ошибок

| Код | Когда | Тело (пример) |
|-----|--------|----------------|
| **401** | Неавторизован / неверный логин-пароль / просроченная сессия | `{"detail": "<короткий текст на русском>"}` |
| **422** | Ошибка валидации Pydantic (логин/пароль пустые) | формат FastAPI по умолчанию или унифицировать под `detail` |

**403** в фазе 3 не обязателен; появится в фазах с проверкой ролей.

---

### OpenAPI

- Тег **`auth`** для трёх маршрутов.
- Схемы запросов/ответов описать явно (Pydantic models).
- Документ по умолчанию: **`/api/openapi.json`** ([`dev-handoff-spec.md`](./dev-handoff-spec.md) §8).

---

### Тесты (обязательный минимум фазы 3)

Инструмент: **pytest** + **`httpx.AsyncClient`** или **`TestClient`** с **`app`**, БД — тестовая PostgreSQL (как в фазе 2) или общая стратегия проекта.

1. **Login OK:** `POST /api/auth/login` с валидным сид-пользователем → **200**, заголовок **`Set-Cookie`** содержит **`gp_session=`**, в БД одна новая строка **`user_sessions`** с корректным **`token_hash`**.
2. **Login fail:** неверный пароль → **401**, **`detail`** на русском, **нет** `Set-Cookie` с новой сессией (или сессия не создаётся).
3. **Me OK:** после login передать **`Cookie`** заголовок → **`GET /api/auth/me`** → **200**, структура как выше; для **`manager`** ровно **2** outlet.
4. **Me без cookie:** **401**.
5. **Logout:** после login **`POST /api/auth/logout`** → **204**, повторный **`/me`** → **401**; строка сессии удалена.
6. **Просрочка:** создать сессию с **`expires_at` в прошлом** (фикстура SQL) → **`/me`** → **401**.
7. **Sliding:** после **`/me`** поле **`expires_at`** в БД **больше**, чем до запроса (с допуском на секунды).

---

### Чеклист приёмки фазы 3

- [x] Все три маршрута соответствуют контрактам выше.
- [x] Cookie и БД не хранят сырой токен в открытом виде в БД (только hash).
- [x] `Secure` зависит от env.
- [x] CORS с credentials работает с origin из **`CORS_ORIGINS`** (проверка с фронта — по возможности в фазе 7, в фазе 3 — unit/integration).
- [x] `pytest` зелёный; README: как вызвать login/me/logout для ручной проверки.

### Исходные подшаги (сводка для Issues)

1. Утилиты: хэш токена, создание сессии, разбор cookie, sliding.
2. Pydantic-схемы login / me; роутер `auth`.
3. Dependencies `get_current_user`.
4. CORS + env `CORS_ORIGINS`, `COOKIE_SECURE` / `ENVIRONMENT`.
5. Тесты по списку выше.
6. Документация + чеклист.

---

## Фаза 4 — Справочные API и отчётные недели

**Критерий готовности фазы:** `GET /api/weeks/selectable` и `GET /api/outlets` соответствуют контрактам ниже; расчёт недель в **Asia/Yekaterinburg** по заданному алгоритму.

**Статус проработки спецификации:** готово к исполнению агентом (после команды владельца).  
**Статус реализации:** выполнено (`weeks`, `outlets`, `selectable_weeks.py`, `get_today_yekaterinburg`, тесты `test_phase4_reference`)

### Назначение

Реализовать два защищённых read-only эндпоинта ([`dev-handoff-spec.md`](./dev-handoff-spec.md) §8): список **до трёх последних завершённых** отчётных недель (пн–вс) для выбора в формах ввода и список **точек** с учётом роли. Часовой пояс расчёта — **`Asia/Yekaterinburg`** ([`development-plan-v1.md`](./development-plan-v1.md), фаза 2). **Без** логики сохранения данных (фаза 5).

### Входные условия

- Фазы **1–3**: БД, сиды, аутентификация, зависимость **`get_current_user`**.
- В таблице **`outlets`** есть физические и виртуальная **OZON** (фаза 2).

### Границы фазы (явно вне scope)

- `POST/PUT` submissions, dashboard, reports.
- Проверка «есть ли уже ввод за неделю» в ответе selectable — **не обязательна** в фазе 4 (можно добавить поле позже); сейчас только календарный список недель.
- Кэширование Redis и пагинация — не требуются.

---

### Часовой пояс и «сегодня»

- Использовать **`zoneinfo.ZoneInfo("Asia/Yekaterinburg")`**.
- **`today`** = календарная дата (`date`) в этой зоне на момент обработки запроса:  
  `datetime.now(ZoneInfo("Asia/Yekaterinburg")).date()`.

Для **тестов** обязательна возможность подменить «текущую дату» (например **`app.dependency_overrides`** для провайдера даты **`Callable[[], date]`**) — **без** env-переключателей в production.

---

### Алгоритм: три последние **завершённые** отчётные недели

**Определения**

- **Отчётная неделя:** календарные дни с **понедельника** по **воскресенье** включительно.
- **Неделя завершена** относительно **`today`**, если **воскресенье** этой недели **строго меньше** **`today`**. Если **`today`** — **воскресенье**, неделя, в которую оно входит, **ещё не завершена**; последняя завершённая заканчивается **предыдущим** воскресеньем.

**Шаги**

1. Найти **`last_completed_sunday`**: наибольшая дата **`S`**, где **`S.weekday() == 6`** (Python **`date.weekday()`**: пн=0, …, **вс=6**) и **`S < today`**.
   - Реализация: **`d = today - timedelta(days=1)`**; пока **`d.weekday() != 6`**, **`d -= timedelta(days=1)`**; затем **`S = d`**.
2. **`monday_latest = last_completed_sunday - timedelta(days=6)`**.
3. Три понедельника: **`w0 = monday_latest`**, **`w1 = w0 - 7`**, **`w2 = w1 - 7`**.
4. Порядок в JSON: **от более новой к более старой**: **`[w0, w1, w2]`**.

В нормальной эксплуатации — **ровно 3** элемента.

---

### Формат `label` (русский UI)

Шаблон: **`Пн DD.MM.YYYY — Вс DD.MM.YYYY`** (ведущий ноль у дня/месяца, год на **обеих** датах).  
**`week_end = week_start + timedelta(days=6)`**.

Пример: `Пн 17.02.2026 — Вс 23.02.2026`.

---

### `GET /api/weeks/selectable`

**Авторизация:** **`get_current_user`**; без сессии — **401**.

**Ответ 200:** JSON-массив (обычно длина **3**):

```json
[
  {
    "week_start": "2026-02-24",
    "label": "Пн 24.02.2026 — Вс 02.03.2026"
  }
]
```

**`week_start`:** **`YYYY-MM-DD`**, всегда **понедельник**.  
**Роли:** **`owner`**, **`marketer`**, **`site_manager`** — все допустимы.

---

### `GET /api/outlets`

**Авторизация:** **`get_current_user`**; без сессии — **401**.

По ТЗ виртуальный **OZON** в этот список **не** включается.

| Роль | Условие |
|------|---------|
| **`owner`**, **`marketer`** | **`is_virtual = false`**, сортировка **`sort_order` ASC**, **`code` ASC**. |
| **`site_manager`** | Точки из **`user_outlets`** для этого пользователя и **`is_virtual = false`**. |

**Ответ 200:**

```json
[
  {
    "id": 1,
    "code": "NOVOGRAD",
    "display_name": "Точка на Новоградском",
    "is_virtual": false
  }
]
```

У всех строк **`is_virtual`** = **`false`**.

---

### OpenAPI

Теги **`weeks`** / **`outlets`** или общий **`reference`** — один стиль на проект; Pydantic-схемы элементов списков.

---

### Тесты (обязательный минимум фазы 4)

1. **`GET /api/weeks/selectable`** без cookie → **401**.
2. Подмена **`today`**, например **`2026-03-31`**: **3** недели, убывающий порядок **`week_start`**, шаг **7** дней, **`label`** согласован с пн/вс.
3. **`today`** = **понедельник**: ручная проверка первой **`week_start`**.
4. **`today`** = **воскресенье**: текущая календарная неделя **не** считается завершённой.
5. **`GET /api/outlets`** без cookie → **401**.
6. Пользователь **`marketing`**: **2** точки (**NOVOGRAD**, **SVERDLOV**), без **`is_virtual: true`**.
7. Пользователь **`manager`**: две точки, порядок **`sort_order`**.

---

### Чеклист приёмки фазы 4

- [x] Оба маршрута только для авторизованных.
- [x] Недели: **Asia/Yekaterinburg**, алгоритм завершённой недели как выше.
- [x] **`label`** по шаблону **`Пн DD.MM.YYYY — Вс DD.MM.YYYY`**.
- [x] **`/api/outlets`** не возвращает **OZON**.
- [x] **`site_manager`** видит только **`user_outlets`**.
- [x] Тесты с подменой даты зелёные.

### Исходные подшаги (сводка для Issues)

1. Функция **`selectable_weeks(as_of: date)`** + unit-тесты.
2. Роутеры, Pydantic, SQLAlchemy-запросы **`outlets`** по роли.
3. Интеграционные тесты (cookie + override даты).
4. OpenAPI + README при необходимости.

---

## Фаза 5 — API ввода данных

**Статус проработки спецификации:** готово к исполнению агентом (после команды владельца и при выполнении фаз 1–4).  
**Статус реализации:** выполнено (роутер `submissions`, `is_week_selectable`, схемы `gp_api.schemas.submissions`, тесты `test_phase5_submissions.py`, 2026-04)

### Назначение

Реализовать **четыре эндпоинта** ввода по [`dev-handoff-spec.md`](./dev-handoff-spec.md) §5 и §8: **`GET`/`PUT`** пакета офлайн по точке и неделе, **`GET`/`PUT`** единого маркетингового пакета по неделе. Сохранение в таблицах фазы 2 с заполнением **`updated_by_user_id`** / **`created_by_user_id`** (где применимо) текущим пользователем. **Матрица ролей** и **границы недели** — как в ТЗ; без UI (фаза 8).

### Входные условия

- Фазы **1–3** выполнены: сессия, **`get_current_user`**.
- Фаза **4** выполнена: **`GET /api/weeks/selectable`** и **`GET /api/outlets`** — логика «три предыдущие недели» и **`Asia/Yekaterinburg`** уже есть; эндпоинты ввода **должны использовать ту же функцию/правило**, что и selectable, чтобы **нельзя было PUT в неделю вне списка** (иначе **404**).

### Границы фазы (явно вне scope)

- **`GET /api/dashboard/*`**, **`GET /api/reports/*`** (фаза 6).
- Фронтенд-формы (фаза 8).
- Загрузка файлов, черновики, история версий, optimistic locking.
- Изменение схемы БД (новые таблицы/колонки) — только если обнаружено противоречие с фазой 2; в идеале **нет**.

### Общие правила для всех маршрутов ввода

| Правило | Норматив |
|---------|----------|
| Аутентификация | Все методы — только с валидной сессией (**401** как в фазе 3). |
| Параметр **`week_start`** | Строка **`YYYY-MM-DD`**, календарный **понедельник** отчётной недели. Иначе **422** (сообщение на русском, напр. «Некорректная дата начала недели»). |
| Доступная неделя | **`week_start`** должен входить в список, **идентичный** ответу **`GET /api/weeks/selectable`** для **текущего** «сегодня» (тот же TZ). Иначе **404**, тело например `{"detail": "Неделя недоступна для ввода"}`. |
| Идемпотентность **PUT** | Повторный **PUT** с тем же путём и корректным телом **перезаписывает** строки БД за эту неделю (и разрез); ответ **200** с актуальным телом как у **GET**. |
| Транзакции | **PUT** маркетинга — **одна** транзакция на весь пакет (сайт + каналы + репутация + Ozon). **PUT** офлайн — одна транзакция на одну строку **`weekly_offline_metrics`**. |
| Аудит | При записи: **`updated_at`** = now(); **`updated_by_user_id`** = `current_user.id` в **`weekly_offline_metrics`**, **`weekly_marketing_site`**, **`weekly_ozon`**; в **`reputation_snapshots`** при вставке — **`created_by_user_id`**. |
| Формат чисел в JSON | Деньги и доли — **числа** JSON (не строки); на сервере типы **`Decimal`** / **`int`** с проверкой диапазонов. Допустима нормализация **2 знака** после запятой для денег при сохранении. |
| Производные **`OFF-AVG-CHK`**, **`OFF-RET-AVG`** | В **API фазы 5 не обязательны** (их может считать фронт или отдать в **GET** как read-only — **опционально**; если добавляете в **GET** офлайн — формулы: `off_rev/off_ord` при `off_ord>0`, `off_ret_sum/off_ret_n` при `off_ret_n>0`). |

### Матрица ролей (норматив)

| Роль | `GET/PUT .../offline/...` | `GET/PUT .../marketing/...` |
|------|---------------------------|-----------------------------|
| **`owner`** | **403** | **403** |
| **`marketer`** | **403** | **200** при соблюдении правил недели |
| **`site_manager`** | **200** только если **`outlet_code`** — **физическая** точка из **`user_outlets`** | **403** |

**403** (пример): `{"detail": "Недостаточно прав"}` — единый стиль с остальным API.

### `week_start` и справочник недели

- Разрешить **`week_start`** только из множества «selectable» (см. фазу 4). Реализация: вынести **`is_week_selectable(week_start_date) -> bool`** (или эквивалент) в общий модуль и вызывать из **`/api/weeks/selectable`** и из сабмишенов.
- Найти **`reporting_weeks.id`** по **`week_start_date`**. Если строки нет в БД (аномалия после сидов) — **404**.

---

### `GET /api/submissions/offline/{week_start}/{outlet_code}`

**Назначение:** вернуть сохранённый пакет **`OFF-*`** для точки и недели.

**Путь:** `outlet_code` — строка кода из **`outlets.code`** (**`NOVOGRAD`**, **`SVERDLOV`**); нормализовать к **верхнему** регистру и сравнивать с **`outlets.code`**.

**403:** роль не **`site_manager`**, или точка не в **`user_outlets`**, или **`outlet`** с **`is_virtual=true`**.

**404:** неделя недоступна; нет **`outlet`** с таким **`code`**.

**200 — тело** (имена полей в `snake_case`, согласованно с БД):

```json
{
  "week_start": "2026-01-05",
  "outlet_code": "NOVOGRAD",
  "off_rev": 12345.67,
  "off_ord": 42,
  "off_ret_n": 3,
  "off_ret_sum": 150.0,
  "updated_at": "2026-01-10T12:00:00+00:00"
}
```

- Если строки в **`weekly_offline_metrics`** **нет**: **200**, числовые поля **`null`**, **`updated_at`** — **`null`** (фронт показывает пустую форму). **404** «данные не найдены» для пустой строки **не** использовать, чтобы не путать с «неделя вне доступа».

**Примечание:** для денег предпочтительны **числа** JSON; если выбрана сериализация **Decimal** как строка — **один** стиль на всех эндпоинтах ввода и в OpenAPI.

---

### `PUT /api/submissions/offline/{week_start}/{outlet_code}`

**Заголовок:** `Content-Type: application/json`

**Тело:** те же поля, что и в ответе **GET**, **без** обязательного **`updated_at`** в запросе (сервер выставляет). Минимум:

```json
{
  "off_rev": 12345.67,
  "off_ord": 42,
  "off_ret_n": 3,
  "off_ret_sum": 150.0
}
```

**Валидация (422)** — сообщения на русском ([`ui-copy-guidelines.md`](../product%20docs/ui-copy-guidelines.md)):

| Поле | Правило |
|------|---------|
| `off_rev`, `off_ret_sum` | **≥ 0**, до **2** знаков после запятой (или округление на входе). |
| `off_ord`, `off_ret_n` | целые **≥ 0** |

Все четыре поля **обязательны** в теле **PUT**; **`null`** / отсутствие ключа — **422**.

**Логика:** UPSERT в **`weekly_offline_metrics`** по **`UNIQUE(week_id, outlet_id)`**; **`outlet_id`** только для **физической** точки.

**200:** тело как у **GET** после сохранения.

---

### `GET /api/submissions/marketing/{week_start}`

**Назначение:** один JSON со всеми блоками маркетолога за неделю ([`dev-handoff-spec.md`](./dev-handoff-spec.md) §5.3).

**403:** не **`marketer`**.

**404:** неделя недоступна.

**200 — структура (нормативная схема; имена полей согласовать в OpenAPI, блоки обязаны присутствовать):**

```json
{
  "week_start": "2026-01-05",
  "advertising": {
    "mkt_ad_ctx": 1000.0,
    "mkt_ad_map": 500.0
  },
  "web_channels": [
    { "channel": "organic", "visitors": 100 },
    { "channel": "cpc_direct", "visitors": 50 },
    { "channel": "direct", "visitors": 30 }
  ],
  "web_behavior": {
    "web_beh_bounce": 45.5,
    "web_beh_time": 120.5
  },
  "reputation": {
    "snapshot_date": "2026-01-05",
    "cells": [
      {
        "outlet_code": "NOVOGRAD",
        "platform": "2gis",
        "rating": 4.5,
        "review_cnt": 120
      },
      {
        "outlet_code": "NOVOGRAD",
        "platform": "yandex",
        "rating": 4.6,
        "review_cnt": 95
      },
      {
        "outlet_code": "SVERDLOV",
        "platform": "2gis",
        "rating": 4.4,
        "review_cnt": 80
      },
      {
        "outlet_code": "SVERDLOV",
        "platform": "yandex",
        "rating": 4.7,
        "review_cnt": 60
      }
    ]
  },
  "ozon": {
    "oz_rev": 20000.0,
    "oz_ord": 100,
    "oz_ret_n": 5,
    "oz_ret_sum": 3000.0,
    "oz_ad_spend": 800.0
  },
  "updated_at": "2026-01-10T12:00:00+00:00"
}
```

- Если данных ещё нет: примитивы — **`null`**; **`web_channels`** — массив из **трёх** элементов с теми же **`channel`** и **`visitors: null`**; **`reputation.cells`** — **4** элемента в фиксированном порядке (как выше) с **`null`** в числах, если нет строк в БД.
- **`platform`** в JSON: **`2gis`** | **`yandex`** (как enum **`maps_platform`**).

---

### `PUT /api/submissions/marketing/{week_start}`

**Тело:** структура как у **GET**, **без** обязательного **`updated_at`**. Все поля всех блоков **обязательны** для успешного сохранения (**422** при пропуске или невалидных значениях) — согласовано с [`dev-handoff-spec.md`](./dev-handoff-spec.md) §5.1 (**0** допустим).

**Валидация (422):**

| Блок | Правило |
|------|---------|
| **advertising** | `mkt_ad_ctx`, `mkt_ad_map` — **≥ 0**, денежная точность как для офлайн. |
| **web_channels** | Ровно **три** записи с **`channel`** ∈ `organic`, `cpc_direct`, `direct` (по одному каждого); **`visitors`** — целое **≥ 0**. |
| **web_behavior** | `web_beh_bounce` — **0–100** (включительно); `web_beh_time` — **≥ 0** (дробное). |
| **reputation** | `snapshot_date` — дата; **обязательно** `week_start <= snapshot_date <= week_start + 6` дней (календарная неделя отчёта). **`rating`** — **0–5**, до **2** десятичных (согласовано с **`NUMERIC(3,2)`** в БД); **`review_cnt`** — целое **≥ 0**. Четыре **`cells`**: каждая пара **`(outlet_code, platform)`** из набора выше **ровно один раз**. |
| **ozon** | Все пять полей **≥ 0** по типам как в §5.3 ТЗ. |

**Логика записи (норматив):**

1. **`weekly_marketing_site`**: UPSERT по **`week_id`**.
2. **`weekly_web_channels`**: три UPSERT по **`(week_id, channel_key)`**.
3. **`weekly_ozon`**: одна строка с **`outlet_id`** = id строки **`outlets`** где **`code = 'OZON'`**. UPSERT по **`(week_id, outlet_id)`**.
4. **`reputation_snapshots`**: перед вставкой **удалить** строки, у которых **`(outlet_id, platform)`** входит в четвёрку физических точек × платформ **и** **`snapshot_date`** в интервале **[week_start; week_start + 6 дней]** (закрытый интервал по дате). Затем **вставить** **4** строки с **`snapshot_date`**, **`rating`**, **`review_cnt`** из тела и **`created_by_user_id`**.  
   - *Цель:* при повторном **PUT** за ту же неделю не копятся строки репутации; смена **`snapshot_date`** внутри недели заменяет блок после удаления попавших в интервал недели строк.

**200:** тело как у **GET**.

---

### OpenAPI

- Тег **`submissions`** для четырёх маршрутов.
- Схемы тел и ответов — Pydantic-модели; примеры согласовать с полями выше.

---

### Тесты (обязательный минимум фазы 5)

Инструмент: **pytest**, БД с сидами (или фикстуры), **`httpx`/`TestClient`** с cookie-сессией.

1. **Offline happy path:** **`site_manager`**, валидная неделя и **`NOVOGRAD`** из **`user_outlets`** → **PUT** → **GET** совпадает.
2. **Offline 403:** **`marketer`** или **`owner`** → **PUT** → **403**; **`site_manager`** с **`outlet_code=OZON`** → **403**.
3. **Offline 403 чужая точка:** пользователь без связи с точкой (фикстура) → **403**.
4. **Offline 404 неделя:** **`week_start`** не из selectable → **404**.
5. **Offline 422:** отрицательное число / пропуск поля → **422**.
6. **Offline идемпотентность:** два одинаковых **PUT** → одна строка в БД, **GET** стабилен.
7. **Marketing happy path:** **`marketer`** → **PUT** полное тело → **GET** совпадает; в БД **1** строка **`weekly_marketing_site`**, **3** канала, **1** ozon, **4** reputation после первого PUT.
8. **Marketing 403:** **`site_manager`** → **PUT** marketing → **403**; **`owner`** → **403**.
9. **Marketing 422:** неверный **`channel`**, **`web_beh_bounce` > 100**, **`snapshot_date`** вне недели, неполный массив **`cells`** → **422**.
10. **Marketing reputation replace:** два **PUT** с разными **`snapshot_date`** внутри одной недели → после второго **PUT** в интервале дат этой недели остаётся согласованный набор из **4** строк (старые даты в интервале недели удалены правилом выше).
11. **401:** без cookie на всех четырёх путях.
12. **422, если `week_start` в пути — не понедельник:** параметр `{week_start}` должен быть календарным понедельником (см. таблицу «Общие правила»). Дата в формате `YYYY-MM-DD` может парситься успешно, но при `weekday() != 0` API возвращает **422** и сообщение «Некорректная дата начала недели» — это **не** «неделя вне selectable» (**404**), а именно неверный день недели. Покрыто тестом `test_offline_422_not_monday` (достаточно одного из четырёх маршрутов с `week_start` в пути).

---

### Чеклист приёмки фазы 5

- [x] Все четыре маршрута соответствуют контрактам; роли проверяются на сервере.
- [x] Недели вне **`selectable`** дают **404**, не **403**.
- [x] **`weekly_ozon.outlet_id`** всегда указывает на **`OZON`**.
- [x] **PUT** перезаписывает данные; повторный идентичный **PUT** не ломает уникальности.
- [x] **`pytest`** по списку выше зелёный (включая п.12 — **422** при не-понедельнике в `{week_start}`); в README — пример **curl**/описание тел для ручной проверки.

### Риски и заметки агенту

- Согласовать **сериализацию Decimal** (строка vs number) с фронтом заранее; в одной версии API — один стиль.
- Часовой пояс: «сегодня» для selectable и для сабмишенов — **строго один код**.
- Не дублировать расчёт selectable недель в другом виде — общая функция с фазой 4.

### Исходные подшаги (сводка для Issues)

1. Общая проверка **`week_start`** (пн + selectable) и резолв **`week_id`**.
2. Роутер **`submissions`**, Pydantic-модели офлайн и маркетинга.
3. **`GET/PUT` offline** + проверка **`user_outlets`** и физической точки.
4. **`GET/PUT` marketing** + транзакция: сайт, каналы, Ozon, репутация с удалением в диапазоне недели.
5. Тесты из § выше + OpenAPI.
6. Прогон чеклиста; отчёт владельцу.

---

## Фаза 6 — API дашборда и отчётов (агрегации)

**Статус проработки спецификации:** готово к исполнению агентом (после команд владельца; **зависит от фаз 3–5**).  
**Статус реализации:** выполнено (2026-04-01)

### Назначение

Реализовать **два семейства read-only эндпоинтов** по [`dev-handoff-spec.md`](./dev-handoff-spec.md) §8 и §6.2–6.3:

1. **`GET /api/dashboard/summary`** — сводка для `/dashboard`: выбранный период (**неделя / месяц / квартал**), **якорь** периода, **шесть блоков** KPI с полями **текущее / предыдущее / сравнение** по правилам [`ui-copy-guidelines.md`](../product%20docs/ui-copy-guidelines.md) §4 и [`dev-handoff-spec.md`](./dev-handoff-spec.md) §6.2.
2. **`GET /api/reports/{topic}/series`** — временные ряды для drill-down графиков для каждого **`topic`** из ТЗ.

**Источники формул и ID метрик:** [`metrics-registry.md`](../product%20docs/metrics-registry.md). **Права доступа:** только **`owner`** и **`marketer`**; **`site_manager`** → **403** на оба маршрута ([`dev-handoff-spec.md`](./dev-handoff-spec.md) §3).

### Входные условия

- Фазы **1–5** выполнены: в БД есть `reporting_weeks`, недельные таблицы, сиды; работают **auth** и **GET/PUT submissions**.
- Зависимость **`get_current_user`**; проверка роли перед отдачей данных.

### Границы фазы (явно вне scope)

- Любые **мутации** данных (ввод — фаза 5).
- **Кэширование** ответов (Redis и т.п.) — не обязательно в v1; цель **NFR-03** достигается SQL-агрегациями и индексами ([`dev-handoff-spec.md`](./dev-handoff-spec.md) §10).
- **Фронтенд** (карточки, Recharts) — фазы **7–9**.
- **Экспорт** файлов, **YoY**, план-факт.

### Норматив: часовой пояс и границы периодов

Все календарные границы (**«сегодня»**, первый/последний день месяца, квартала) считать в **`Asia/Yekaterinburg`**, согласованно с [`dev-handoff-spec.md`](./dev-handoff-spec.md) §5.1 и фазой 4.

**Отчётная неделя** — строка в `reporting_weeks` с `week_start_date` = понедельник (как в фазе 2).

**Query-параметры (общие для summary):**

| Параметр | Значения | Смысл |
|----------|----------|--------|
| `period` | `week` \| `month` \| `quarter` | Тип периода |
| `anchor` | `YYYY-MM-DD` | Якорь выбора периода (см. ниже) |

**Нормализация `anchor` и множество недель периода**

1. **`period=week`:** `anchor` должен быть **понедельником**; иначе **422** с сообщением на русском (например «Укажите понедельник отчётной недели»).  
   - **Текущий период P:** ровно одна неделя с `week_start_date = anchor`.  
   - **Предыдущий период P_prev:** неделя с `week_start_date = anchor - 7 days`.

2. **`period=month`:** взять календарный месяц, в который попадает `anchor` (в TZ Екатеринбург).  
   - **P:** все строки `reporting_weeks`, у которых `week_start_date` ∈ \[первый день месяца; последний день месяца\] (неделя входит в месяц, если её **понедельник** лежит в этом интервале).  
   - **P_prev:** предыдущий календарный месяц — тем же правилом.

3. **`period=quarter`:** квартал по календарю (Q1: янв–мар, …), содержащий `anchor`.  
   - **P / P_prev:** аналогично месяцу, по границам квартала.

**Отсутствующие недели в БД:** если для **P** нет ни одной недели с данными — допускается ответ **200** с нулевыми/null KPI и флагами сравнения «нет данных»; **404** использовать только если **`anchor` указывает на неделю вне допустимой истории** по продуктовым правилам (например будущее относительно «сегодня») — зафиксировать единое правило в коде и в тестах (рекомендация: **422** для явно невалидного будущего anchor, **200** с пустыми блоками для прошлого без строк в БД).

### Норматив: агрегация недельных метрик в месяц / квартал

Для всех **недельных** первичных полей (офлайн, маркетинг, каналы, Ozon): в границах **P** — **суммирование** по всем `week_id`, попавшим в период.  
**Производные за период** пересчитывать **из агрегированных первичных**, а не усреднять недельные производные (кроме случаев, где явно указано иначе):

| Метрика | Правило за месяц/квартал |
|---------|---------------------------|
| `WEB-TRF-TOT` | Сумма недельных `WEB-TRF-TOT` |
| `WEB-BEH-BOUNCE`, `WEB-BEH-TIME` | **Средневзвешенное по неделям** с весом `WEB-TRF-TOT` недели; если сумма весов = 0 — **null** или не отдавать сравнение |
| `DER-REV-TOT`, `DER-ORD-TOT`, суммы возвратов | Сумма по неделям |
| `OFF-AVG-CHK` (по точке или суммарно) | `SUM(off_rev) / SUM(off_ord)` при `SUM(off_ord) > 0` |
| `OZ-AVG-CHK` | `SUM(oz_rev) / SUM(oz_ord)` при `SUM(oz_ord) > 0` |

### Норматив: репутация в summary (месяц / квартал и неделя)

По [`metrics-registry.md`](../product%20docs/metrics-registry.md) §3:

- **Неделя P:** для каждой пары (физическая точка × площадка) взять снимок с **максимальной `snapshot_date` ≤ воскресенье этой недели** (или ≤ конец недели в TZ); если в ТЗ/фазе 5 зафиксировано «один снимок на неделю» — достаточно снимка, привязанного к вводу за эту неделю. **Единое правило** согласовать с реализацией фазы 5 (по `snapshot_date` и `week_id`).
- **Месяц / квартал P:** для каждой пары (точка × площадка) — **последний снимок** с `snapshot_date` внутри календарных границ **P** (включительно).

**Карточки «Карты — 2ГИС» и «Карты — Яндекс»** на summary ([`dev-handoff-spec.md`](./dev-handoff-spec.md) §6.2):

- Среднее **`REP-RATING`** по физическим точкам (простое среднее по 2 точкам после выбора снимка на пару).
- Суммарный **`REP-REV-CNT`** по точкам.
- **Прирост отзывов за период:** для drill-down детализируется в series; для **summary** достаточно: разница суммарного `REP-REV-CNT` между «последними снимками в P» и «последними снимками в P_prev» **или** сумма недельных дельт — выбрать **один** способ, согласованный с [`metrics-registry.md`](../product%20docs/metrics-registry.md) (`REP-REV-DELTA`), и задокументировать в коде.

### Норматив: сравнение с предыдущим периодом и поля API

Для каждого числового KPI в summary отдавать:

| Поле | Тип | Смысл |
|------|-----|--------|
| `current` | `number \| null` | Значение за **P** |
| `previous` | `number \| null` | Значение за **P_prev** |
| `comparison` | объект | См. ниже |

**Объект `comparison`** (единый стиль для фронта, соответствие [`ui-copy-guidelines.md`](../product%20docs/ui-copy-guidelines.md) §4):

| `kind` | Когда | Поведение UI |
|--------|--------|----------------|
| `percent` | `previous != 0` (и оба числа определены) | `value` = \((current - previous) / \|previous\| \times 100\) |
| `none` | `previous == 0` и `current == 0`, или нет данных | бейдж **«—»** |
| `new_from_zero` | `previous == 0` и `current > 0` | бейдж **«нов.»** (или единый выбор строки из ui-copy); tooltip **«Рост с нуля»** |

При `current` или `previous` **null** (нет строк в БД) — трактовать как отсутствие данных для сравнения: **`kind: none`**, без выдумывания нулей.

### `GET /api/dashboard/summary`

**Защита:** сессия обязательна; **`site_manager`** → **403** с телом вроде `{"detail": "Недостаточно прав"}` (русский текст согласовать с остальными 403 проекта).

**Query:** `period`, `anchor` — как выше. **422** при невалидном `period` или неверном формате даты / не-понедельник для `week`.

**Тело ответа 200 (нормативная структура):** JSON с полями:

- `period`, `anchor` (нормализованный), `previous_period_anchor` или эквивалентная метка начала **P_prev** для подписи UI (например `previous_anchor`).
- `blocks` — объект с ключами **`site`**, **`outlets`**, **`maps_2gis`**, **`maps_yandex`**, **`ozon`**, **`returns`** (имена в **snake_case** для JSON; на фронте маппятся на карточки).

**Каждый блок** — объект:

- `kpis`: массив элементов `{ "id": "<стабильный ключ, напр. WEB-TRF-TOT>", "label": "<опционально для UI>", "current", "previous", "comparison" }`.
- Для **`outlets`:** дополнительно `by_outlet`: массив `{ "outlet_code", "display_name", "kpis": [...] }` с выручкой и при необходимости заказами/средним чеком по [`dev-handoff-spec.md`](./dev-handoff-spec.md) §6.2.

**Минимальный набор KPI по блокам** (должен совпадать с §6.2 ТЗ):

| Блок | ID метрик (минимум) |
|------|---------------------|
| **site** | `WEB-TRF-TOT`, `WEB-BEH-BOUNCE`, `WEB-BEH-TIME` |
| **outlets** | `DER-REV-TOT`; по каждой физической точке — выручка (`OFF-REV`); опционально `DER-ORD-TOT` |
| **maps_2gis** | среднее рейтинг, сумма отзывов, показатель прироста (как согласовано выше) |
| **maps_yandex** | то же для платформы Яндекс |
| **ozon** | `OZ-REV`, `OZ-ORD`, `OZ-AD-SPEND`, `OZ-AVG-CHK` |
| **returns** | суммы и штуки офлайн (агрегат по точкам) + Ozon: `OFF-RET-SUM` Σ, `OFF-RET-N` Σ, `OZ-RET-SUM`, `OZ-RET-N` |

Дополнительные KPI не запрещены, если не ломают контракт.

### `GET /api/reports/{topic}/series`

**Защита:** как у summary (**403** для `site_manager`).

**Путь:** `topic` ∈ `site` \| `outlets` \| `maps-2gis` \| `maps-yandex` \| `ozon` \| `returns` (в URL с дефисом; FastAPI — отдельные литералы или path converter).

**Query (норматив):**

| Параметр | Обязательность | Смысл |
|----------|----------------|--------|
| `from` | да | Начало диапазона `YYYY-MM-DD` (включительно; трактовка — начало дня в **Asia/Yekaterinburg**) |
| `to` | да | Конец диапазона `YYYY-MM-DD` (включительно) |

**Дополнительные query по topic:**

| topic | Доп. параметры |
|--------|----------------|
| `outlets` | `outlet_code` — опционально; если нет — серии «по компании» или все точки (зафиксировать: **рекомендуется** отдавать структуру с разрезом по точкам для графика «все») |
| `maps-2gis`, `maps-yandex` | `outlet_code` — опционально (`NOVOGRAD` \| `SVERDLOV` \| отсутствует = все) |

**422:** `from > to` или невалидные даты.

**Тело 200:** объект с:

- `topic`, `from`, `to`
- `series`: массив рядов для Recharts/таблицы; каждый ряд: `{ "key": "<id серии>", "label": "<подпись>", "points": [ { "x": "<ISO date или week_start>", "y": number } ] }`

**Минимум рядов по topic** ([`dev-handoff-spec.md`](./dev-handoff-spec.md) §4.1):

| topic | Минимум |
|--------|---------|
| `site` | `WEB-TRF-TOT` по времени; опционально отказы/время на отдельных рядах |
| `outlets` | выручка по неделям; опционально заказы/возвраты |
| `maps-2gis`, `maps-yandex` | ось X — **дата снимка**; ряды: рейтинг, число отзывов |
| `ozon` | выручка; опционально заказы, реклама |
| `returns` | офлайн (сумма/шт) и Ozon по неделям |

Пустые диапазоны — **200** с пустыми `points`.

### OpenAPI

- Теги **`dashboard`** и **`reports`**.
- Схемы ответов summary и series описать явно (Pydantic); перечисления `period`, `topic`, `comparison.kind`.

### Производительность (напоминание)

- [`dev-handoff-spec.md`](./dev-handoff-spec.md) **NFR-03:** p95 для `/api/dashboard/summary` **< 800 мс** при тёплой БД. Избегать N+1; для агрегаций — SQL с группировкой / CTE; индексы по `week_id`, `outlet_id`, `(outlet_id, platform, snapshot_date)` уже заложены в фазе 2 — при необходимости добавить по результатам `EXPLAIN`.

### Тесты (обязательный минимум фазы 6)

Инструмент: **pytest**, БД с **сидами фазы 2** (8 недель и т.д.).

1. **403:** `site_manager` с валидной сессией → `GET /api/dashboard/summary` и `GET /api/reports/site/series` → **403**.
2. **401:** без cookie → **401**.
3. **Summary week:** `owner`, валидный `anchor` = известный понедельник из сидов → **200**, структура `blocks`, числа **совпадают с ручным расчётом** по сид-данным для минимум одного KPI в каждом блоке.
4. **Summary month/quarter:** границы периода и суммы совпадают с эталоном (отдельная фикстура или вычисление в тесте).
5. **Сравнение:** кейсы `percent`, `none`, `new_from_zero` на синтетических парах current/previous.
6. **Репутация:** для месяца с несколькими снимками — выбирается **последний в периоде** по паре точка×площадка.
7. **Series site:** `from`/`to` покрывают несколько недель — количество точек и суммы согласованы с недельными строками.
8. **Series maps:** точки сортируются по дате снимка; фильтр `outlet_code` сужает ряды.
9. **422:** `period=week` с `anchor` = вторник; `from` > `to`.

### Чеклист приёмки фазы 6

- [x] Оба маршрута доступны только **owner** и **marketer**; **site_manager** получает **403**.
- [x] Summary отражает все **шесть блоков** и KPI из §6.2 ТЗ (минимум).
- [x] Правила **`comparison`** соответствуют [`ui-copy-guidelines.md`](../product%20docs/ui-copy-guidelines.md) §4.
- [x] Репутация за месяц/квартал — **последний снимок в периоде** ([`metrics-registry.md`](../product%20docs/metrics-registry.md) §3).
- [x] Все **шесть** `topic` для series реализованы; пустые диапазоны не дают 5xx.
- [x] `pytest` зелёный; в README или внутренней доке — примеры query для ручной проверки.

### Риски и заметки агенту

- **Согласование недели репутации:** если в фазе 5 снимок привязан только к `week_id`, для summary за неделю брать данные этой недели без поиска по календарю; иначе — по `snapshot_date`. Не оставлять разрыв между фазами 5 и 6.
- **Среднее bounce/time за месяц:** только взвешенное по `WEB-TRF-TOT`, иначе искажение.
- **Деление на ноль** в производных — не отдавать `Infinity`; использовать `null` и `comparison.kind = none`.

### Исходные подшаги (сводка для Issues)

1. Утилиты: список `week_id` для P и P_prev; нормализация anchor (неделя/месяц/квартал) в TZ Екатеринбург.
2. Сервис агрегации недельных метрик + производные (`DER-*`, `WEB-TRF-TOT`, средние чеки).
3. Сервис репутации: последний снимок в периоде; прирост отзывов.
4. Сборка `GET /api/dashboard/summary` + Pydantic-схемы + `comparison`.
5. Реализация `GET /api/reports/{topic}/series` для шести topic + query `from`/`to`/`outlet_code`.
6. Тесты из списка выше + замер/заметка по NFR-03.

---

## Фаза 7 — Фронтенд: оболочка, маршрутизация, вход

**Статус проработки спецификации:** готово к исполнению агентом (уровень как у фаз 1–6).

**Цель:** закрытое приложение с навигацией по ролям после логина.

**Критерий готовности фазы:** экран логина; редиректы по роли; сайдбар/шапка по ТЗ; защита маршрутов; запросы к API с credentials/cookie.

**Статус реализации:** выполнено (2026-04-01)

### Подшаги

1. Vite + React + TypeScript, Router, TanStack Query, базовый layout ([`dev-handoff-spec.md`](./dev-handoff-spec.md) §4.1).
2. Страница `/login`, обработка ошибок сети/401.
3. Хранение/обновление состояния «текущий пользователь» (`/api/auth/me`).
4. Разделение пунктов меню по ролям (`owner`, `marketer`, `site_manager`).
5. Заглушки пустых маршрутов (dashboard, entry, reports) без бизнес-форм.
6. Тесты: минимум на роутер/охрану маршрутов (по выбору инструментов).

### Чеклист приёмки фазы 7

- [x] Vite + React + TS + React Router + TanStack Query + Tailwind; оболочка (сайдбар, шапка, мобильное меню).
- [x] `/login` по копирайту ТЗ; ошибки входа и сети на русском; `credentials: 'include'` для `/api/*`.
- [x] После входа и на защищённых маршрутах — `GET /api/auth/me`; при **401** — редирект на `/login`.
- [x] `/` → `owner`/`marketer` на `/dashboard`, `site_manager` на `/entry/offline`; меню по матрице §4.1 ТЗ.
- [x] Защита маршрутов по роли (`RoleGuard`); заглушки `/dashboard`, `/entry/*`, `/reports/*`.
- [x] Vitest + Testing Library: охрана ролей и `homePathForRole`.

**Заметки по реализации:** прокси Vite `/api` → цель из **`VITE_API_PROXY_TARGET`** (в Docker Compose для `web` задано `http://api:8000`; локально на хосте по умолчанию `http://127.0.0.1:8000`).

---

## Фаза 8 — Фронтенд: формы ввода

**Критерий готовности фазы:** маршруты **`/entry/week`** и **`/entry/offline`** соответствуют [`dev-handoff-spec.md`](./dev-handoff-spec.md) §4.1 и §5; под каждым полем или логическим блоком — **полный** текст подсказки из [`data-map.md`](../product%20docs/data-map.md) ([`ui-copy-guidelines.md`](../product%20docs/ui-copy-guidelines.md) §2); успешное **GET → правка → PUT** и повторное открытие с отображением сохранённых значений; **401** ведёт на логин; **403** / **422** — понятные сообщения на русском без кодов HTTP в UI.

**Статус проработки спецификации:** готово к исполнению агентом (после команды владельца).  
**Статус реализации:** выполнено (2026-04-01)

### Назначение

Реализовать **два защищённых экрана ввода** после фазы 7: единую форму маркетолога (**`/entry/week`**) и форму руководителя точки (**`/entry/offline`**). Использовать **React Router**, **TanStack Query**, **`fetch` с `credentials: 'include'`** (cookie **`gp_session`**), контракты **GET/PUT** из [`dev-handoff-spec.md`](./dev-handoff-spec.md) §8 (детализация тел — **OpenAPI фазы 5**; фронт обязан делать **round-trip**: тело **PUT** согласовано с тем, что отдаёт **GET** того же ресурса).

### Входные условия

- Фазы **1–7** выполнены: оболочка, логин, **`/api/auth/me`**, защита маршрутов по роли, **Tailwind + shadcn/ui** (или эквивалент из ТЗ §2).
- Фаза **5**: реализованы **`GET/PUT /api/submissions/offline/{week_start}/{outlet_code}`** и **`GET/PUT /api/submissions/marketing/{week_start}`** с валидацией и кодами **403** / **422** по [`dev-handoff-spec.md`](./dev-handoff-spec.md) §5 и §8.
- Фаза **4**: **`GET /api/weeks/selectable`**, **`GET /api/outlets`** (для офлайн — список точек руководителя).

### Границы фазы (явно вне scope)

- Экраны **`/dashboard`**, **`/reports/*`**, графики — **фаза 9**.
- Новые эндпоинты API, смена контракта submissions без синхронизации с фазой 5.
- Офлайн-режим PWA, черновики в **localStorage**, автосохранение по таймеру.
- Импорт из файлов, массовый ввод.

### Нормативные ссылки

| Тема | Документ |
|------|----------|
| Состав экранов, подписи кнопок, секции форм | [`dev-handoff-spec.md`](./dev-handoff-spec.md) §4.1 (`/entry/week`, `/entry/offline`) |
| Правила недели, обязательность полей, 0, идемпотентность PUT | §5.1 |
| Поля **`OFF-*`**, производные | §5.2 |
| Поля маркетолога (реклама, трафик, поведение, репутация, Ozon) | §5.3 |
| Пути API | §8 |
| Тексты подсказок под полями | [`data-map.md`](../product%20docs/data-map.md) §3–4 (полные формулировки, не сокращать) |
| Ошибки, привязка 422 к полям, русский язык | [`ui-copy-guidelines.md`](../product%20docs/ui-copy-guidelines.md) §2–3 |
| Формат подписи недели | Фаза 4 этого документа: **`label`** = **`Пн DD.MM.YYYY — Вс DD.MM.YYYY`** |
| Мобильная ширина | [`dev-handoff-spec.md`](./dev-handoff-spec.md) NFR-04: **360px** без горизонтального скролла |

### Маршрутизация и доступ по ролям

| Маршрут | Роль | Поведение при несоответствии роли |
|---------|------|-----------------------------------|
| **`/entry/week`** | **`marketer`** | Редирект на **`/dashboard`** для **`owner`**; на **`/entry/offline`** для **`site_manager`** (или на **`/`** для единообразного редиректа из фазы 7) |
| **`/entry/offline`** | **`site_manager`** | Редирект на **`/dashboard`** для **`owner`** / **`marketer`** |

Допускается централизованный **layout route guard**, повторяющий правила фазы 7.

### Общие требования к данным и HTTP

1. **Ключ недели в URL API:** **`week_start`** строго **`YYYY-MM-DD`** (понедельник). Значение брать только из выбранного элемента **`GET /api/weeks/selectable`** (поле **`week_start`**), не вычислять на клиенте иначе.
2. **TanStack Query:**
   - при смене **`week_start`** (и для офлайн — **`outlet_code`**) инвалидировать или заменять query key, чтобы **GET** подтянул актуальные данные;
   - **`staleTime`** для справочников недель — по усмотрению (например 1–5 мин); после успешного **PUT** — **`invalidateQueries`** для соответствующего submission.
3. **`credentials: 'include'`** во всех запросах к **`/api/*`** (уже настроено в фазе 7 или обёртке **`apiClient`**).
4. **Состояния UI:** скелетон или спиннер при **GET**; блокировка двойного сабмита при **PUT**; после **200** — краткое подтверждение (toast или строка «Сохранено») по паттерну приложения.

### Компонент выбора недели (общий паттерн)

1. При монтировании экрана: **`GET /api/weeks/selectable`** (уже авторизован).
2. **Пустой список** (нештатно для нормальной эксплуатации): сообщение на русском вроде «Нет доступных отчётных недель» + логирование; без падения приложения.
3. **UI:** сегментированный контроль или **Select**; отображаемая подпись — **`label`** с сервера; значение опции — **`week_start`**.
4. Под селектором дублировать диапазон **пн–вс** необязательно, если **`label`** уже полный (как в фазе 4).

---

### `/entry/week` (роль **`marketer`**)

**Маршрут:** **`/entry/week`**.  
**Заголовок страницы (H1):** «Ввод за неделю» ([`dev-handoff-spec.md`](./dev-handoff-spec.md) §4.1).

#### Структура экрана

1. Блок **выбора недели** (см. выше).
2. До выбора недели форму полей **не показывать** или показывать disabled с текстом «Выберите неделю».
3. После выбора: **`GET /api/submissions/marketing/{week_start}`** → заполнить форму (в т.ч. нули и пустые массивы по контракту API). Если **404** трактуется как «ещё нет данных» — обработать по фактической реализации фазы 5 (либо пустая форма, либо дефолты); зафиксировать одно поведение в коде и README.
4. Одна **вертикальная форма** с якорными **секциями** (заголовки **H2**), отступы между блоками как в ERP-оболочке (§4.1).

#### Секции и поля (соответствие §5.3)

Каждое поле ввода: **label** (как в ТЗ), **input**, под полем — **описание из `data-map.md`** для соответствующей метрики (многострочный мелкий текст, читаемая ширина на мобильном).

| Секция (H2) | Содержимое | Валидация клиента (до отправки) |
|-------------|------------|----------------------------------|
| **Реклама** | **MKT-AD-CTX**, **MKT-AD-MAP** | число ≥ 0, деньги — 2 знака после запятой (или целые копейки по решению UI — согласовать с API); пустая строка → ошибка «Заполните поле», **не** подставлять 0 молча |
| **Сайт: посетители** | три поля: органика, CPC (Директ), прямые заходы | целые ≥ 0; имена каналов в теле запроса — **`organic`**, **`cpc_direct`**, **`direct`** ([`dev-handoff-spec.md`](./dev-handoff-spec.md) §5.3) |
| **Сайт: поведение** | **WEB-BEH-BOUNCE**, **WEB-BEH-TIME** | отказы: 0–100; длительность: ≥ 0, в **секундах** |
| **Репутация** | одно поле **«Дата снимка»** (`snapshot_date`, date); таблица **4 строки**: колонки «Точка», «Площадка», «Оценка», «Число отзывов» — строки **NOVOGRAD/SVERDLOV × 2ГИС/Яндекс** | оценка и число отзывов ≥ 0; дата обязательна; сопоставление с телом API — по схеме фазы 5 (**`maps_platform`**: `2gis` / `yandex` или как в OpenAPI) |
| **Ozon** | **OZ-REV**, **OZ-ORD**, **OZ-RET-N**, **OZ-RET-SUM**, **OZ-AD-SPEND** | как в §5.3; все обязательны, **0** допустим |

**Кнопка сохранения:** подпись **«Сохранить неделю»** (или **«Сохранить»** если в оболочке уже есть контекст «неделя» — тогда единообразно с §4.1: предпочтительно **«Сохранить неделю»** внизу длинной формы).

**Закреплённая панель (низ экрана):** на мобильном кнопка **«Сохранить неделю»** видна без прокрутки через всю форму (sticky footer или повтор кнопки — как в §4.1).

**Логика активности кнопки:** при невалидных полях — disabled **или** по клику прокрутка к первому полю с ошибкой (как в ТЗ); не отправлять **PUT**, пока клиентская валидация не пройдена.

#### PUT

- **`PUT /api/submissions/marketing/{week_start}`** с телом, **сериализованным из состояния формы** и совпадающим по структуре с **GET**.
- Успех **200**: показать подтверждение; опционально обновить кэш запроса **GET** для этой недели.

---

### `/entry/offline` (роль **`site_manager`**)

**Маршрут:** **`/entry/offline`**.  
**Заголовок:** по ТЗ — фокус на ввод по точке; допустим H1 «Ввод по точке» или согласованный с пунктом меню «Ввод по точке» текст.

#### Точки

1. **`GET /api/auth/me`** уже содержит **`outlets[]`** для руководителя (только физические точки). Для переключателя использовать этот список **или** повторно **`GET /api/outlets`** — один источник зафиксировать (рекомендуется **`/me`** для согласованности с фазой 7).
2. **Одна точка:** переключатель не показывать; **`outlet_code`** зафиксирован.
3. **Две точки:** **табы** или **segmented control** с **`display_name`** (или короткие имена из справочника); значение — **`code`** (**`NOVOGRAD`** / **`SVERDLOV`**).

#### Неделя и данные

- Выбор недели — тот же паттерн, что на **`/entry/week`**.
- **`GET /api/submissions/offline/{week_start}/{outlet_code}`** → значения в поля **OFF-REV**, **OFF-ORD**, **OFF-RET-N**, **OFF-RET-SUM** (подписи UI — [`dev-handoff-spec.md`](./dev-handoff-spec.md) §5.2).
- **`PUT`** на тот же путь с обновлённым телом.

#### Блок «Считается автоматически»

Под полями ввода, **read-only**:

- **`OFF-AVG-CHK`** = **OFF-REV / OFF-ORD**, если **OFF-ORD > 0**; иначе «—» или «Нет заказов».
- **`OFF-RET-AVG`** = **OFF-RET-SUM / OFF-RET-N**, если **OFF-RET-N > 0**; иначе «—».

Пересчитывать **при изменении полей** (live) и после загрузки **GET**. Формат денег — как в [`ui-copy-guidelines.md`](../product%20docs/ui-copy-guidelines.md) §5.

**Кнопка:** «Сохранить» (как §4.1).

---

### Маппинг ошибок HTTP (UI)

| Код | Действие |
|-----|----------|
| **401** | Редирект на **`/login`**; при необходимости очистить локальное состояние пользователя |
| **403** | Сообщение в духе «Нет доступа к этой точке» / «Недостаточно прав» ([`ui-copy-guidelines.md`](../product%20docs/ui-copy-guidelines.md) §3) |
| **404** | Если неделя не в списке selectable — «Неделя недоступна»; иначе по смыслу фазы 5 |
| **422** | Разобрать тело валидации FastAPI / Pydantic; сопоставить **`loc`** или коды полей с полями формы; показать текст под полем и/или общий блок «Исправьте ошибки» **без** показа `traceback` и сырого JSON |

Сетевые сбои: одна фраза на русском («Не удалось сохранить. Проверьте соединение.»).

### Валидация на клиенте (согласованность с сервером)

- Правила из §5.1: все перечисленные поля обязательны; **0** допустим для чисел.
- Не превращать пустой ввод в **0** без явного действия пользователя — пустое = ошибка «Заполните поле».
- Ограничения длины и шаг **`inputmode`** / **`pattern`** — для UX; источник правды по диапазонам — ответ **422** с сервера.

### NFR: мобильная вёрстка

- Ширина **360px**: формы в один столбец; таблица репутации — либо карточки по строкам, либо горизонтальный скролл **только** внутри карточки таблицы, но **не** у всего viewport ([`dev-handoff-spec.md`](./dev-handoff-spec.md) NFR-04). Предпочтительно **без** горизонтального скролла страницы.
- Касаемые области кнопок — не меньше разумного минимума (≈44px по высоте).

### Тесты (обязательный минимум фазы 8)

Инструмент: **Vitest** + **Testing Library** (как в проекте) и/или **Playwright** — по наличию в репо.

1. **Роутинг:** **`marketer`** открывает **`/entry/week`**; **`site_manager`** — **`/entry/offline`**; чужая роль не видит чужой экран (редирект).
2. **Выбор недели:** мок **`selectable`** → смена **`week_start`** вызывает запрос **GET** submission с правильным URL.
3. **Офлайн-производные:** при вводе выручки и заказов отображается ожидаемый средний чек; при нуле заказов — прочерк.
4. **422:** мок ответа с **`detail`** по полю → текст ошибки у соответствующего инпута (или общий список).
5. (Опционально e2e) Сохранение: **PUT** мок **200** → сообщение об успехе и повторный **GET** с новыми значениями.

### Чеклист приёмки фазы 8

- [x] **`/entry/week`**: все секции §5.3, подсказки из **`data-map.md`** полные (тексты в `apps/web/src/copy/dataMapHints.ts`).
- [x] **`/entry/offline`**: переключатель точки при двух точках; четыре поля + блок производных.
- [x] Недели только из **`GET /api/weeks/selectable`**; **`label`** как в API.
- [x] **GET/PUT** submissions с **`credentials`**; после сохранения данные подтягиваются повторным **GET** (`invalidateQueries`).
- [x] **403** / **422** / **401** обработаны по таблице выше (401 → редирект на `/login`, 422 → разбор `detail` и поля).
- [x] Вёрстка форм — один столбец, репутация — карточки по строкам (без таблицы на всю ширину); **NFR-04 (360px)** и критерии **A4–A7** из [`dev-handoff-spec.md`](./dev-handoff-spec.md) §11 — подтвердить вручную при приёмке.

### Исходные подшаги (сводка для Issues)

1. Общий хук/компонент **`useSelectableWeeks`** + UI выбора недели.
2. Страница **`/entry/week`**: секции формы, подсказки из data-map, связь с **GET/PUT marketing**.
3. Страница **`/entry/offline`**: точки из **`/me`**, **GET/PUT offline**, производные.
4. Обработка ошибок и состояний загрузки; sticky save на мобильном для маркетолога.
5. Тесты по списку выше; ручной прогон A4–A7.

---

## Фаза 9 — Фронтенд: дашборд и drill-down

**Статус проработки спецификации:** готово к исполнению агентом (после команды владельца; **зависит от фаз 6–8**).  
**Статус реализации:** выполнено (2026-04-01)

### Назначение

Реализовать **`/dashboard`** и **шесть экранов drill-down** **`/reports/*`** для ролей **`owner`** и **`marketer`**: загрузка **`GET /api/dashboard/summary`** и **`GET /api/reports/{topic}/series`** (фаза 6), отображение KPI с **текущее / было / сравнение** по [`ui-copy-guidelines.md`](../product%20docs/ui-copy-guidelines.md) §4, графики (**Recharts** или эквивалент из [`dev-handoff-spec.md`](./dev-handoff-spec.md) §2), таблицы детализации и фильтры согласно [`dev-handoff-spec.md`](./dev-handoff-spec.md) §4.1 и §6.3. **`site_manager`** на эти маршруты **не** допускается (редирект и отсутствие пунктов меню — наследие фазы 7).

### Входные условия

- Фазы **1–7** выполнены: оболочка, **`credentials: 'include'`**, защита маршрутов, **`owner`/`marketer`** видят пункты «Дашборд» и отчёты.
- Фаза **6**: реализованы **`GET /api/dashboard/summary`** (`period`, `anchor`) и **`GET /api/reports/{topic}/series`** (`from`, `to`, опционально `outlet_code`); контракты **`blocks`**, **`comparison`**, **`series[]`** — как в спецификации фазы 6 этого документа.
- Фаза **4** (опционально для дефолта недели): **`GET /api/weeks/selectable`** — для **дефолтного** `anchor` при `period=week` (первая запись = самая новая завершённая неделя).

### Границы фазы (явно вне scope)

- **Мутации** данных, формы ввода (фаза 8).
- **Экспорт** PDF/Excel, **email-рассылки**, печать.
- **Новые** эндпоинты агрегации без согласования с фазой 6 (исключение — если владелец явно добавляет read-only **`GET /api/weeks/...`** для списка якорей; см. § ниже).
- **Prod / HTTPS / nginx** (фаза 10).

### Нормативные ссылки

| Тема | Документ |
|------|----------|
| Состав экранов, порядок блоков, клик по карточке | [`dev-handoff-spec.md`](./dev-handoff-spec.md) §4.1 (`/dashboard`, `/reports/...`) |
| KPI по блокам (минимум) | §6.2 |
| Правила бейджа **%**, **«—»**, **«нов.»**, tooltip | [`ui-copy-guidelines.md`](../product%20docs/ui-copy-guidelines.md) §4 |
| Формат денег, табличные цифры | [`ui-copy-guidelines.md`](../product%20docs/ui-copy-guidelines.md) §5; §6.1 ТЗ (tabular-nums) |
| Структура ответа summary и series | Фаза **6** этого документа; OpenAPI API |
| Мобильная ширина | [`dev-handoff-spec.md`](./dev-handoff-spec.md) NFR-04 (**360px**) |
| Критерии приёмки | [`dev-handoff-spec.md`](./dev-handoff-spec.md) §11 (**A1**, **A2**, **A8**, **A9**, **A10** и смежные) |

---

### Доступ по ролям

| Маршрут | Роли | При заходе **`site_manager`** |
|---------|------|--------------------------------|
| **`/dashboard`**, **`/reports/*`** | **`owner`**, **`marketer`** | Редирект на **`/entry/offline`** (или **`/`**) — как зафиксировано в фазе 7; **403** от API не должен быть нормой при корректном роутинге |

Пункты сайдбара для отчётов — как в §4.1 ТЗ (порядок: Сайт → Точки → Карты 2ГИС → Карты Яндекс → Ozon → Возвраты).

---

### Общие требования к данным и HTTP

1. **`fetch` / обёртка API** с **`credentials: 'include'`** для всех запросов к **`/api/dashboard/*`** и **`/api/reports/*`**.
2. **TanStack Query:** отдельные **`queryKey`** для пары **`(period, anchor)`** у summary и для **`(topic, from, to, outlet_code?)`** у series; при смене фильтров — автоматический refetch; **`staleTime`** умеренный (например 30–120 с) или **0** для отчётов при активной работе с датами — зафиксировать в коде.
3. **Ошибки:** по аналогии с фазой 8 — **401** → редирект на **`/login`**; **403** → короткое сообщение на русском; **422** → текст без кода HTTP; сеть — «Не удалось загрузить данные…».
4. **Загрузка:** скелетон карточек / области графика; избегать «прыжков» вёрстки при появлении данных.

---

### Маппинг «блок дашборда» → маршрут отчёта

Ключи из **`blocks`** в ответе summary (фаза 6) → путь SPA (как §4.1 ТЗ):

| Ключ **`blocks.*`** | Маршрут |
|---------------------|---------|
| **`site`** | **`/reports/site`** |
| **`outlets`** | **`/reports/outlets`** |
| **`maps_2gis`** | **`/reports/maps/2gis`** |
| **`maps_yandex`** | **`/reports/maps/yandex`** |
| **`ozon`** | **`/reports/ozon`** |
| **`returns`** | **`/reports/returns`** |

**Маппинг `topic` в URL API** (путь **`/api/reports/{topic}/series`**, фаза 6):  
**`site`**, **`outlets`**, **`ozon`**, **`returns`** — совпадают; для карт: **`maps-2gis`** и **`maps-yandex`** (**дефис** в API, **слэш** во фронтовом маршруте). В коде — одна таблица соответствий, без «магических строк» в пяти местах.

---

### Переключатель периода и выбор **`anchor`**

**Период** (сегмент или табы): **`week`** | **`month`** | **`quarter`** → query **`period`** в **`GET /api/dashboard/summary`**.

**`anchor`** (дата **`YYYY-MM-DD`**):

| `period` | Требование к anchor (как фаза 6) | UI-селект |
|----------|-----------------------------------|-----------|
| **`week`** | Календарный **понедельник** отчётной недели | Список **понедельников** по убыванию (новые сверху). **Источник списка v1:** (1) предпочтительно вызвать **`GET /api/reports/site/series`** с широким диапазоном **`from`/`to`** (например от **самой ранней** известной недели с данными до **сегодня** в **Asia/Yekaterinburg**) и собрать уникальные **`x`** из ряда, если в OpenAPI зафиксировано **`x` = `week_start`**; либо (2) отдельный read-only эндпоинт списка недель из БД — **только** после добавления в спецификацию API. **Дефолт при первом открытии:** совпадает с **первым** элементом **`GET /api/weeks/selectable`** (самая новая завершённая неделя), если список не пуст; иначе — первый понедельник из построенного списка (1). |
| **`month`** | Любая дата внутри целевого месяца (удобно **1-е число** месяца) | Селект «Месяц ГГГГ» за последние **N** месяцев (например **24** или до минимальной даты данных), значение **`anchor`** = **1-е число** выбранного месяца в **Asia/Yekaterinburg**. |
| **`quarter`** | Любая дата внутри квартала | Селект квартал **Q1–Q4 + год**; **`anchor`** = **первый день квартала** (например **YYYY-01-01**, **04-01**, **07-01**, **10-01**). |

При смене **`period`** сбрасывать или пересчитывать **`anchor`** в валидное значение для нового типа периода (не отправлять **422** из-за «вторника» при `period=week`).

**Подпись текущего периода** в UI (под стилем ТЗ): для недели — диапазон **Пн–Вс** (как **`label`** фазы 4 или локальный расчёт из `anchor`); для месяца и квартала — человекочитаемая строка («Март 2026», «Q1 2026»).

---

### `/dashboard`

**Заголовок области (H1):** по смыслу главный дашборд (например «Сводка» или оставить только период в шапке — без противоречия §4.1).

**Верхняя панель контента:**

1. Переключатель **Неделя | Месяц | Квартал**.
2. Селект **`anchor`** (см. таблицу выше).
3. Опционально краткая подпись выбранного периода справа.

**Сетка карточек:** **6** блоков, порядок сверху вниз как §4.1 ТЗ: **Сайт** → **Точки** → **Карты — 2ГИС** → **Карты — Яндекс** → **Ozon** → **Возвраты**. На десктопе **1–2** колонки (`grid`), на мобильном — **одна** колонка, карточки на всю ширину.

**Одна карточка блока:**

- Заголовок блока (как в ТЗ).
- Список **KPI** из **`blocks.<key>.kpis`** (и для **Точек** — при необходимости подзаголовки по **`by_outlet`** согласно ответу API).
- Для каждого KPI: **текущее** значение крупно (**tabular-nums**), строка **«Было: …»** из **`previous`** (форматировать как текущее; при **`null`** — «—» или «Нет данных»).
- **Бейдж сравнения** из **`comparison`**:
  - **`kind: percent`** — показать **`value`** как процент с разумным округлением; цвет **нейтральный** (рост не всегда хорош).
  - **`kind: none`** — **«—»**.
  - **`kind: new_from_zero`** — выбрать **одну** подпись на всё приложение: **«нов.»** / **«нов»** / **«—»** ([`ui-copy-guidelines.md`](../product%20docs/ui-copy-guidelines.md) §4); **tooltip** «Рост с нуля».
- **Кликабельность:** вся карточка (или явная ссылка «Подробнее») ведёт на соответствующий **`/reports/...`** (таблица маппинга выше). Клавиатура: фокус и **Enter** по желанию (a11y baseline).

**Пустые / частичные данные:** если блок или KPI без чисел — не ломать сетку; текст вроде «Недостаточно данных для сравнения» там, где нет прошлого периода (§4.1 ТЗ). **A10:** не показывать баннер «полнота недели».

---

### Общий каркас страниц **`/reports/*`**

- **Хлебные крошки:** **Дашборд** (ссылка на **`/dashboard`**) → название раздела (как §4.1).
- **H1** страницы — как в ТЗ для каждого маршрута.
- **Область фильтров** (даты, при необходимости точка) — одна строка или перенос на мобильном.
- **График:** **`ResponsiveContainer`**; высота фиксированная разумная (например **280–360px**); при пустых **`points`** — подпись «Нет данных за выбранный период», оси не должны давать **NaN** (**A9**).
- **Таблица** под графиком (по ТЗ желательно для ERP-ощущения): колонки согласовать с рядами API; **tabular-nums**; горизонтальный скролл **только** у таблицы внутри карточки, не у всего viewport (**NFR-04**).

**Диапазон дат `from`/`to`:**

- Два контроля **date** или **date picker** (shadcn Calendar + Popover).
- Пресет-кнопка **«Последние 8 недель»:** выставить **`to`** = «сегодня» (**Asia/Yekaterinburg**), **`from`** = **`to - 7×8 + 1` день** по календарю (уточнить в коде границы включительно согласно API).
- Инициализация при **первом заходе** на отчёт: разумный дефолт (например последние **8** недель или текущий месяц) — зафиксировать один вариант в коде и README.

**Опционально:** синхронизация **`from`/`to`** с **`searchParams`** URL для возможности поделиться ссылкой — не обязательна в v1.

---

### `/reports/site`

- **Заголовок:** «Сайт: динамика» (§4.1).
- **Series:** **`topic=site`**; минимум ряд **`WEB-TRF-TOT`** (ключ серии — как в ответе API).
- **График:** линия или область по времени; опционально второй ряд (**отказы**, **время**) — второй **Y** или отдельная малая серия, если API отдаёт несколько **`series`**.
- **Таблица:** неделя (или дата **`x`**), посетители всего, органика, CPC, прямые, отказы, время — по доступным рядам; заголовки на русском.

---

### `/reports/outlets`

- **Фильтр точки:** **«Все | NOVOGRAD | SVERDLOV»** (подписи из справочника **`display_name`** при наличии в **`/api/auth/me`** или статический маппинг код → короткое имя).
- **Query:** **`outlet_code`** опускать для «все»; иначе передать в **`GET /api/reports/outlets/series`**.
- **График:** минимум **выручка** по времени; опционально заказы/возвраты — если API отдаёт ряды.
- **Таблица:** недели и разрез по точкам согласно структуре **`series`** (не выдумывать столбцы без данных API).

---

### `/reports/maps/2gis` и `/reports/maps/yandex`

- **Фильтр точки:** **все / одна** (**`outlet_code`** в query).
- **Topic:** **`maps-2gis`** или **`maps-yandex`**.
- **График:** ось **X** — **дата снимка**; ряды **рейтинг** и **число отзывов** (две линии или два графика — по усмотрению UI).
- **Таблица:** снимки под графиком (дата, точка, рейтинг, отзывы).

---

### `/reports/ozon`

- Диапазон дат; **topic `ozon`**.
- Графики: минимум **выручка**; опционально заказы, реклама — если есть в **`series`**.
- Таблица по неделям / точкам времени согласно API.

---

### `/reports/returns`

- **topic `returns`**.
- Сводная динамика: **офлайн** (сумма/шт по компании) и **Ozon** — один составной график или два — по структуре **`series`**.
- Таблица: недели, колонки офлайн / Ozon.

---

### Графики (Recharts): норматив реализации

- **`XAxis`:** тип по данным (**категория** для недель **`week_start`**, **дата** для снимков); подписи не перекрывать друг друга (угол / прореживание на узком экране).
- **`YAxis`:** адекватный **domain** при всех нулях; **не** отображать **Infinity**.
- **`Tooltip`:** локаль **`ru`**, формат чисел как §5 ui-copy.
- **Легенда** компактная; цвета в нейтральной палитре (§6.1 ТЗ).
- **Производительность:** [`dev-handoff-spec.md`](./dev-handoff-spec.md) **NFR-02** — тяжёлые страницы не блокировать первый рендер (ленивая подгрузка чарта или **Suspense** по возможности).

---

### Тесты (обязательный минимум фазы 9)

Инструмент: **Vitest** + **Testing Library**; при наличии — **Playwright** для смоука.

1. **Роутинг:** **`marketer`** открывает **`/dashboard`**; **`site_manager`** с моком guard не попадает на **`/dashboard`** (редирект).
2. **Summary:** мок **`GET /api/dashboard/summary`** с **`comparison.kind`** ∈ `percent` | `none` | `new_from_zero` — отображение бейджа и tooltip для **`new_from_zero`**.
3. **Карточка → навигация:** клик по карточке блока **`site`** ведёт на **`/reports/site`** (memory router).
4. **Series:** мок **reports** с пустым **`points`** — нет падения; сообщение пустого состояния.
5. **Фильтр дат:** смена **`from`/`to`** меняет **`queryKey`** и вызывает refetch (проверка через мок fetch или MSW).

---

### Чеклист приёмки фазы 9

- [x] **`/dashboard`**: шесть блоков, порядок как ТЗ; период **неделя/месяц/квартал**; селект **`anchor`** (недели — selectable + ряд site; месяц/квартал — локальные списки).
- [x] KPI: **текущее**, **Было**, бейдж по **`comparison`** ([`ui-copy-guidelines.md`](../product%20docs/ui-copy-guidelines.md) §4: **нов.** + tooltip «Рост с нуля»).
- [x] Клик по карточке ведёт на соответствующий **`/reports/*`** (таблица маппинга `dashboard/blockMeta.ts`).
- [x] Все **шесть** отчётов: `from`/`to`, пресет «Последние 8 недель», фильтр точки где нужно; **Recharts** + таблица; **Ozon** — две оси Y; **возвраты** — два графика (суммы / шт.).
- [x] **401** / **403** / сеть обработаны на русском.
- [x] Сетка дашборда — одна колонка на узком экране; **NFR-04** и **A1**, **A2**, **A8**, **A9**, **A10** — подтвердить вручную при приёмке.

**Заметки:** инструкция «открыть в браузере» — [`apps/web/README.md`](../../apps/web/README.md); при первом открытии дашборда якорь недели берётся из **`GET /api/weeks/selectable`**.

### Риски и заметки агенту

- **Список недель для anchor:** если **`x`** в **`site/series`** не равен **`week_start`**, уточнить OpenAPI фазы 6 и поправить извлечение списка или запросить у владельца отдельный лёгкий эндпоинт.
- **Расхождение имён:** `maps_2gis` в JSON summary vs **`maps-2gis`** в path API — держать в одном модуле констант.
- **`by_outlet`** в блоке **Точки:** вложенные KPI не дублировать в разметке вручную для каждой точки — маппинг из массива.

### Исходные подшаги (сводка для Issues)

1. Хуки **`useDashboardSummary(period, anchor)`** и **`useReportSeries(topic, params)`** + обработка ошибок.
2. Компоненты **`PeriodSwitcher`**, **`AnchorSelect`**, **`KpiCard`**, **`ComparisonBadge`**.
3. Страница **`/dashboard`** и навигация на отчёты.
4. Шесть страниц **`/reports/*`** с общим каркасом, фильтрами дат и Recharts.
5. Тесты по списку выше; ручной прогон A1, A2, A8, A9, A10.

---

## Фаза 10 — Production, runbook, качество

**Статус проработки спецификации:** готово к исполнению агентом (после команды владельца; **зависит от фаз 1–9**).  
**Статус реализации:** не начата

### Назначение

Вывести **Grove Pulse** на **production VPS** в соответствии с **Definition of Done** из [`development-plan-v1.md`](./development-plan-v1.md) §1: приложение **развёрнуто на prod**, доступ по **HTTPS** с публичного IP (или домена). Зафиксировать **операционные процедуры** в [`runbook.md`](./runbook.md), включить **еженедельный бэкап БД**, **безопасные секреты**, **nginx** как единую точку входа, и **регрессионный контур** (CI + короткий ручной чеклист перед выкладкой). **Новой бизнес-логики и экранов в этой фазе нет** — только инфраструктура, конфигурация, документация и качество релиза.

### Входные условия

- Фазы **1–9** выполнены: функциональность MVP доступна локально (Compose) и покрыта тестами в объёме, зафиксированном в фазах.
- Репозиторий с **`apps/api`**, **`apps/web`**, **`infra/`** (или эквивалент по фазе 1); **Alembic**-миграции поднимают схему БД.
- Доступ владельца к **VPS** по SSH; параметры из [`development-plan-v1.md`](./development-plan-v1.md) §3 (**2 vCPU, 2 GB RAM**; публичный IP — плейсхолдер **`<PROD_VPS_IP>`** в репозитории; фактическое значение вне git).

### Границы фазы (явно вне scope)

- Новые фичи продукта, изменение API/схемы БД **без** отдельной задачи и миграций.
- Полноценный **APM**, **Kubernetes**, **managed PostgreSQL** — не обязательны в v1.
- **Почтовые алерты**, PagerDuty, внешнее хранилище бэкапов (S3 и т.д.) — **опционально**; минимум v1 — локальный дамп на диске VPS + ретенция в runbook.
- Формальная **приёмка владельцем бизнеса** как блокер релиза — **не** входит в DoD ([`development-plan-v1.md`](./development-plan-v1.md) §1).

### Нормативные ссылки

| Тема | Документ |
|------|----------|
| DoD, VPS, секреты, тесты, регрессия | [`development-plan-v1.md`](./development-plan-v1.md) §1, §3, §7 |
| HTTPS, NFR, заголовки безопасности | [`dev-handoff-spec.md`](./dev-handoff-spec.md) §10 (**NFR-06**, **NFR-07**), §8 |
| Архитектура prod (nginx, Compose) | [`architecture-draft.md`](./architecture-draft.md) §3, §7–§9 |
| Бэкап: время, cron UTC | [`dev-handoff-spec.md`](./dev-handoff-spec.md) §13; [`architecture-draft.md`](./architecture-draft.md) §9 |
| Скелет операций (дополнить фактом) | [`runbook.md`](./runbook.md) |
| Критерии смоука после выката | [`dev-handoff-spec.md`](./dev-handoff-spec.md) §11 (**A1–A10** — выборочно для релиза) |

---

### Целевая топология production

Согласованно с [`architecture-draft.md`](./architecture-draft.md) §3 и диаграммой:

```text
Браузер --HTTPS--> nginx (TLS, статика SPA, proxy /api)
                      |--> API (FastAPI, без dev --reload)
                      |--> (опционально) только внутренняя сеть до PostgreSQL
PostgreSQL — контейнер или установка на хосте; порт **5432 не публиковать** в интернет.
```

**Рекомендация v1:** **Docker Compose** на VPS (как dev, отдельный файл **`docker-compose.prod.yml`** в корне или в **`infra/`** — зафиксировать один путь в README и runbook): сервисы **`db`**, **`api`**, **`web`** (или **только сборка статики** и раздача через nginx с хоста — допустимо, если задокументировано). **nginx** может быть **контейнер** с примонтированными **`ssl`**, **`nginx.conf`** и **`dist`**, либо **nginx на хосте** — выбрать один вариант и описать в runbook.

---

### Сборка артефактов

| Компонент | Норматив |
|-----------|----------|
| **Фронт** | **`pnpm install`** (frozen lockfile в CI) → **`pnpm build`** (Vite) → каталог **`dist/`** (или `apps/web/dist`). В nginx **`root`** указывает на эту статику. |
| **API** | Production-**Dockerfile** (мультиэтапный допустим): **без** `--reload`; точка входа **`uvicorn`** или **`gunicorn`** с **uvicorn workers** ([`dev-handoff-spec.md`](./dev-handoff-spec.md) стек). При **2 GB RAM** на VPS: **1–2** worker-а процесса API, мониторинг OOM; при необходимости только **1** worker в v1. |
| **Образы** | Версионирование тегами (**`git rev-parse --short HEAD`** или semver); на сервере хранить **последний рабочий** тег для отката. |

**Переменные сборки:** не вшивать секреты в образ; только **`ARG`** для версии, без паролей.

---

### nginx (норматив минимума)

1. **`listen 443 ssl`**; редирект **`http` → `https`** (порт 80 → 301 на HTTPS), кроме времени отладки (не оставлять открытым без причины).
2. **`server_name`:** IP или домен — как в фактическом URL prod ([`development-plan-v1.md`](./development-plan-v1.md) §3).
3. **Статика SPA:** `root` на `dist`; **`location /`** — `try_files $uri $uri/ /index.html` для client-side routing.
4. **`location /api/`** (или `/api` с учётом slash): **`proxy_pass`** на upstream API (например `http://api:8000` в сети Compose); заголовки **`Host`**, **`X-Real-IP`**, **`X-Forwarded-For`**, **`X-Forwarded-Proto $scheme`** — чтобы приложение знало схему **https** для cookie **`Secure`** при необходимости.
5. **Таймауты** proxy адекватны для тяжёлых отчётов (например **60 s** read — по наблюдению NFR-03).
6. **gzip** для `text/*`, `application/javascript`, `application/json` — по желанию.
7. **Заголовки безопасности (baseline):** минимум **`X-Content-Type-Options: nosniff`**; **`X-Frame-Options: DENY`** или **`SAMEORIGIN`**; **`Referrer-Policy: strict-origin-when-cross-origin`**. **HSTS** — если стабильный HTTPS и нет смешанного контента ([`dev-handoff-spec.md`](./dev-handoff-spec.md) NFR-06 «по возможности»): например `Strict-Transport-Security: max-age=31536000; includeSubDomains` **только** при осознанном решении (ошибка на самоподписанном cert при первом визите — учесть).

**TLS-сертификат:** варианты из [`runbook.md`](./runbook.md) §3 и [`development-plan-v1.md`](./development-plan-v1.md) §3: **самоподписанный** (импорт CA на устройствах команды), **коммерческий на IP**, либо **домен + Let’s Encrypt**. **Выбранный способ**, пути к **`fullchain`** / **`privkey`**, команды обновления — **обязательно заполнить в runbook** в рамках этой фазы.

---

### Переменные окружения production

Расширить **`.env.example`** в репозитории всеми ключами, нужными prod (без значений секретов). На сервере — файл **`.env`** или механизм секретов хоста — **вне git**.

| Группа | Ключи (минимум) |
|--------|------------------|
| БД | **`POSTGRES_*`**, **`DATABASE_URL`** (async) и при необходимости **`DATABASE_URL_SYNC`** для Alembic |
| Приложение | **`ENVIRONMENT=production`** — для включения **`Secure`** на cookie (см. фазу 3 этого документа); **`CORS_ORIGINS`** = **`https://<prod-host>`** (один или несколько через запятую) |
| Cookie | **`COOKIE_SECURE=true`** явно, если не полагаться только на **`ENVIRONMENT`** |
| Сид (только первый выкат) | Пароли сидов через env, как фаза 2; после стабилизации — **смена паролей** ([`development-plan-v1.md`](./development-plan-v1.md) §3.1, §5) |

**Секреты:** пароли БД, любые ключи подписи — **никогда** в git. Проверка: **`git log` / `.gitignore`** не содержит утечек.

---

### Порядок первого выката и миграций

1. Поднять **PostgreSQL** (пустой том или новый инстанс).
2. **`alembic upgrade head`** (из контейнера **`api`** или CI-шаг перед стартом) — **до** приёма трафика.
3. **Сид:** по решению владельца — однократно **`python -m gp_api.seed`** (или эквивалент фазы 2) **или** ручная вставка админа; зафиксировать в runbook.
4. Запустить **API** и **nginx** со статикой; проверить **`GET /api/health`** и открытие SPA.
5. Смоук **логин** всеми ролями (учётки из плана развёртывания, **не** дефолтные пароли в проде после hardening).

**Повторные выкаты:** миграции вперёд обязательны; **downgrade** на prod — только по явной процедуре отката в runbook и с пониманием потери данных.

---

### Резервное копирование (норматив)

- **Расписание:** **`pg_dump` раз в неделю**, **воскресенье 18:00 UTC** — cron: **`0 18 * * 0`** при TZ cron = **UTC** ([`dev-handoff-spec.md`](./dev-handoff-spec.md) §13).
- **Формат:** **`pg_dump -Fc`** (custom) или сжатый plain — один стиль в runbook; имя файла с датой, например **`grove-pulse_2026-03-30.dump`**.
- **Каталог на VPS:** например **`/var/backups/grove-pulse/`**; права **только** для пользователя, выполняющего дамп (не world-readable).
- **Ретенция:** минимум **8** последних недельных файлов или иное число — **записать в runbook**; старые удалять **`find`** + **`mtime`** или ротация скриптом.
- **Проверка восстановления:** **один** успешный пробный прогон на чистой БД или локально из копии дампа — **критерий готовности фазы 10**; шаги **`pg_restore`/`createdb`** — в runbook §4.

**Не** хранить дампы только в контейнере без тома — при пересоздании контейнера они пропадут; использовать **named volume** или каталог хоста.

---

### Деплой и откат (содержимое runbook)

В [`runbook.md`](./runbook.md) §5 после выполнения фазы должны быть **конкретные команды**, а не плейсхолдеры:

| Раздел | Содержание |
|--------|------------|
| **Деплой** | `git pull` / CI artifact; `docker compose -f docker-compose.prod.yml build`; `up -d`; миграции; smoke |
| **Откат приложения** | Переключение тега образа на предыдущий + `up -d`; **без** автоматического отката БД, если миграция уже применена |
| **Откат миграции** | Только если есть безопасный `alembic downgrade` и согласование с владельцем |

---

### Очистка демо-данных и пароли после запуска

По [`runbook.md`](./runbook.md) §6 и [`development-plan-v1.md`](./development-plan-v1.md) §5–§6:

- Заменить **сид-пароли** на стойкие; удалить или обнулить **синтетические недели**, если перешли к реальному вводу (SQL или админ-скрипт — описать в runbook).
- Не оставлять в проде логины/пароли из черновика плана в открытом виде.

---

### CI и качество перед релизом

| Элемент | Норматив |
|---------|----------|
| **CI** | В **GitHub Actions** (или аналог): на **`push`** в основную ветку — **API:** `ruff`/`pytest` при наличии; **web:** `pnpm install --frozen-lockfile`, `lint`, `test`, `build`. Падение CI = **блокер** merge в релизную ветку (политика команды). |
| **Перед выкладкой на prod** | Полный прогон CI + **короткий ручной чеклист** ([`development-plan-v1.md`](./development-plan-v1.md) §7): логин, один сценарий ввода, дашборд, один отчёт, **`site_manager`** на офлайн. |
| **NFR** | **NFR-02/NFR-03** — ориентиры; формальная замерка каждого релиза не обязательна ([`development-plan-v1.md`](./development-plan-v1.md) §7), но перед «крупным» релизом — **Lighthouse** / просмотр логов p95 по возможности. |

Обновить **корневой README** и **AGENTS.md** §3.1: если появилась единая команда **`pnpm verify`** / **`make ci`** — указать её одной строкой.

---

### Мониторинг и инциденты (минимум v1)

- **Доступность:** периодическая проверка **`GET /api/health`** (внешний uptime-робот опционально).
- **Диск:** место под БД и бэкапы; алерт вручную по расписанию владельца.
- **Логи:** `docker compose logs` / `journalctl` для nginx — процедура «куда смотреть при 502» в runbook.
- **Перезапуск:** `docker compose restart api` (или весь стек) — задокументировать.

---

### Тесты и проверки (обязательный минимум фазы 10)

1. **CI** на репозитории выполняется зелёным на коммите, помеченном как кандидат в prod.
2. **Smoke на prod:** HTTPS открывается без критичных ошибок сертификата для **целевой** аудитории (или принято предупреждение при самоподписанном); **`/api/health`** = **200**; логин **owner** и **marketer**; **site_manager** — офлайн-ввод или редирект согласно роли.
3. **Бэкап:** после настройки cron — проверить наличие файла дампа после первого окна **вс 18:00 UTC** или выполнить **ручной** `pg_dump` по той же команде, что в cron.
4. **Восстановление:** выполнена **одна** успешная проверка восстановления по runbook.

---

### Чеклист приёмки фазы 10

- [ ] Приложение доступно по **HTTPS** согласно выбранной схеме TLS; **CORS** и **cookie Secure** соответствуют prod URL.
- [ ] **nginx** отдаёт SPA и проксирует **`/api`**; нет открытого PostgreSQL в интернет.
- [ ] **Миграции** применены; первый выкат и сиды/пароли согласованы с runbook.
- [ ] **Cron** `pg_dump` **вс 18:00 UTC**; ретенция и путь к дампам описаны; пробное **восстановление** выполнено.
- [ ] **[`runbook.md`](./runbook.md)** заполнен: TLS, env, деплой, откат, бэкап, восстановление, очистка демо-данных.
- [ ] Секреты **не** в git; **`.env.example`** актуален.
- [ ] CI зелёный; перед выкладкой пройден ручной смоук; при необходимости обновлены **README** / **AGENTS.md** с командой проверок.

### Риски и заметки агенту

- **Let’s Encrypt на голый IP** часто недоступен — не обещать LE до появления домена ([`development-plan-v1.md`](./development-plan-v1.md) §3).
- **2 GB RAM:** тяжёлые параллельные сборки на самом VPS могут упереться в память; собирать образы в **CI** и пушить в registry **или** собирать локально и переносить артефакт — предпочтительно.
- **Самоподписанный TLS:** пользователи должны понимать предупреждение браузера или импортировать доверенный корень.
- Прод-**IP/домен** не дублировать в git; см. [`development-plan-v1.md`](./development-plan-v1.md) §3.1 и [`runbook.md`](./runbook.md).

### Исходные подшаги (сводка для Issues)

1. **`docker-compose.prod.yml`** (или эквивалент) + production **Dockerfile** API без reload.
2. **nginx** конфиг в **`infra/`**, TLS, статика, proxy `/api`.
3. Заполнение **`.env.example`** prod-ключами; шаблон для сервера в runbook.
4. Скрипт или **cron** для **`pg_dump`** + ретенция; документ **восстановления**.
5. GitHub Actions (или аналог) — lint, test, build.
6. Первый деплой на VPS, смоук, дополнение **runbook** фактическими командами.
7. Проверка бэкапа и restore; чеклист приёмки фазы 10.

---

## История изменений

| Версия | Дата | Изменения |
|--------|------|-----------|
| 0.1 | 2026-03-31 | Каркас: 10 фаз с целями, критериями и подшагами |
| 0.2 | 2026-03-31 | Фаза 1: полная спецификация для агента (дерево, Compose, health, env, тесты, чеклист); фазы 2–10 помечены «проработка ожидает»; правило: код после проработки всех фаз |
| 0.3 | 2026-03-31 | Фаза 2: DDL-уровень (enum, таблицы, FK, UNIQUE, CHECK), Alembic, сиды, 8 недель синтетики, пароли через env, тесты миграции/сида, чеклист |
| 0.4 | 2026-03-31 | Фаза 3: login/logout/me, cookie gp_session, SHA-256 hash, sliding 14d, CORS, JSON-контракты, зависимости FastAPI, тесты, чеклист |
| 0.7 | 2026-03-31 | Фаза 7: полная спецификация (стек, структура, HTTP/cookie, Query, маршруты, роли, layout, логин, тесты, чеклист); версия документа 0.7; таблица статусов: фазы 6–7 готовы, 8–10 ожидают |
| 0.8 | 2026-03-31 | Фаза 9: полная спецификация дашборда и drill-down (summary/series, период и anchor, маппинг блоков и topic API, шесть отчётов, Recharts, тесты, чеклист); версия 0.8; в таблице статусов фазы 8–9 отмечены готовыми к исполнению |
| 1.0 | 2026-03-31 | Фаза 10: полная спецификация production (топология, сборка, nginx/TLS, env, миграции, бэкап/restore, деплой/откат, CI, смоук, runbook); версия документа **1.0** — все 10 фаз детально готовы; обновлено введение и строка таблицы для фазы 10 |
| 1.0.1 | 2026-04-01 | Сводная таблица и § фаз **1–5**: отмечена **реализация кода**; чеклисты приёмки 1–5 — `[x]`; правило синхронизации таблицы + § + чеклист; фаза 5: пункт тестов про **422** при не-понедельнике в пути |
| 1.0.2 | 2026-04-01 | Фаза **6**: реализация кода — `GET /api/dashboard/summary`, `GET /api/reports/{topic}/series`; сводная таблица, **Статус реализации** §6, чеклист приёмки — `[x]`; тесты `tests/test_phase6_dashboard.py` |
| 1.0.3 | 2026-04-01 | Фаза **7**: оболочка фронта (`apps/web`) — Router, Query, Tailwind, `/login`, `GET /api/auth/me`, меню по ролям, заглушки маршрутов, Vitest; сводная таблица, §7, чеклист; `VITE_API_PROXY_TARGET` в Compose для сервиса `web` |
| 1.0.4 | 2026-04-01 | Фаза **8**: формы `/entry/week` и `/entry/offline` (GET/PUT submissions, подсказки data-map, 422/403/401, производные офлайн, sticky «Сохранить неделю»); тесты Vitest; сводная таблица, §8, чеклист |
| 1.0.5 | 2026-04-01 | Фаза **9**: дашборд (`GET /api/dashboard/summary`), 6 отчётов + Recharts (`GET /api/reports/.../series`), маппинг блок→маршрут→topic API; `apps/web/README.md` для запуска в браузере; сводная таблица, §9, чеклист; тесты Vitest |
| 1.0.6 | 2026-04-07 | Расширение UI `/dashboard` для `rolling_4w`: секции Сайт (stacked каналы), Ozon, Возвраты, матрица карт 2×2 из series, быстрые ссылки; хук `useDashboardRollingSeries`; контейнер `max-w-7xl`, скелеты при загрузке сводки |
| 1.0.7 | 2026-04-08 | Аудит перед handoff: сводная таблица (фазы 1–9 **Выполнено**, фаза 10 **не начата**), строки **Статус реализации** в §1–§10 и чеклисты приёмки согласованы; незакрытые `- [ ]` только в чеклисте фазы 10. Входные условия фазы 1: уточнение про **Node 22** в CI |
| 1.0.8 | 2026-04-08 | Прод-IP в документах заменён на плейсхолдер **`<PROD_VPS_IP>`**; выровнены [`development-plan-v1.md`](./development-plan-v1.md), [`runbook.md`](./runbook.md), §10 фазы |
