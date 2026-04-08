# Grove Pulse

Закрытое веб-приложение для еженедельного ручного ввода метрик и дашбордов (владелец, маркетолог, руководители точек). Монорепозиторий: `apps/api` (FastAPI), `apps/web` (Vite + React + TypeScript), локальная БД в Docker Compose.

## Требования

- **Docker Desktop** (или Docker Engine + Compose v2)
- Для правок фронта/бэка на хосте (без контейнеров): **Node.js 20+**, **pnpm** (`corepack enable` или `npm i -g pnpm`), **Python 3.12+**. В **GitHub Actions** для фронта используется **Node 22** (см. `.github/workflows/ci.yml`).

## Быстро открыть UI в браузере

Из корня репозитория (Docker Desktop должен быть **запущен**):

```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-dev-ui.ps1
```

Скрипт выполнит `docker compose up -d db api web` и откроет **http://localhost:5174/login** (порт из `WEB_HOST_PORT` в `.env`).

Если страница «не открывается»: чаще всего **не запущен Docker** или контейнеры остановлены — выполните `docker compose up -d` и снова откройте **http://localhost:5174/login**. В `.env` в `CORS_ORIGINS` должны быть и `localhost`, и `127.0.0.1` для этого порта (см. `.env.example`). Раньше порт был привязан только к `127.0.0.1`, из‑за чего **`localhost` (IPv6)** мог висеть минутами — в `docker-compose.yml` это исправлено.

