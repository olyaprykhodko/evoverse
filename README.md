# [FileStorage](https://evoverse-git-express-server-ouprihodko-gmailcoms-projects.vercel.app) (Express.js)

Веб-застосунок для завантаження, перегляду та видалення файлів із динамічним лімітом сховища на основі кастомного Express-генератора `gen-express-cli`

---

## Превʼю

Деплой: Render (сервер) + Vercel (клієнт).

> **Увага:** сервер розгорнуто на безкоштовному інстансі Render, який переходить у сплячий режим після 15 хвилин неактивності. Перший запит після простою може зайняти до 60 секунд.

## Стек

- **Сервер:** Node.js 25 + TypeScript + ESM + Express.js + Zod + Winston + `file-type`
- **Клієнт:** React 19 + TypeScript + Tailwind CSS

---

## Опис

- Завантаження файлів потоком (`req.pipe`) без буферизації в памʼяті
- Статус завантаження
- Перегляд та видалення окремих файлів, очищення всього сховища
- Відображення зайнятого місця у сховищі з прогрес-баром
- Налаштування ліміту сховища через окремим маршрутом (від 3 MB до 1 GB)
- Валідація формату файлу: перевірка розширення + реального MIME через `file-type`
- Для форматів `.txt`, `.csv`, `.json` перевірка лише за розширенням

**Дозволені формати:** `.pdf` · `.png` · `.jpeg` · `.gif` · `.webp` · `.txt` · `.csv` · `.json` · `.mp3` · `.mp4` · `.zip`

---

## Реалізація

- `storage.ts` — зберігає стан та ліміт сховища
- Санітизація імені файлу (функція`normalizeFileName` - захист від path traversal і shell injection)
- Унікальність імен: `resolveUniqueFileName` додає лічильник (`file-1.pdf`, `file-2.pdf`)
- `file-type` повертає `undefined` для `.txt` / `.csv` / `.json`, тому що вони не мають magic bytes, тож перевірка тільки за розширенням (`TEXT_EXTS`)

## Архітектура сервера (шаблон [gen-express-cli](https://www.npmjs.com/package/gen-express-cli))

```
src/
├── app.ts              # Express-застосунок: middleware, маршрути
├── server.ts           # Точка входу: запуск, graceful shutdown
├── storage.ts          # Стан сховища: Map<id, FileRecord>, динамічний ліміт, резервація місця
├── config/
│   └── env.ts          # Валідація змінних середовища через Zod
├── middlewares/
│   ├── error-handler.ts  # AppError + централізований error middleware
│   ├── logger.ts         # Winston logger + Morgan HTTP-логування
│   └── validate.ts       # Zod-валідація params/query/body
└── modules/
    ├── file/
    │   ├── file.types.ts       # FileRecord, LoadingStatus
    │   ├── file.schema.ts      # Zod-схеми для параметрів маршрутів
    │   ├── file.service.ts     # Основна логіка: upload, статус, список, видалення
    │   ├── file.controller.ts  # HTTP-обробники: парсинг заголовків, виклик сервісу
    │   └── file.route.ts       # Реєстрація маршрутів файлів
    ├── storage/
    │   ├── storage.schema.ts   # Zod-схема для встановлення ліміту
    │   ├── storage.controller.ts # GET /storage, PUT /storage/limit
    │   └── storage.route.ts    # Реєстрація маршрутів сховища
    └── healthcheck/            # Перевірка живучості сервера
```

---

## API

| Метод    | Маршрут             | Опис                                                 |
| -------- | ------------------- | ---------------------------------------------------- |
| `POST`   | `/files`            | Завантажити файл (stream)                            |
| `GET`    | `/files/status/:id` | Статус завантаження файлу (поллінг під час запису)   |
| `GET`    | `/files`            | Список файлів + інфо про сховище                     |
| `GET`    | `/files/:id`        | Отримати файл                                        |
| `DELETE` | `/files/remove`     | Видалити всі файли                                   |
| `DELETE` | `/files/:id`        | Видалити файл                                        |
| `GET`    | `/storage`          | Поточний ліміт і зайняте місце                       |
| `PUT`    | `/storage/limit`    | Встановити ліміт сховища `{ limit: number }` (bytes) |
| `GET`    | `/api/health`       | Healthcheck                                          |

---

## Запуск

```bash
git clone https://github.com/olyaprykhodko/evoverse
cd evoverse
git checkout express-server
```

### Локальний запуск

1. Сервер (`http://localhost:3500`)

```bash
cd server
cp .env.example .env
npm i
npm run dev
```

2. Клієнт (`http://localhost:5173`)

```bash
cd client
cp .env.example .env
npm i
npm start
```

### Docker

```bash
docker compose up --build -d
```

---
