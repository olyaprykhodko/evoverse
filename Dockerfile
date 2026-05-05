FROM node:25-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .
RUN npm run build


FROM node:25-alpine AS prod

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist           ./dist
COPY --from=builder /app/generated      ./generated
COPY --from=builder /app/prisma         ./prisma

EXPOSE 3300

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
