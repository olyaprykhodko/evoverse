FROM node:25-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci && npm cache clean --force

COPY . .

EXPOSE 3000
CMD ["npm", "run", "start"]

