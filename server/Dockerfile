FROM node:25-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

FROM node:25-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3500

RUN adduser --system --disabled-password appuser

COPY package*.json ./

RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

RUN mkdir -p data/tmp && chown -R appuser:nogroup data

USER appuser

EXPOSE 3500

CMD ["node", "dist/main.js"]
