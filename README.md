# FileStorage v.2.0

Веб-застосунок для завантаження, перегляду та видалення файлів із аутентифікацією, лімітом сховища, адміністративною панеллю та профілем користувача.

Для полегшення тестування при старті застосунку вже існує два акаунти:

_Admin_: admin@filestorage.com -- _parxez-febjes-5wuvjE_

_User_: user@filestorage.com -- _yViFbIjDTTrhpc0_

_Акаунт із правами адміна створити через інтерфейс неможливо. Треба створювати звичайний акаунт і вручну змінювати роль у файлі `users.json`_

> Важливо: це тестовий проєкт без HTTPS. Авторизація через HTTP Basic не підходить для використання в продакшені.

---

## Стек

- **Сервер:** Node.js 25 + TypeScript + NestJS + Multer + bcrypt + `file-type` + `@nestjs/serve-static`
- **Клієнт:** React 19 + TypeScript + Tailwind CSS

---

## Опис

- **NEW**: React-клієнт збирається і роздається NestJS через `ServeStaticModule` — один порт для UI та API
- **NEW**: HTTP Basic Authentication - кожен захищений запит містить заголовок: `
Authorization: Basic <base64(email:password)>`
- **NEW**: Ролі користувачів: `user` та `admin`
- **NEW**: Адміністративна панель: перегляд користувачів та їхніх файлів, блокування акаунтів, зміна ліміту сховища користувачів, видалення акаунтів та окремих файлів користувачів
- **NEW**: Профіль користувача: зміна імʼя та пароля
- Реєстрація та аутентифікація користувачів
- Завантаження файлів через Multer з асинхронною обробкою
- Валідація файлу до завантаження (preflight ендпоінт)
- Перегляд, завантаження та видалення окремих файлів, очищення всього сховища
- Відображення зайнятого місця у сховищі
- Ліміт сховища від 3 MB до 1 GB, що налаштовується при реєстрації
- Валідація формату файлу: перевірка розширення + реального MIME через бібліотеку `file-type`
- Для форматів `.txt`, `.csv`, `.json` — перевірка лише за розширенням (немає magic bytes)
- Збереження сесії в `localStorage` — автологін після перезавантаження сторінки

**Дозволені формати:** `.pdf` · `.png` · `.jpeg` · `.jpg` · `.gif` · `.webp` · `.txt` · `.csv` · `.json` · `.mp3` · `.mp4` · `.zip`

---

## Реалізація

- Зберігання без бази даних: `data/users.json` зберігає користувачів, `data/files/{userId}/metadata.json` + файли — дані кожного юзера
- Авторизація через `Authorization: Basic base64(email:password)` у кожному запиті
- Немає окремого `/login` ендпоінту і немає сесій на сервері. Щоб "увійти", клієнт надсилає `GET /users/me` з Basic-заголовком — сервер перевіряє credentials і повертає дані поточного юзера.
- `AuthGuard` декодує заголовок, перевіряє пароль через bcrypt, прикріплює `user` до запиту
- `BlockedGuard` перевіряє `user.blocked` і повертає 403 для всіх запитів, крім логіна
- `AdminGuard` перевіряє `user.role === 'admin'` і обмежує адміністративні ендпоінти
- `@AuthUser()` — param decorator, витягує `request.user` у контролерах
- `/files/upload` обробляється особливо: Multer парсить multipart-форму до guards, тому Basic auth декодується вручну всередині хендлера; XHR-клієнт передає `Authorization` через `setRequestHeader`
- Файл спочатку зберігається у `data/tmp/`, після валідації MIME переміщується до `data/files/{userId}/`
- `normalizeFileName` — санітизація імені файлу (видалення небезпечних символів)
- `resolveUniqueFileName` — автоматичне перейменування при конфліктах (`file.pdf` → `file-1.pdf`)
- Статуси завантаження зберігаються в Map з TTL 10 хвилин; клієнт поллить кожні 500ms
- `ServeStaticModule` роздає `client/build/` для всіх маршрутів, крім `/users/*` та `/files/*`

---

### Guards

```
Запит → AuthGuard → BlockedGuard → AdminGuard → Controller
```

| Guard          | Що робить                                                                |
| -------------- | ------------------------------------------------------------------------ |
| `AuthGuard`    | Декодує `Authorization: Basic`, знаходить юзера, перевіряє пароль bcrypt |
| `BlockedGuard` | Повертає `403`, якщо акаунт заблокований                                 |
| `AdminGuard`   | Повертає `403`, якщо `user.role !== 'admin'`                             |

Після успішного `AuthGuard` об'єкт `user` прикріплюється до запиту — контролери отримують його через `@AuthUser()` decorator.

### Особливий випадок: завантаження файлів

`POST /files/upload` використовує Multer для парсингу `multipart/form-data`. Multer обробляє тіло запиту **до** того, як NestJS Guards отримують контроль, тому стандартний `AuthGuard` там не застосовується. Натомість Basic Auth декодується вручну всередині хендлера з `req.headers['authorization']`.

### Клієнт

Credentials зберігаються в `localStorage` як `{ email, password }` для відновлення сесії після перезавантаження. При кожному API-запиті клієнт обчислює:

```ts
'Basic ' + btoa(`${auth.email}:${auth.password}`);
```

і передає результат у заголовку `Authorization`.

---

## Архітектура сервера

