# Визуальные правила UI — Grove Pulse

**Версия:** 1.0  
**Дата:** 2026-04-01  
**Статус:** действует для v1; источник правды по токенам — [`apps/web/src/index.css`](../../apps/web/src/index.css)  
**Связанные документы:** [`ui-copy-guidelines.md`](./ui-copy-guidelines.md), [`dev-handoff-spec.md`](../development%20docs/dev-handoff-spec.md), [`backlog-ui-polish-seed-review.md`](./backlog-ui-polish-seed-review.md)

---

## 1. Направление и стек

- **Визуальный язык:** минималистичная **операционная оболочка** (ERP-подобный каркас): предсказуемая навигация, карточки с чёткой иерархией KPI, без «стартапового» декора и без **Material UI / MUI**.
- **Фронт:** **Vite** + **React** + **TypeScript**; стили — **Tailwind CSS v4** с темой в духе **shadcn / Tweakcn**: семантические токены в **OKLCH** и CSS variables (`:root`, опционально `.dark` на предке).
- **Компоненты:** примитивы на **Radix UI** в [`apps/web/src/components/ui/`](../../apps/web/src/components/ui/); иконки — **lucide-react**; календарь — **react-day-picker** + **dayjs** (локаль `ru` в [`apps/web/src/main.tsx`](../../apps/web/src/main.tsx)).
- **Оболочка приложения:** [`GroveTemplateShell.tsx`](../../apps/web/src/components/layout/GroveTemplateShell.tsx) и связанные layout-компоненты (сайдбар, шапка, мобильное меню).
- **Графики:** **Recharts**; цвета серий — токены **`--chart-1` … `--chart-5`** из темы (см. §4). Блок «Динамика за период» на дашборде: [`DashboardTrendSection.tsx`](../../apps/web/src/components/dashboard/DashboardTrendSection.tsx) + [`DashboardTrendChartCard.tsx`](../../apps/web/src/components/dashboard/DashboardTrendChartCard.tsx); drill-down отчёты — те же принципы.

---

## 2. Тема и токены

- **Файл темы:** [`apps/web/src/index.css`](../../apps/web/src/index.css): `@import "tailwindcss"`, **`@custom-variant dark`**, блоки **`:root`**, **`.dark`**, **`@theme inline`**, **`@layer base`**, утилитарные классы форм (`.gp-input` и т.д.).
- **Светлая тема по умолчанию.** Тёмная: класс **`.dark`** на корневом элементе (например `<html class="dark">`); в v1 переключатель темы не обязателен, но переменные уже заданы для согласованности с экспортом Tweakcn.
- **Дополнительно к палитре Tweakcn:** токены **`success`**, **`success-foreground`**, **`success-muted`** — для редких позитивных системных сообщений и `Alert` variant `success` (не для интерпретации Δ% KPI как «хорошо/плохо»).
- **Радиусы и тени:** `--radius` (базовый скругление), шкала `--shadow-2xs` … `--shadow-2xl`. Карточки интерфейса по умолчанию **без заметной тени** (`shadow-none`), при необходимости — лёгкая тень точечно (например экран входа).

**Маркетинговый акцент бренда** остаётся **#FACE08** (жёлто-лаймовый); в интерфейсе основной акцентный цвет задан через **`--primary`** в OKLCH и должен визуально совпадать с этим намерением. Не вводить произвольные hex в компонентах без обновления этого документа и `index.css`.

---

## 3. Типографика

- **Основной UI (sans):** **Montserrat** — подключение через **@fontsource** в [`apps/web/src/main.tsx`](../../apps/web/src/main.tsx) (веса 400–700).
- **Serif (по необходимости):** **Merriweather** — те же пакеты; в стеке задано в `--font-serif`.
- **Моноширинный:** **JetBrains Mono** (variable) — для кода, табличных идентификаторов при необходимости.
- **Цифры KPI и формы:** `tabular-nums` для ровных столбцов.
- **Иерархия:** заголовки карточек и секций — `font-semibold`, контраст к фону; подписи и метки — `text-muted-foreground`.

---

## 4. Карточки дашборда и KPI

- Карточка блока — цельная ссылка; **без** цветной полосы слева и **без** подъёма/тяжёлой тени при hover; достаточно **лёгкого усиления рамки** (`hover:border-ring/50`).
- В каждой строке KPI: **сверху** строка с подписью слева и **бейдж сравнения** справа; **крупное текущее значение**; ниже строка **«Было: …»** (см. также [`ui-copy-guidelines.md`](./ui-copy-guidelines.md) §4).
- Бейджи процента — нейтральные по смыслу «хорошо/плохо»; при необходимости — иконки тренда (lucide) без смены семантики на «зелёный рост».

---

## 5. Интерактивные состояния

- **Кнопки и ссылки:** состояния из примитивов `Button` / `Link`; **focus-visible** — кольцо `ring-ring`, видимая обводка для клавиатуры.
- **Поля ввода:** в т.ч. классы `.gp-input` — hover усиливает рамку к `ring`, focus — `ring` + `border-ring`.
- **Навигация (сайдбар):** активный пункт — фон/текст через токены sidebar (`--sidebar-primary`, `--sidebar-accent` и т.д.) в разметке шелла.

---

## 6. Дискретные отсылки к домену

**Принцип:** маленькие штрихи, без перегруза (см. [`ui-copy-guidelines.md`](./ui-copy-guidelines.md)).

- Декоративные градиенты и плашки — уместны на **логине** и в empty state, не на каждой форме.
- Название продукта **Grove Pulse** — нейтральный якорь.

---

## 7. Для агентов Cursor

- Не добавлять **MUI**, **Emotion-тему** или пути к несуществующим `theme/groveTheme.ts` / `mui-dashboard`.
- Новые экраны — **компоненты из `components/ui`** + Tailwind с **семантическими** классами (`bg-card`, `text-muted-foreground`, `border-border`, …), не сырые hex.
- При смене палитры или радиусов — править **`index.css`** и этот файл; при смене копирайта KPI/% — **`ui-copy-guidelines.md`**.

---

## 8. История изменений

| Версия | Дата | Изменения |
|--------|------|-----------|
| 0.1 | 2026-04-01 | Первый выпуск (исторический): ориентир MUI + Tailwind |
| 0.2 | 2026-04-01 | Шаблон MUI Dashboard, MUI X (архивная ветка документа) |
| 0.3 | 2026-04-01 | Уточнения дашборда под MUI (архивная ветка) |
| 1.0 | 2026-04-01 | Полная замена: Vite, Tailwind v4 + Tweakcn-токены, Radix, шрифты Montserrat / Merriweather / JetBrains Mono, Recharts, без MUI; актуальные пути к коду |