1. Поднимите **PostgreSQL** и выполните **миграции + сид** (см. блок ниже или подробно [`apps/web/README.md`](apps/web/README.md) и [`apps/api/README.md`](apps/api/README.md)).
2. Запустите **API** на `http://127.0.0.1:8000` и фронт: из `apps/web` — `pnpm install` и `pnpm dev` (по умолчанию **http://localhost:5173**).
3. Откройте UI и войдите (например `admin` / `admin_password` при `ALLOW_INSECURE_SEED_DEFAULTS=1` в сиде). В `CORS_ORIGINS` должен быть origin вашего фронта (см. `.env.example`).

## Запуск через Docker Compose

1. Скопируйте переменные окружения и при необходимости смените пароль:

   ```bash
   cp .env.example .env
   ```

   Убедитесь, что логин, пароль и имя БД в `DATABASE_URL` совпадают с `POSTGRES_*`.

2. Поднимите сервисы:

   ```bash
   docker compose up --build
   ```

3. **Схема БД и сиды (фаза 2):** один раз примените миграции и сиды в контейнере API (пароли сидов — через env, см. `.env.example`; для локальной разработки можно `ALLOW_INSECURE_SEED_DEFAULTS=1`):

   ```bash
   docker compose exec api alembic upgrade head
   docker compose exec api python -m gp_api.seed
   ```

4. Откройте в браузере:

   - Фронт (страница входа): **http://localhost:5174/login** (или `127.0.0.1`) при `WEB_HOST_PORT` по умолчанию. В `CORS_ORIGINS` должны быть оба origin (см. `.env.example`). SPA **Grove Pulse** (логин, оболочка, формы **`/entry/week`** и **`/entry/offline`**, дашборд и отчёты)
   - Если открыть **http://localhost:5173**, может открыться **другой** локальный Vite на хосте — тогда вы не увидите этот проект.
   - После правок фронта в Docker на Windows: `docker compose restart web` (или `pnpm dev` на хосте для быстрого HMR). По умолчанию **polling отключён** (`CHOKIDAR_USEPOLLING=false`), иначе на Windows ответы Vite могут занимать **10–20+ с** из‑за нагрузки на I/O; если нужен hot-reload из контейнера — поставьте `CHOKIDAR_USEPOLLING=true` в `docker-compose.yml` и смиритесь с тормозами или перенесите проект в WSL2.
   - Если по-прежнему открывается **старая** страница логина (нет текста «Нужен доступ?» и ссылки «Как получить вход»):  
     1) Убедитесь, что `docker compose` запускается **из корня этого репозитория** (там же, где лежит папка `apps/web` с актуальными файлами в Cursor).  
     2) Проверьте, что **внутри контейнера** тот же текст:  
        `docker compose exec web sh -c "grep -c Нужен доступ /app/src/pages/LoginPage.tsx"` — должно вывести число **больше 0** (если контейнер не запущен: `docker compose run --rm web sh -c "grep -c Нужен доступ /app/src/pages/LoginPage.tsx"`). Если **0** — Compose смотрит на **другую** копию `apps/web` на диске.  
     3) **Новые npm-зависимости во фронте:** том `web_node_modules` не совпадает с хостовым `node_modules`. При `docker compose up` сервис `web` сам запускает `pnpm install`, если изменился `pnpm-lock.yaml` (см. `docker-compose.yml`). Если Vite всё равно ругается на отсутствующий пакет:  
        `docker compose exec web pnpm install --frozen-lockfile`  
        затем `docker compose restart web`.  
     4) Сбросьте том с `node_modules` фронта и поднимите заново (если нужно «с нуля»):  
        `docker compose stop web`  
        `docker volume rm forest-industry_web_node_modules`  
        (имя тома посмотрите: `docker volume ls | findstr web_node` — префикс совпадает с именем каталога проекта.)  
        Затем `docker compose up --build web`.
   - API: [http://localhost:8000/api/health](http://localhost:8000/api/health) — JSON `{"status":"ok","service":"grove-pulse-api"}`

   Запросы с фронта на `/api` проксируются в контейнер API (см. `apps/web/vite.config.ts`).

Порт **5432** проброшен на хост, чтобы с машины разработчика можно было гонять `pytest` и `alembic` с `localhost` (если порт занят локальным PostgreSQL — измените маппинг в `docker-compose.yml`).

**Важно:** в `docker-compose.yml` сервис **`api`** получает `DATABASE_URL` / `DATABASE_URL_SYNC` с хостом **`db`**, а не из строк `.env` с подстановкой `${DATABASE_URL_SYNC}`: иначе переменная **`DATABASE_URL_SYNC` в окружении Windows** (часто `127.0.0.1` для pytest) перезапишет значение при `docker compose up`, и логин в UI даст **500** (отказ подключения к БД).

Остановка: `docker compose down`. Сброс данных PostgreSQL: `docker compose down -v` (удалит именованный volume с БД).

**Windows:** если hot-reload через bind-mount ведёт себя нестабильно, запускайте `api` и/или `web` локально по инструкциям в `apps/api/README.md` и `apps/web/package.json`, а в Compose оставьте только `db`.

## Проверки (локально)

- **Стек в Docker уже поднят** (db, api, web): из корня репозитория выполните  
  `powershell -ExecutionPolicy Bypass -File scripts/verify-dev-stack.ps1`  
  — проверит health API, прокси `/api` на **5174** и что в контейнер смонтирован актуальный `LoginPage.tsx`.
- API (из каталога `apps/api`): `python -m pip install -e ".[dev]"`, затем `python -m pytest`, `python -m ruff check src tests`. Интеграционные тесты БД нуждаются в запущенном PostgreSQL и `DATABASE_URL` с `postgresql+psycopg://` (как в `.env.example`); целевая версия Python для API — **3.12** (при нескольких установленных версиях используйте venv от 3.12).
- Web (из `apps/web`): `pnpm install`, `pnpm build`, `pnpm test` (Vitest). Прокси dev-сервера: `/api` → `VITE_API_PROXY_TARGET` или по умолчанию `http://127.0.0.1:8000`; в Docker Compose для сервиса `web` задано `http://api:8000`. **Фаза 8:** пустой **GET** marketing/offline отдаёт `null` по полям — форма показывает пустые поля до первого **PUT** (см. `apps/api` OpenAPI).

В CI: [`.github/workflows/ci.yml`](.github/workflows/ci.yml) (Python **3.12**, **Node 22** для `web`, pnpm, те же шаги).

## Документация

- **[docs/product docs/](docs/product%20docs/)** — продукт, PRD, метрики, карта данных, глоссарий.
- **[docs/development docs/](docs/development%20docs/)** — архитектура, [dev-handoff-spec](docs/development%20docs/dev-handoff-spec.md), [план v1](docs/development%20docs/development-plan-v1.md), [**10 фаз с подшагами**](docs/development%20docs/development-phases-v1.md), [runbook](docs/development%20docs/runbook.md).
- **[docs/product docs/ui-copy-guidelines.md](docs/product%20docs/ui-copy-guidelines.md)** — тексты и тон UI; **[docs/product docs/ui-visual-guidelines.md](docs/product%20docs/ui-visual-guidelines.md)** — визуальная система (Tailwind v4, тема Tweakcn/shadcn, Radix, типографика); [бэклог UI / сиды](docs/product%20docs/backlog-ui-polish-seed-review.md); [эпики после v1](docs/product%20docs/roadmap-epics-post-v1.md).

Исходная папка `research/` сведена к структуре `docs/` при подготовке репозитория.

## Для AI-агента (Cursor)

Инструкции по работе с репозиторием и обязательному прогону проверок — в **[`AGENTS.md`](AGENTS.md)**.