```
src/
├── main.ts                          # Bootstrap: CORS, ValidationPipe, створення tmp-директорії
├── app.module.ts                    # Кореневий модуль: ServeStatic, Storage, Users, Files, Auth, Admin
├── common/
│   ├── types.ts                     # UserRecord, FileRecord, UserRole
│   ├── decorators/
│   │   └── auth-user.decorator.ts   # @AuthUser() — param decorator
│   └── guards/
│       ├── auth.guard.ts            # Авторизація через Authorization: Basic header
│       ├── blocked.guard.ts         # Блокує операції заблокованих акаунтів
│       └── admin.guard.ts           # Доступ лише для role === 'admin'
├── storage/
│   ├── storage.module.ts
│   └── storage.service.ts           # Диск: JSON-файли, директорії, метадані, utils
├── auth/
│   ├── auth.module.ts
│   └── auth.controller.ts           # POST /auth/register, POST /auth/login, POST /auth/logout
├── users/
│   ├── dto/
│   │   ├── signup.dto.ts            # Валідація реєстрації (class-validator)
│   │   └── update.dto.ts            # Валідація оновлення профілю
│   ├── users.module.ts
│   ├── users.controller.ts          # GET|PATCH|DELETE /users/me
│   └── users.service.ts             # create, findAll, findById, delete, updateProfile,
│                                    # toggleBlock, updateStorageLimit, validateCredentials
├── admin/
│   ├── admin.module.ts
│   └── admin.controller.ts          # GET /admin/users, GET|DELETE /admin/users/:id,
│                                    # PATCH /admin/users/:id/block|quota,
│                                    # GET|DELETE /admin/users/:id/files/:fileId
└── files/
    ├── files.module.ts
    ├── files.controller.ts          # preflight, upload, status, list, download,
    │                                # deleteOne, clearAll
    └── files.service.ts             # Завантаження, MIME-валідація, статус, сховище
```

---

## API

Авторизація: `Authorization: Basic base64(email:password)` у кожному захищеному запиті.

### Auth (`/auth`)

| Метод  | Маршрут          | Guard | Опис                                                      |
| ------ | ---------------- | ----- | --------------------------------------------------------- |
| `POST` | `/auth/register` | —     | Реєстрація (`name`, `email`, `password`, `storageLimit?`) |
| `POST` | `/auth/login`    | Auth  | Логін — повертає дані поточного юзера                     |
| `POST` | `/auth/logout`   | —     | Логаут (stateless — завжди повертає 200)                  |

### Users (`/users`)

| Метод    | Маршрут     | Guard | Опис                                                |
| -------- | ----------- | ----- | --------------------------------------------------- |
| `GET`    | `/users/me` | Auth  | Отримати профіль поточного юзера                    |
| `PATCH`  | `/users/me` | Auth  | Змінити ім'я або пароль (вимагає `currentPassword`) |
| `DELETE` | `/users/me` | Auth  | Видалити свій акаунт                                |

### Files (`/files`)

| Метод    | Маршрут             | Guard           | Опис                                                  |
| -------- | ------------------- | --------------- | ----------------------------------------------------- |
| `POST`   | `/files/preflight`  | Auth + Blocked  | Перевірка розширення + ліміту до завантаження         |
| `POST`   | `/files`            | Manual (Multer) | Завантажити файл (multipart: `file`; Basic в header)  |
| `GET`    | `/files/status/:id` | Auth            | Статус завантаження (`processing` / `done` / `error`) |
| `GET`    | `/files`            | Auth + Blocked  | Список файлів + інфо про сховище                      |
| `GET`    | `/files/:id`        | Auth + Blocked  | Завантажити файл (download)                           |
| `DELETE` | `/files/:id`        | Auth + Blocked  | Видалити файл                                         |
| `DELETE` | `/files`            | Auth + Blocked  | Видалити всі файли                                    |

### Admin (`/admin`)

| Метод    | Маршрут                              | Guard        | Опис                                     |
| -------- | ------------------------------------ | ------------ | ---------------------------------------- |
| `GET`    | `/admin/users`                       | Auth + Admin | Список всіх юзерів із файлами            |
| `GET`    | `/admin/users/:id/files`             | Auth + Admin | Файли конкретного юзера                  |
| `PATCH`  | `/admin/users/:id/block`             | Auth + Admin | Заблокувати / розблокувати акаунт        |
| `PATCH`  | `/admin/users/:id/quota`             | Auth + Admin | Змінити ліміт сховища (`storageLimitMb`) |
| `DELETE` | `/admin/users/:id`                   | Auth + Admin | Видалити акаунт юзера                    |
| `DELETE` | `/admin/users/:userId/files/:fileId` | Auth + Admin | Видалити файл юзера                      |

---

## Запуск

```bash
git clone https://github.com/olyaprykhodko/evoverse
cd evoverse
git checkout nest-server-v.2.0
```

### Локальна розробка (два сервери)

```bash
# Термінал 1 — сервер (http://localhost:3100)
cd server
npm i
npm run start:dev

# Термінал 2 — UI з HMR (http://localhost:3200)
cd client
npm i
npm start
```

### Локальний продакшн (один сервер)

```bash
cd server
npm run build:all   # збирає клієнт + сервер, копіює білд
node dist/main.js   # http://localhost:3100
```

### Docker (один контейнер)

```bash
docker compose up --build -d   # http://localhost:3100
```

Multi-stage build: збирає React-клієнт і NestJS-сервер в одному образі. NestJS роздає і API, і статику.

---
