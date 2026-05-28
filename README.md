# GlowVerse Game Platform Backend API

REST + WebSocket API для iGaming платформи GlowVerse. Включає реєстрацію, JWT-авторизацію, рулетку, слоти, PvP-бої, магазин зброї, гаманець USD/GC та інтеграцію зі Stripe.

**Web App:** [https://api-dev.evoverse.dpdns.org](https://api-dev.evoverse.dpdns.org)

**API:** [https://dev.evoverse.dpdns.org](https://dev.evoverse.dpdns.org)

---

## Стек

| Шар              | Технологія                             |
| ---------------- | -------------------------------------- |
| Runtime          | Node.js 22 + TypeScript (ESM)          |
| Framework        | NestJS 11                              |
| Database         | PostgreSQL 17 + Prisma 7               |
| Cache / Sessions | Redis 8                                |
| Auth             | JWT (access 15m + refresh 7d) + argon2 |
| Payments         | Stripe API `2026-04-22.dahlia`         |
| Real-time        | Socket.IO (WebSocket)                  |
| Container        | Docker multi-stage + Docker Compose    |

---

## Модулі

### Auth `/auth`

| Метод | Маршрут         | Guard   | Опис                                             |
| ----- | --------------- | ------- | ------------------------------------------------ |
| POST  | `/auth/login`   | —       | email + password → `accessToken`, `refreshToken` |
| POST  | `/auth/refresh` | Refresh | `{ refreshToken }` в body → нові токени          |
| POST  | `/auth/logout`  | Bearer  | Інвалідація сесії в Redis                        |

Access-токен живе 15 хв, refresh — 7 днів. Refresh-токен зберігається в Redis; logout видаляє запис.

---

### Users `/users`

| Метод  | Маршрут      | Guard  | Опис                                               |
| ------ | ------------ | ------ | -------------------------------------------------- |
| POST   | `/users`     | —      | Реєстрація (`username?`, `email`, `password`)      |
| GET    | `/users/me`  | Bearer | Власний профіль з балансом, адресою, героєм        |
| GET    | `/users/:id` | Bearer | Публічний профіль                                  |
| PATCH  | `/users/:id` | Bearer | Оновити username / email / password / selectedHero |
| DELETE | `/users/:id` | Bearer | Soft delete (`isDeleted: true`)                    |

При реєстрації автоматично створюється `Wallet` (USD баланс + GC баланс = 0).

---

### Wallet `/wallet`

| Метод | Маршрут                             | Guard  | Опис                               |
| ----- | ----------------------------------- | ------ | ---------------------------------- |
| GET   | `/wallet/me`                        | Bearer | USD баланс + останні 10 транзакцій |
| GET   | `/wallet/transactions?limit=`       | Bearer | Повна USD-історія (макс. 100)      |
| GET   | `/wallet/coins`                     | Bearer | Поточний GC баланс                 |
| GET   | `/wallet/coins/transactions?limit=` | Bearer | GC транзакції                      |
| POST  | `/wallet/coins/convert`             | Bearer | GC → USD (`{ amount }`)            |
| POST  | `/wallet/coins/buy`                 | Bearer | USD → GC (`{ usdAmount }`)         |

**Race condition:** кожна операція з балансом — `$transaction` + `SELECT ... FOR UPDATE` на рядку wallet. Конкурентні запити серіалізуються PostgreSQL.

**Idempotency (USD-транзакції):** клієнт генерує UUID v4 один раз і повторно використовує при ретраях. Сервер повертає вже збережену транзакцію без повторного нарахування.

---

### Payments `/stripe` + `/payments`

| Метод | Маршрут                    | Guard  | Опис                                                                      |
| ----- | -------------------------- | ------ | ------------------------------------------------------------------------- |
| POST  | `/stripe/deposit`          | Bearer | Створити Stripe PaymentIntent. `{ amount }` — в монетах (×100 для Stripe) |
| POST  | `/payments/webhook/stripe` | —      | Stripe webhook (`stripe-signature`), нарахування USD балансу              |

Webhook використовує raw body (`Buffer`) для верифікації підпису. Обробляє подію `checkout.session.completed`.

```bash
# Локальне тестування webhook
stripe listen --forward-to localhost:3300/payments/webhook/stripe
stripe trigger checkout.session.completed
```

---

### Roulette `/roulette`

| Метод  | Маршрут                    | Guard  | Опис                                                      |
| ------ | -------------------------- | ------ | --------------------------------------------------------- |
| POST   | `/roulette/join`           | Bearer | Відкрити сесію → `{ id, serverHash, clientSeed, nonce }`  |
| POST   | `/roulette/bet`            | Bearer | Поставити ставку → результат + оновлений баланс           |
| DELETE | `/roulette/leave/:id`      | Bearer | Закрити сесію → розкриває `serverSeed`                    |
| GET    | `/roulette/history?limit=` | Bearer | Історія ставок (макс. 100)                                |
| POST   | `/roulette/verify`         | —      | Публічна верифікація: `{ serverSeed, clientSeed, nonce }` |

**Виграш/програш:**

| Тип ставки      | `targetNumber`                 | Множник |
| --------------- | ------------------------------ | ------- |
| `STRAIGHT`      | 0–36                           | ×36     |
| `RED` / `BLACK` | —                              | ×2      |
| `EVEN` / `ODD`  | —                              | ×2      |
| `DOZEN`         | 1 (1–12), 2 (13–24), 3 (25–36) | ×3      |

Виплата = `bet × multiplier`. Нуль (0) програє всі ставки, окрім `STRAIGHT` на 0. Списання та нарахування — в одній транзакції wallet.

**Provably fair:** `winningNumber = HMAC-SHA256(serverSeed, clientSeed:nonce) % 37`. `serverHash = SHA256(serverSeed)` публікується до гри, `serverSeed` — після.

---

### Slot `/slot`

| Метод | Маршрут                | Guard  | Опис                                                     |
| ----- | ---------------------- | ------ | -------------------------------------------------------- |
| GET   | `/slot/session`        | Bearer | Отримати або створити сесію → `{ serverHash, nonce }`    |
| POST  | `/slot/spin`           | Bearer | Спін `{ bet, clientSeed }` → результат + GC баланс       |
| GET   | `/slot/history?limit=` | Bearer | Історія спінів                                           |
| POST  | `/slot/verify`         | —      | Публічна верифікація `{ serverSeed, clientSeed, nonce }` |

Ставки у **GC (Glow Coins)**. 3 барабани, 7 символів.

**Виплати (множник × ставка):**

| Комбінація        | LEMON | CHERRY | GRAPE | BELL | BAR | SEVEN | DIAMOND |
| ----------------- | ----- | ------ | ----- | ---- | --- | ----- | ------- |
| 3 однакових       | ×14   | ×16    | ×20   | ×30  | ×60 | ×100  | ×150    |
| 2 однакових зліва | ×0.6  | ×0.8   | ×1.5  | ×2.5 | ×3  | ×6    | ×10     |

**Provably fair:** `stop[i] = HMAC-SHA256(serverSeed, clientSeed:nonce)[i*4..i*4+3] % REEL_LENGTH`. Теоретичний RTP ~95.58%. Сесія в Redis (TTL 24 год), seed ротується після кожного спіну.

---

### Battle (WebSocket)

Підключення: `ws://localhost:3300` (Socket.IO). JWT передається в `auth.token` при handshake.

**WebSocket події:**

| Подія (emit)    | Payload        | Відповідь (on)                 | Опис             |
| --------------- | -------------- | ------------------------------ | ---------------- |
| `queue:join`    | `{ weaponId }` | `match:found` / ack            | Вступити в чергу |
| `queue:leave`   | —              | ack                            | Вийти з черги    |
| `battle:attack` | —              | `battle:update` / `battle:end` | Атакувати        |

**HTTP ендпоінти:**

| Метод | Маршрут                  | Guard  | Опис                   |
| ----- | ------------------------ | ------ | ---------------------- |
| GET   | `/battle/history?limit=` | Bearer | Останні бої (макс. 50) |
| GET   | `/battle/stats`          | Bearer | Wins / losses / streak |

**Механіка бою:**

- Обидва гравці починають з **100 HP**
- Ушкодження за хід: `randomInt(weapon.minDamage, weapon.maxDamage)`
- Перший хід — гравець з вищим рівнем (coin toss при рівних)
- Бій закінчується коли HP ≤ 0
- Стан зберігається в Redis, результат пишеться в PostgreSQL
- **Нагорода:** кожні **6 перемог поспіль** → **+1 GC**

---

### Weapons `/weapons`

| Метод | Маршрут              | Guard  | Опис                          |
| ----- | -------------------- | ------ | ----------------------------- |
| GET   | `/weapons`           | Bearer | Каталог усієї зброї           |
| GET   | `/weapons/inventory` | Bearer | Власний інвентар              |
| POST  | `/weapons/buy`       | Bearer | `{ weaponId }` — купити за GC |

Покупка списує GC через `processCoinTransaction`. Повертає `409` якщо зброя вже куплена.

---

### Admin `/admin`

Всі ендпоінти потребують `AdminGuard` (Bearer + `role === 'ADMIN'`).

| Метод  | Маршрут                    | Опис                                           |
| ------ | -------------------------- | ---------------------------------------------- |
| GET    | `/admin/stats`             | Загальна статистика платформи                  |
| GET    | `/admin/users`             | Список усіх користувачів                       |
| GET    | `/admin/users/:id`         | Деталі + адреса                                |
| PATCH  | `/admin/users/:id/ban`     | Бан (`banEndAt?` — безстроково якщо відсутній) |
| PATCH  | `/admin/users/:id/unban`   | Розбан                                         |
| PATCH  | `/admin/users/:id/role`    | Змінити роль (`USER` / `ADMIN`)                |
| PATCH  | `/admin/users/:id/profile` | Оновити rating / balance / level               |
| DELETE | `/admin/users/:id`         | Soft delete                                    |

---

### Address `/address`

| Метод | Маршрут    | Guard  | Опис            |
| ----- | ---------- | ------ | --------------- |
| POST  | `/address` | Bearer | Створити адресу |
| PATCH | `/address` | Bearer | Оновити адресу  |

---

### Health

`GET /health` — публічний health check.

---

## Змінні середовища

```env
NODE_ENV=development
PORT=3300

POSTGRES_DB=game-evoverse
POSTGRES_USER=admin
POSTGRES_PASSWORD=your_db_password

# Для Docker: хост = postgres; локально: localhost
DATABASE_URL="postgresql://admin:your_db_password@postgres:5432/game-evoverse?schema=public"

JWT_ACCESS_SECRET=your_jwt_access_secret
JWT_REFRESH_SECRET=your_jwt_refresh_secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

ADMIN_EMAIL=admin@evoverse.com
ADMIN_PASSWORD=your_admin_password
ADMIN_SECRET=your_admin_secret

# CORS origin — підтримує кому-розділені URL для кількох середовищ
FRONTEND_URL=http://localhost:3000

STRIPE_API_KEY=sk_test_...
STRIPE_RESTRICTED_KEY=rk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Для Docker: хост = redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
```

---

## Запуск

### Локально

```bash
git clone https://github.com/olyaprykhodko/evoverse
cd evoverse
git checkout develop
npm install
cp .env.example .env
# Відредагуй .env — DATABASE_URL хост = localhost, REDIS_HOST = 127.0.0.1

# Запустити PostgreSQL та Redis
docker compose up postgres redis -d

# Міграції + seed (адмін-акаунт)
npx prisma migrate dev
npx prisma db seed

# Dev-сервер з hot-reload
npm run start:dev
```

### Docker (повний стек)

```bash
cp .env.example .env
# Відредагуй .env — DATABASE_URL хост = postgres, REDIS_HOST = redis

docker compose up --build -d
```

Три контейнери:

- **`api`** — NestJS, виконує `prisma migrate deploy` + seed при старті
- **`postgres`** — PostgreSQL 17, volume `postgres_data`
- **`redis`** — Redis 8 з AOF persistence, password-protected

```bash
# Перевірка
curl http://localhost:3300/health

# Swagger UI
open http://localhost:3300/
```
