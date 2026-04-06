FROM node:25-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

FROM node:25-alpine

WORKDIR /app

ENV NODE_ENV=production

RUN adduser --system --disabled-password appuser

COPY package*.json ./

RUN npm ci --include=prod

COPY --from=builder --chown=appuser:appuser /app/dist ./dist

USER appuser

EXPOSE 8000

CMD ["node", "dist/src/server.js"]
