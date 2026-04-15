# FileStorage (NestJS)

Веб-застосунок для завантаження, перегляду та видалення файлів із аутентифікацією та лімітом сховища.

---

## Стек

- **Сервер:** Node.js 25 + TypeScript + NestJS + Multer + bcrypt + `file-type`
- **Клієнт:** React 19 + TypeScript + Tailwind CSS

---

## Опис

- Реєстрація та аутентифікація користувачів
- Завантаження файлів через Multer з асинхронною обробкою
- Валідація файлу до завантаження (preflight ендпоінт)
- Перегляд, завантаження та видалення окремих файлів, очищення всього сховища
- Відображення зайнятого місця у сховищі
- Ліміт сховища від 3 MB до 1 GB, що налаштовується при реєстрації
- Валідація формату файлу: перевірка розширення + реального MIME через бібліотеку `file-type`
- Для форматів `.txt`, `.csv`, `.json` перевірка лише за розширенням

**Дозволені формати:** `.pdf` · `.png` · `.jpeg` · `.jpg` · `.gif` · `.webp` · `.txt` · `.csv` · `.json` · `.mp3` · `.mp4` · `.zip`

---

## Реалізація

- Зберігання без бази даних: фай `data/users.json` зберігає користувачів, `data/files/{userId}/metadata.json` + файли для даних
- Авторизація через імейл та пароль у тілі кожного запиту
- `AuthGuard` перевіряє хеш паролю через bcrypt і прикріплює користувача до запиту
- Ендпоінт /upload має особливу логіку обробки: імейл та пароль передаються як форма разом із файлом, а Multer обробляє тіло до guard
- Файл спочатку зберігається у `data/tmp/`, а потім переміщується до каталогу користувача
- Санітизація імені файлу (`normalizeFileName`)
- Унікальність імен за допомогою функції `resolveUniqueFileName`
- `file-type` повертає `undefined` для `.txt` / `.csv` / `.json` (немає magic bytes), тому перевірка лише за розширенням

---

## Архітектура сервера

```
src/
├── main.ts                          # Bootstrap: CORS, ValidationPipe, створення tmp
├── app.module.ts                    # Кореневий модуль (Storage, Users, Files)
├── app.controller.ts                # GET / — healthcheck
├── common/
│   ├── decorators/
│   │   └── auth-user.decorator.ts   # @AuthUser() — отримання юзера із запиту
│   └── guards/
│       └── auth.guard.ts            # Авторизація через email + password у body
├── storage/
│   ├── storage.module.ts
│   └── storage.service.ts           # Робота з диском: JSON-файли, каталоги, метадані
├── users/
│   ├── dto/
│   │   └── signup.dto.ts            # Валідація: name, email, password, storageLimit
│   ├── users.module.ts
│   ├── users.controller.ts          # CRUD користувачів
│   └── users.service.ts             # Реєстрація (bcrypt), перевірка credentials
└── files/
    ├── files.module.ts
    ├── files.controller.ts          # Upload, download, delete, preflight, статус
    └── files.service.ts             # Завантаження, MIME-валідація, статус, сховище
```

---

## API

### Users (`/users`)

| Метод    | Маршрут      | Авторизація | Опис                                                      |
| -------- | ------------ | ----------- | --------------------------------------------------------- |
| `POST`   | `/users`     | Ні          | Реєстрація (`name`, `email`, `password`, `storageLimit?`) |
| `POST`   | `/users/all` | Так         | Список всіх користувачів                                  |
| `POST`   | `/users/:id` | Так         | Отримати користувача за ID                                |
| `DELETE` | `/users/:id` | Так         | Видалити свій акаунт (тільки власний)                     |

### Files (`/files`)

| Метод    | Маршрут             | Авторизація | Опис                                                             |
| -------- | ------------------- | ----------- | ---------------------------------------------------------------- |
| `POST`   | `/files/preflight`  | Так         | Перевірка розширення + ліміту до завантаження                    |
| `POST`   | `/files/upload`     | Form fields | Завантажити файл (multipart form: `file` + `email` + `password`) |
| `POST`   | `/files/status/:id` | Так         | Статус завантаження (`processing` / `done` / `error`)            |
| `POST`   | `/files/list`       | Так         | Список файлів + інфо про сховище                                 |
| `POST`   | `/files/:id`        | Так         | Завантажити файл (download)                                      |
| `DELETE` | `/files/:id`        | Так         | Видалити файл                                                    |
| `DELETE` | `/files`            | Так         | Видалити всі файли                                               |

---

## Запуск

```bash
git clone https://github.com/olyaprykhodko/evoverse
cd evoverse
git checkout nest-server
```

### Локальний запуск

1. Сервер (`http://localhost:3500`)

```bash
cd server
npm i
npm run start:dev
```

2. Клієнт (`http://localhost:5173`)

```bash
cd client
npm i
npm start
```

### Docker

```bash
docker compose up --build -d
```

---
