# Evoverse — Game Backend API

REST API для онлайн-казино гри з реєстрацією, JWT-авторизацією, рулеткою з алгоритмом Provably Fair, гаманцем, інтеграцією Stripe та адміністративною панеллю.

Для тестування при першому запуску створіть адмін-акаунт через seed:

```bash
docker compose exec api sh && npx prisma db seed
```

API документація: http://localhost:3300/

---

## Стек

- **Runtime:** Node.js 25 + TypeScript (ESM, NodeNext)
- **Framework:** NestJS 11
- **Database:** PostgreSQL 17 + Prisma 7
- **Auth:** JWT via `@nestjs/jwt` + `passport-jwt`
- **Password hashing:** argon2
- **Payments:** Stripe (`stripe@22`, API version `2026-04-22.dahlia`)
- **Docs:** Swagger
- **Container:** Docker (multi-stage build) + Docker Compose

---

## Опис

- Реєстрація та JWT-авторизація (access + refresh токени)
- Профіль користувача: перегляд власного профілю, публічний профіль за ID
- Деактивація акаунту
- Адреса користувача: створення та оновлення
- Адмін-панель: перегляд, бан, розбан, зміна ролі, видалення, статистика платформи
- Гаманець:
  - Автоматичне створення wallet при реєстрації
  - Ручне поповнення балансу з idempotency key (безпечний ретрай)
  - Повна незмінна історія транзакцій (ledger)
  - Захист від race condition через `SELECT FOR UPDATE`
- Рулетка:
  - Створення ігрової сесії з serverHash
  - Ставки: STRAIGHT, RED, BLACK, EVEN, ODD, DOZEN
  - Списання та нарахування через wallet в одній транзакції
  - Вихід із сесії розкриває serverSeed
  - Публічна верифікація результату без БД
- Платежі (Stripe):
  - Поповнення гаманця через Stripe Payment Element
  - Створення PaymentIntent (`POST /stripe/deposit`)
  - Webhook-обробник (`POST /payments/webhook/stripe`): верифікація підпису і нарахування балансу на гаманець
  - Безпечний raw body parsing для підпису, JSON body для решти маршрутів

---

### Guards

```
Запит → JwtAccessGuard → Controller
Запит → AdminGuard (extends JwtAccessGuard) → Admin Controller
```

| Guard             | Що робить                                                           |
| ----------------- | ------------------------------------------------------------------- |
| `JwtAccessGuard`  | Перевіряє Bearer токен, повертає зрозуміле повідомлення при помилці |
| `JwtRefreshGuard` | Читає `refreshToken` з body запиту                                  |
| `AdminGuard`      | Повертає `403 Forbidden`, якщо `role !== 'ADMIN'`                   |

---

## Архітектура

```
src/
├── main.ts                              # Bootstrap: ValidationPipe, Swagger
├── app.module.ts                        # Кореневий модуль
├── prisma/
│   ├── prisma.module.ts                 # Глобальний PrismaModule
│   └── prisma.service.ts                # PrismaClient
├── auth/
│   ├── dto/login.dto.ts
│   ├── guards/
│   │   ├── jwt-access.guard.ts          # Bearer токен + людські повідомлення про помилки
│   │   ├── jwt-refresh.guard.ts
│   │   └── admin.guard.ts               # extends JwtAccessGuard + role check
│   ├── strategies/
│   │   ├── jwt-access.strategy.ts       # JwtPayload: { sub, email, role }
│   │   └── jwt-refresh.strategy.ts
│   ├── auth.controller.ts               # POST /auth/login|refresh|logout
│   ├── auth.service.ts
│   └── auth.module.ts
├── users/
│   ├── dto/
│   │   ├── create-user.dto.ts
│   │   └── update-user.dto.ts
│   ├── users.controller.ts              # POST /users, GET /users/me|:id, PATCH|DELETE /users/:id
│   ├── users.service.ts
│   └── users.module.ts
├── address/
│   ├── dto/
│   │   ├── create-address.dto.ts
│   │   └── update-address.dto.ts
│   ├── address.controller.ts            # POST|PATCH /address
│   ├── address.service.ts
│   └── address.module.ts
├── admin/
│   ├── dto/
│   │   ├── ban-user.dto.ts
│   │   ├── update-role.dto.ts
│   │   └── update-profile.dto.ts
│   ├── admin.controller.ts              # GET|PATCH|DELETE /admin/...
│   ├── admin.service.ts
│   └── admin.module.ts
├── roulette/
│   ├── dto/
│   │   ├── create-session.dto.ts
│   │   ├── place-bet.dto.ts
│   │   └── verify-game.dto.ts
│   ├── entities/
│   │   └── bet-types.ts                 # BetType enum, PAYOUT_MULTIPLIERS, RED_NUMBERS
│   ├── roulette.controller.ts           # POST /roulette/join|bet|verify, DELETE /roulette/leave/:id, GET /roulette/history
│   ├── roulette.service.ts
│   └── roulette.module.ts
├── payments/
│   ├── payments.controller.ts           # POST /payments/webhook/stripe (без JWT, Stripe-signature)
│   ├── payments.service.ts              # handlePaymentConfirmed → wallet ledger
│   ├── payments.module.ts
│   └── stripe/
│       ├── constants/
│       │   └── client.ts                # STRIPE_CLIENT injection token
│       ├── dto/
│       │   └── payment.dto.ts           # amount (монети)
│       ├── stripe.controller.ts         # POST /stripe/deposit (JWT guard)
│       ├── stripe.service.ts            # createPaymentIntent, verifyAndParseWebhook
│       └── stripe.module.ts
└── wallet/
    ├── dto/
    │   └── deposit.dto.ts               # amount, idempotencyKey (UUID v4), description?
    ├── wallet.controller.ts             # GET /wallet/me|transactions, POST /wallet/deposit
    ├── wallet.service.ts                # processTransaction із SELECT FOR UPDATE
    └── wallet.module.ts
```

