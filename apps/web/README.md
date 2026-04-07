# Grove Pulse — фронтенд (`apps/web`)

Vite + React + TypeScript + TanStack Query + **Tailwind CSS v4** (тема Tweakcn/shadcn: OKLCH, `:root` / `.dark`, `@theme inline` в `src/index.css`) + **Radix UI** примитивы + **lucide-react** + **react-day-picker** + **dayjs** (локаль `ru` в `main.tsx`) + **Recharts** (графики). Шрифты: **Montserrat**, **Merriweather**, **JetBrains Mono** через пакеты `@fontsource/*` в `main.tsx` (аналог подключения `next/font` в Next.js). Оболочка: `src/components/layout/GroveTemplateShell.tsx`. Норматив — [`docs/product docs/ui-visual-guidelines.md`](../../docs/product%20docs/ui-visual-guidelines.md).

## Открыть продукт в браузере (локально)

Нужны **PostgreSQL с миграциями и сидами** и запущенный **API** на порту **8000**.

### 1. База и API

**Вариант A — только БД в Docker, API на хосте**

```powershell
# из корня репозитория
docker compose up -d db
```

Скопируйте `.env.example` в `.env` и задайте `DATABASE_URL_SYNC` на `127.0.0.1:5432` (логин/пароль как в Compose). Затем из `apps/api`:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\activate
pip install -e ".[dev]"
alembic upgrade head
$env:ALLOW_INSECURE_SEED_DEFAULTS="1"
python -m gp_api.seed
uvicorn gp_api.main:app --reload --host 127.0.0.1 --port 8000
```

**Вариант B — полный `docker compose up`**  
Тогда фронт в контейнере смотрит на API через `VITE_API_PROXY_TARGET=http://api:8000`. На хосте откройте **http://localhost:5174/login** (или значение `WEB_HOST_PORT` из `.env`; по умолчанию не **5173**, чтобы не конфликтовать с другим проектом на хосте).

### 2. Фронт на хосте (рядом с API на 8000)

```powershell
cd apps\web
pnpm install
pnpm dev
```

Откройте в браузере: **http://localhost:5173**  
Прокси `/api` по умолчанию идёт на **http://127.0.0.1:8000** (см. `vite.config.ts`). Если API в Docker на другом порту — задайте `VITE_API_PROXY_TARGET`.

### 3. Вход

После сида с `ALLOW_INSECURE_SEED_DEFAULTS=1` можно войти, например:

- **Владелец:** `admin` / `admin_password` — дашборд и отчёты.
- **Маркетолог:** `marketing` / `marketing_password` — дашборд, отчёты, ввод за неделю.
- **Руководитель точки:** `manager` / `manager_password` — только ввод по точке.

## Скрипты

- `pnpm dev` — dev-сервер.
- `pnpm build` — production-сборка.
- `pnpm test` — Vitest.

## Поведение дашборда (фаза 9)

- Сводка: `GET /api/dashboard/summary?period=&anchor=`.
- Недели в селекте: `GET /api/weeks/selectable` + понедельники из `GET /api/reports/site/series` за длинный интервал.
- Отчёты: `GET /api/reports/{topic}/series?from=&to=` (`maps-2gis`, `maps-yandex` — с дефисом в URL API).
