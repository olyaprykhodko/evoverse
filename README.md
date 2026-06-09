# GlowVerse Game Platform Backend API

REST + WebSocket API для iGaming платформи GlowVerse. Включає реєстрацію, JWT-авторизацію, OAuth (Google / Discord), верифікацію email (Resend), рулетку, слоти, PvP-бої, глобальний чат, магазин зброї, гаманець USD/GC та інтеграцію зі Stripe.

**Web App (Dev):** [https://dev.evoverse.dpdns.org](https://dev.evoverse.dpdns.org), **API (Dev):** [https://api-dev.evoverse.dpdns.org](https://api-dev.evoverse.dpdns.org)

**Web App:** [https://evoverse.dpdns.org](https://evoverse.dpdns.org), **API:** [https://api.evoverse.dpdns.org](https://api.evoverse.dpdns.org)

---

## Стек

| Шар              | Технологія                             |
| ---------------- | -------------------------------------- |
| Runtime          | Node.js 22 + TypeScript (ESM)          |
| Framework        | NestJS 11                              |
| Database         | PostgreSQL 17 + Prisma 7               |
| Cache / Sessions | Redis 8                                |
| Auth             | JWT (access 15m + refresh 7d) + argon2 |
| Email            | Resend (верифікація адреси)            |
| Payments         | Stripe API `2026-04-22.dahlia`         |
| Real-time        | Socket.IO (WebSocket)                  |
| Container        | Docker multi-stage + Docker Compose    |

---

## Модулі

### Auth `/auth`

| Метод | Маршрут                    | Guard   | Опис                                               |
| ----- | -------------------------- | ------- | -------------------------------------------------- |
| POST  | `/auth/login`              | —       | email + password → `accessToken`, `refreshToken`   |
| POST  | `/auth/refresh`            | Refresh | `{ refreshToken }` в body → нові токени            |
| POST  | `/auth/logout`             | Bearer  | Інвалідація сесії в Redis                          |
| GET   | `/auth/google`             | Google  | Старт Google OAuth (редірект на Google)            |
| GET   | `/auth/google/callback`    | Google  | Callback → редірект на фронт із токенами           |
| GET   | `/auth/discord`            | Discord | Старт Discord OAuth (редірект на Discord)          |
| GET   | `/auth/discord/callback`   | Discord | Callback → редірект на фронт із токенами           |
| POST  | `/auth/verify-email`       | —       | Підтвердити email за токеном з листа (`{ token }`) |
| POST  | `/auth/retry-verification` | —       | Повторно надіслати лист верифікації (`{ email }`)  |

Access-токен живе 15 хв, refresh — 7 днів. Refresh-токен зберігається в Redis; logout видаляє запис.

**OAuth (Google / Discord):** користувач відкриває `/auth/google` (або `/auth/discord`), проходить згоду в провайдера, після чого callback створює (або знаходить за `googleId` / email) акаунт із гаманцем і **редіректить на `FRONTEND_OAUTH_REDIRECT`**, передаючи `accessToken` та `refreshToken` у query-параметрах. Фронт зчитує токени з URL і завершує вхід. OAuth-акаунти одразу мають `emailVerified: true` (email підтверджений провайдером).

**Верифікація email:** при реєстрації генерується випадковий токен — у Redis зберігається лише його **SHA-256 хеш** (`email:verify:<hash>`, TTL 24 год, одноразовий), а на пошту через **Resend** іде лист із лінком `FRONTEND_URL/verify-email?token=...`. Перехід на цей лінк викликає `/auth/verify-email`, що споживає токен (читає → видаляє) і ставить `emailVerified: true`. `retry-verification` шле новий лист і **не розкриває**, чи існує адреса (захист від enumeration). Логін доступний і без підтвердження, але **фінансові й профільні дії заблоковані** (див. `EmailVerifiedGuard` нижче).

**`EmailVerifiedGuard`:** працює після `JwtAccessGuard`, читає `emailVerified` з БД (тож підтвердження діє одразу, без перевипуску JWT) і повертає `403`, поки email не підтверджено. Накладений на: `POST /wallet/coins/buy`, `POST /wallet/coins/convert`, `POST /stripe/checkout-session`, `PATCH /users/:id`.

---

### Users `/users`

| Метод  | Маршрут      | Guard  | Опис                                               |
| ------ | ------------ | ------ | -------------------------------------------------- |
| POST   | `/users`     | —      | Реєстрація (`username?`, `email`, `password`)      |
| GET    | `/users/me`  | Bearer | Власний профіль з балансом, адресою, героєм        |
| GET    | `/users/:id` | Bearer | Публічний профіль                                  |
| PATCH  | `/users/:id` | Bearer | Оновити username / email / password / selectedHero |
| DELETE | `/users/:id` | Bearer | Soft delete (`isDeleted: true`)                    |

При реєстрації автоматично створюється `Wallet` (USD баланс + GC баланс = 0) і надсилається лист верифікації email (`emailVerified: false`, див. розділ Auth). `PATCH /users/:id` потребує підтвердженого email (`EmailVerifiedGuard`).

---

### Wallet `/wallet`

| Метод | Маршрут                             | Guard  | Опис                               |
| ----- | ----------------------------------- | ------ | ---------------------------------- |
| GET   | `/wallet/me`                        | Bearer | USD баланс + останні 10 транзакцій |
| GET   | `/wallet/transactions?limit=`       | Bearer | Повна USD-історія (макс. 100)      |
| GET   | `/wallet/coins`                     | Bearer | Поточний GC баланс                 |
| GET   | `/wallet/coins/transactions?limit=` | Bearer | GC транзакції                      |
| POST  | `/wallet/coins/convert`             | Bearer | GC → USD (`{ amount }`)            |
| POST  | `/wallet/coins/buy`                 | Bearer | USD → GC (`{ amount }`)            |

**Race condition:** кожна операція з балансом — `$transaction` + `SELECT ... FOR UPDATE` на рядку wallet. Конкурентні запити серіалізуються PostgreSQL.

**Idempotency (USD-транзакції):** клієнт генерує UUID v4 один раз і повторно використовує при ретраях. Сервер повертає вже збережену транзакцію без повторного нарахування.

---

### Payments `/stripe`

| Метод | Маршрут                    | Guard  | Опис                                                                                                     |
| ----- | -------------------------- | ------ | -------------------------------------------------------------------------------------------------------- |
| POST  | `/stripe/checkout-session` | Bearer | Створити Stripe Checkout Session. `{ amount }` — сума в USD (×100 у центи). Повертає `{ data: { url } }` |
| POST  | `/stripe/webhook`          | —      | Stripe webhook (`stripe-signature`), нарахування USD балансу                                             |

Webhook використовує raw body (`Buffer`) для верифікації підпису — для шляху `/stripe/webhook` він підключений у `main.ts`. Обробляє подію `checkout.session.completed`.

```bash
# Локальне тестування webhook
stripe listen --forward-to localhost:3300/stripe/webhook
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

**Provably fair:** `winningNumber = HMAC-SHA256(serverSeed, clientSeed:nonce) % 37`, де `clientSeed = SHA256(відсортовані clientSeed усіх ставок раунду)`. `serverHash = SHA256(serverSeed)` публікується до ставок, а `clientSeed` фіксується лише після їх закриття — тож сервер не знає результат під час прийому ставок, і жоден гравець його не контролює. Після спіну розкриваються `serverSeed` і `clientSeed`; перевірити можна через `/roulette/verify` тією ж формулою.

---

### Slot `/slot`

| Метод | Маршрут                | Guard  | Опис                                                     |
| ----- | ---------------------- | ------ | -------------------------------------------------------- |
| GET   | `/slot/session`        | Bearer | Отримати або створити сесію → `{ serverHash, nonce }`    |
| POST  | `/slot/spin`           | Bearer | Спін `{ bet, clientSeed }` → грід + лінії + GC баланс    |
| GET   | `/slot/history?limit=` | Bearer | Історія спінів                                           |
| POST  | `/slot/verify`         | —      | Публічна верифікація `{ serverSeed, clientSeed, nonce }` |

Ставки у **GC (Glow Coins)**. **5 барабанів × 3 ряди**, 8 символів (7 звичайних + `WILD`), **5 ліній виплат**. Фіксовані стрічки (32 позиції на барабан) → детермінований RTP ≈ **95%** (виміряно симулятором `scripts/slot-sim.mjs`).

**Лінії виплат** (рядок на кожен барабан; 0 = верх, 1 = центр, 2 = низ):

| # | Лінія        | Патерн        |
| - | ------------ | ------------- |
| 1 | центр        | `[1,1,1,1,1]` |
| 2 | верхня       | `[0,0,0,0,0]` |
| 3 | нижня        | `[2,2,2,2,2]` |
| 4 | трикутник    | `[2,1,0,1,2]` |
| 5 | перевернутий | `[0,1,2,1,0]` |

**Виплати** (множник на ставку-на-лінію, збіги **зліва направо**):

| Збігів | LEMON | CHERRY | GRAPE | BELL | BAR  | SEVEN | DIAMOND |
| ------ | ----- | ------ | ----- | ---- | ---- | ----- | ------- |
| 3      | ×6    | ×8     | ×12   | ×18  | ×25  | ×45   | ×90     |
| 4      | ×15   | ×25    | ×40   | ×60  | ×90  | ×180  | ×450    |
| 5      | ×45   | ×75    | ×120  | ×240 | ×360 | ×750  | ×1800   |

`WILD` замінює будь-який символ (власної виплати не має). Ставка ділиться порівну між 5 лініями: **виплата лінії = (bet ÷ 5) × множник**, а виграші всіх ліній **підсумовуються** за спін.

**Provably fair:** для кожного з 5 барабанів `stop[i] = HMAC-SHA256(serverSeed, clientSeed:nonce)[i*8..i*8+7] % REEL_LENGTH`. `serverHash = SHA256(serverSeed)` публікується до спіну, `serverSeed` — після. Сесія в Redis (TTL 24 год), seed ротується після кожного спіну. У `slot_spin` зберігаються `stops`, повний `grid` та масив `wins` (jsonb).

---

### Battle (WebSocket)

Підключення: Socket.IO до неймспейсу `/battle` (`ws://localhost:3300/battle`). JWT передається в `auth.token` при handshake.

**WebSocket події:**

| Подія (emit)  | Payload                       | Відповідь (on)                                                     | Опис                              |
| ------------- | ----------------------------- | ------------------------------------------------------------------ | --------------------------------- |
| `queue:join`  | `{ weaponId }`                | `queue:joined`, далі `battle:matched`                              | Вступити в чергу                  |
| `queue:leave` | —                             | `queue:left`                                                       | Вийти з черги                     |
| `battle:move` | `{ attackZone, defenseZone }` | `battle:move-accepted` → `battle:round-result` / `battle:finished` | Зробити хід (зони head/body/legs) |

Сервер також може надіслати `battle:opponent-disconnected`, якщо суперник відключився.

**HTTP ендпоінти:**

| Метод | Маршрут                  | Guard  | Опис                   |
| ----- | ------------------------ | ------ | ---------------------- |
| GET   | `/battle/history?limit=` | Bearer | Останні бої (макс. 50) |
| GET   | `/battle/stats`          | Bearer | Wins / losses / streak |

**Механіка бою:**

- Обидва гравці починають з **100 HP**
- Кожен раунд обидва **одночасно** обирають зону атаки і зону захисту (`head` / `body` / `legs`)
- Базове ушкодження: `randomInt(weapon.minDamage, weapon.maxDamage)`
- Вдалий блок (зона захисту = зона атаки суперника) пропускає лише **40%** урону
- На хід дається **20 c**; не встиг — сервер грає «порожній» хід (без атаки й захисту), а якщо обидва проспали — бій завершується
- Бій закінчується коли HP ≤ 0 (подвійний нокаут → перемагає той, у кого більший залишок HP)
- Дедлайни раундів і стан бою — в Redis (ZSET + hash), фінальний результат — у PostgreSQL
- **Нагорода:** кожні **6 перемог поспіль** → **+1 GC**

---

### Chat (WebSocket)

Підключення: Socket.IO до неймспейсу `/chat` (`ws://localhost:3300/chat`). JWT передається в `auth.token` при handshake; без валідного токена сокет відключається. Усі клієнти приєднуються до спільної глобальної кімнати.

**WebSocket події:**

| Подія           | Напрям           | Payload       | Опис                                     |
| --------------- | ---------------- | ------------- | ---------------------------------------- |
| `chat:send`     | emit             | `{ content }` | Надіслати повідомлення в глобальний чат  |
| `chat:history`  | on (при конекті) | `Message[]`   | Історія кімнати при підключенні          |
| `chat:message`  | on               | `Message`     | Нове повідомлення (broadcast усім)       |
| `chat:presence` | on               | `{ online }`  | Кількість унікальних онлайн-користувачів |

Rate limit: не частіше **5 повідомлень / 5 c** на користувача (інакше `WsException`). Повідомлення зберігаються в Redis як обмежений список (`chat:messages:<room>`, `RPUSH` + `LTRIM`) — тримаються лише **останні 100** на кімнату, без довготривалого зберігання в БД. Історія кімнати читається з Redis при кожному конекті.

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

# CORS origin (кому-розділені URL) + база для лінка верифікації email
FRONTEND_URL=http://localhost:3000

# Email (Resend) — верифікація адреси. MAIL_FROM має бути на верифікованому домені
RESEND_API_KEY=re_your_resend_api_key
MAIL_FROM="GlowVerse <no-reply@your-domain>"

# OAuth — провайдери + куди редіректить бекенд після успіху (токени в query)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3300/auth/google/callback
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_CALLBACK_URL=http://localhost:3300/auth/discord/callback
FRONTEND_OAUTH_REDIRECT=http://localhost:3000/auth/callback

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
