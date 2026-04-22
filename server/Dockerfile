# --- 1. Build React client ---
FROM node:25-alpine AS client-builder

WORKDIR /app

COPY client/package*.json ./

RUN npm ci

COPY client/ .

ENV REACT_APP_API_URL=''

RUN npm run build

# --- 2. Build NestJS server ---
FROM node:25-alpine AS server-builder

WORKDIR /app

COPY server/package*.json ./

RUN npm ci

COPY server/ .

RUN npm run build

# --- 3. Production image ---
FROM node:25-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3100

RUN adduser --system --disabled-password appuser

COPY server/package*.json ./

RUN npm ci --omit=dev

COPY --from=server-builder /app/dist ./dist
COPY --from=client-builder /app/build ./client/build

RUN mkdir -p data/tmp && chown -R appuser:nogroup data

USER appuser

EXPOSE 3100

CMD ["node", "dist/main.js"]