---

## API

Авторизація: `Authorization: Bearer <accessToken>` у заголовку кожного захищеного запиту.

Натисніть **Authorize** у Swagger UI та вставте `accessToken` (без префіксу `Bearer`).

### Auth (`/auth`)

| Метод  | Маршрут         | Guard   | Опис                                                        |
| ------ | --------------- | ------- | ----------------------------------------------------------- |
| `POST` | `/auth/login`   | —       | Логін (`email`, `password`) → `accessToken`, `refreshToken` |
| `POST` | `/auth/refresh` | Refresh | Тіло: `{ "refreshToken": "..." }` → нові токени             |
| `POST` | `/auth/logout`  | Bearer  | Stateless — завжди повертає 200                             |

### Users (`/users`)

| Метод    | Маршрут      | Guard  | Опис                                                |
| -------- | ------------ | ------ | --------------------------------------------------- |
| `POST`   | `/users`     | —      | Реєстрація (`username?`, `email`, `password`)       |
| `GET`    | `/users/me`  | Bearer | Власний профіль з балансом, адресою                 |
| `GET`    | `/users/:id` | Bearer | Публічний профіль: username, rating, level, country |
| `PATCH`  | `/users/:id` | Bearer | Оновити username / email / password                 |
| `DELETE` | `/users/:id` | Bearer | Soft delete акаунту (`isDeleted: true`)             |

### Address (`/address`)

| Метод   | Маршрут    | Guard  | Опис                                       |
| ------- | ---------- | ------ | ------------------------------------------ |
| `POST`  | `/address` | Bearer | Створити адресу (userId береться з токена) |
| `PATCH` | `/address` | Bearer | Оновити адресу                             |

### Admin (`/admin`)

| Метод    | Маршрут                    | Guard | Опис                                                |
| -------- | -------------------------- | ----- | --------------------------------------------------- |
| `GET`    | `/admin/stats`             | Admin | Статистика: total, banned, deleted, new users       |
| `GET`    | `/admin/users`             | Admin | Список усіх користувачів з профілями                |
| `GET`    | `/admin/users/:id`         | Admin | Деталі користувача з адресою                        |
| `PATCH`  | `/admin/users/:id/ban`     | Admin | Бан (`banEndAt?` — ISO date, без нього безстроково) |
| `PATCH`  | `/admin/users/:id/unban`   | Admin | Розбан                                              |
| `PATCH`  | `/admin/users/:id/role`    | Admin | Змінити роль (`USER` / `ADMIN`)                     |
| `PATCH`  | `/admin/users/:id/profile` | Admin | Оновити rating / balance / level                    |
| `DELETE` | `/admin/users/:id`         | Admin | Soft delete акаунту                                 |

### Wallet (`/wallet`)

| Метод  | Маршрут                       | Guard  | Опис                                                                           |
| ------ | ----------------------------- | ------ | ------------------------------------------------------------------------------ |
| `GET`  | `/wallet/me`                  | Bearer | Поточний баланс + 10 останніх транзакцій                                       |
| `POST` | `/wallet/deposit`             | Bearer | Поповнення балансу. Тіло: `amount`, `idempotencyKey` (UUID v4), `description?` |
| `GET`  | `/wallet/transactions?limit=` | Bearer | Повна історія транзакцій (максимум 100)                                        |

#### Idempotency

Поле `idempotencyKey` — UUID v4, який клієнт генерує **один раз** перед запитом і повторно використовує при будь-якому ретраї. Якщо сервер вже обробив цей ключ — повертає оригінальну транзакцію зі статусом `200` без повторного нарахування.

