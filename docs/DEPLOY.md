# Публікація WebFin на Vercel

## Що потрібно один раз

1. Акаунт Vercel (вхід через GitHub — тоді репозиторій `webfin` видно одразу).
2. Вхід у CLI: `vercel login` → підтвердити код у браузері.

## Змінні оточення на Vercel

Ті самі значення, що в локальному `.env.local` — **окрім домену WayForPay**.
У git вони не потрапляють ніколи; на Vercel живуть у Settings → Environment Variables.

| Змінна | Звідки | Примітка |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` | та сама база, що локально |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.local` | публічний ключ, безпечний для браузера |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env.local` | ⚠️ секрет, лише сервер |
| `TOKEN_ENCRYPTION_KEY` | `.env.local` | ⚠️ має збігатися з локальним, інакше вже збережені токени Monobank не розшифруються |
| `WAYFORPAY_MERCHANT_ACCOUNT` | `.env.local` | тестовий `test_merch_n1` |
| `WAYFORPAY_SECRET_KEY` | `.env.local` | ⚠️ секрет |
| `WAYFORPAY_DOMAIN` | **не задавати** | у продакшні береться з `VERCEL_URL` автоматично |

`SUPABASE_ACCESS_TOKEN` і `SUPABASE_PROJECT_REF` потрібні лише локальним
скриптам (`run-sql.mjs`, `set-premium.mjs`) — на Vercel їх не додаємо.

## Публікація

```bash
vercel link          # привʼязати папку до проєкту Vercel (один раз)
vercel --prod        # опублікувати
```

**Поточна адреса:** https://webfin-yana-s-kyc.vercel.app

Vercel за замовчуванням закриває новий проєкт своїм входом (SSO). Щоб сайт
бачили всі: `vercel project protection disable --sso`.

### Автопублікація при git push

Поки НЕ увімкнена: привʼязка репозиторію впала з помилкою «You need to add a
Login Connection to your GitHub account first». Щоб увімкнути — у Vercel:
Settings → Login Connections → додати GitHub, потім Settings → Git → Connect
репозиторій `yanysikys-dotcom/webfin`. До того кожна публікація — вручну
командою `vercel --prod`.

## Після першої публікації

- Перевірити вхід/реєстрацію на бойовому домені.
- Перевірити, що віджет WayForPay відкривається (підпис залежить від домену).
- ⚠️ Сайт стає публічним: будь-хто може зареєструватися. Щоб закрити доступ —
  Vercel → Settings → Deployment Protection, або вимкнути реєстрацію в коді.

## Відновлення пароля

Працює через вбудовану пошту Supabase (власний SMTP не налаштований).

- Сторінки: `/forgot-password` (ввести пошту) і `/reset-password` (новий пароль).
- У Supabase мають бути правильні `site_url` та `uri_allow_list` — інакше лист
  приведе не туди. Зараз: `https://webfin-yana-s-kyc.vercel.app` і
  дозволені `…vercel.app/**` та `http://localhost:3000/**`.
- Посилання з листа діє **1 годину**.
- ⚠️ Безкоштовна пошта Supabase має жорсткий ліміт (кілька листів на годину).
  Для реальних користувачів треба свій SMTP: Supabase → Authentication →
  Emails → SMTP Settings.

## Якщо база «заснула»

Безкоштовний Supabase призупиняє проєкт після тижня без активності
(помилка `ENOTFOUND ...supabase.co`). Дані зберігаються — розбудити кнопкою
**Restore** на supabase.com.
