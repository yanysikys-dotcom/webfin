# WebFin — аналітика витрат

Веб-платформа фінансової аналітики: транзакції з Monobank, дашборд із
графіками, преміум через WayForPay і AI-помічник.

- Специфікація: `docs/superpowers/specs/2026-07-15-webfin-design.md`
- Стек: Next.js + TypeScript + Tailwind, Supabase (Postgres + Auth)

## Запуск

1. Потрібен файл `.env.local` з ключами Supabase (див. специфікацію).
2. `npm install`
3. `npm run dev` → http://localhost:3000

## Команди

- `npm run dev` — дев-сервер
- `npm run build` — продакшн-збірка
- `npm test` — юніт-тести
- `node scripts/check-supabase.mjs` — перевірка доступу до Supabase
- `node scripts/run-sql.mjs <файл.sql>` — виконати SQL у базі проєкту

## Статус

Етап 1 «Каркас» готовий: реєстрація/вхід, сайдбар, захищені сторінки.
Далі — Етап 2 «Дані й дашборд».