#### Race condition

Кожна операція з балансом виконується всередині `$transaction` із `SELECT ... FOR UPDATE` на рядку гаманця. Конкурентні запити від одного користувача серіалізуються на рівні PostgreSQL — неможливі ні ситуація "обидва бачать достатній баланс", ні подвійне списання.

---

### Stripe (`/stripe`)

| Метод  | Маршрут           | Guard  | Опис                                                                                                                       |
| ------ | ----------------- | ------ | -------------------------------------------------------------------------------------------------------------------------- |
| `POST` | `/stripe/deposit` | Bearer | Створити PaymentIntent. Тіло: `{ "amount": 100 }` (монети). Повертає `id`, `client_secret`, `amount`, `currency`, `status` |

> `amount` передається у монетах (копійках), сервер множить на 100 для Stripe (гроші → найменша одиниця валюти).

### Payments webhook (`/payments`)

| Метод  | Маршрут                    | Guard | Опис                                                           |
| ------ | -------------------------- | ----- | -------------------------------------------------------------- |
| `POST` | `/payments/webhook/stripe` | —     | Stripe webhook. Верифікує `stripe-signature`, нараховує баланс |

> Цей маршрут використовує raw body (`Buffer`) для перевірки підпису Stripe. Клієнти не повинні викликати його напряму.

#### Локальне тестування webhook

```bash
# Встановити Stripe CLI та увійти в акаунт
stripe login

stripe listen --forward-to localhost:3300/payments/webhook/stripe

# Вручну тригернути payment_intent.succeeded (з userId в metadata)
stripe trigger payment_intent.succeeded \
  --override payment_intent:metadata.userId=<id>
```

---

### Roulette (`/roulette`)

| Метод    | Маршрут                    | Guard  | Опис                                                        |
| -------- | -------------------------- | ------ | ----------------------------------------------------------- |
| `POST`   | `/roulette/join`           | Bearer | Почати сесію → `{ id, serverHash, clientSeed, nonce }`      |
| `POST`   | `/roulette/bet`            | Bearer | Зробити ставку → результат, виплата, оновлений баланс       |
| `DELETE` | `/roulette/leave/:id`      | Bearer | Завершити сесію → розкриває `serverSeed`                    |
| `GET`    | `/roulette/history?limit=` | Bearer | Історія ставок (за замовчуванням 20, максимум 100)          |
| `POST`   | `/roulette/verify`         | —      | Верифікація результату: `serverSeed`, `clientSeed`, `nonce` |

#### Типи ставок

| Тип        | `targetNumber`                       | Виплата |
| ---------- | ------------------------------------ | ------- |
| `STRAIGHT` | 0–36                                 | x36     |
| `RED`      | —                                    | x2      |
| `BLACK`    | —                                    | x2      |
| `EVEN`     | —                                    | x2      |
| `ODD`      | —                                    | x2      |
| `DOZEN`    | `1` (1–12), `2` (13–24), `3` (25–36) | x3      |

> Нуль (0) програє всі ставки окрім `STRAIGHT` на 0.

---

## Змінні середовища (`.env`)

```env
PORT=3300

POSTGRES_DB=game-evoverse
POSTGRES_USER=admin
POSTGRES_PASSWORD=your_password

DATABASE_URL="postgresql://admin:your_password@localhost:5432/game-evoverse?schema=public"

JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

ADMIN_EMAIL=admin@evoverse.local
ADMIN_PASSWORD=Admin1234!

# Stripe (test mode)
STRIPE_API_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

> `STRIPE_WEBHOOK_SECRET` — секрет, який виводить `stripe listen` при локальній розробці.

---

## Запуск

### Локальна розробка

```bash
git clone https://github.com/olyaprykhodko/evoverse
cd evoverse && git checkout game-evoverse
npm i

# Запустити PostgreSQL (через Docker або локально)
docker compose up postgres -d

# Застосувати міграції та запустити seed
npx prisma migrate dev
npx prisma db seed

# Сервер з hot-reload
npm run start:local   # http://localhost:3300
```

### Docker (повний стек)

```bash
docker compose up --build -d
```

Запускає два контейнери:

- `api` — NestJS сервер, автоматично виконує `prisma migrate deploy` при старті
- `postgres` — PostgreSQL 17, api чекає на healthcheck перед стартом

API доступне на `http://localhost:3300/`

> **Примітка:** при запуску поза Docker (локальна розробка) бекенд читає `.env` (через `import 'dotenv/config'` у `main.ts`), а не `.env.local`. Переконайтесь, що `DATABASE_URL` у `.env` вказує на `localhost:5432`, якщо PostgreSQL запущено через Docker без мережевого аліасу.
