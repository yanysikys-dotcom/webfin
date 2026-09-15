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

Етап 2 «Дані й дашборд» готовий: демо-дані, підключення Monobank,
дашборд із графіками, транзакції з пошуком і фільтром.
Далі — Етап 3 «Преміум (WayForPay)».

## Якщо база «заснула»

Безкоштовний Supabase призупиняє проєкт після тижня без активності
(помилка `ENOTFOUND ...supabase.co`). Дані зберігаються — проєкт треба
розбудити кнопкою **Restore** на supabase.com або через Management API.
