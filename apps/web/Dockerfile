FROM node:22-alpine

WORKDIR /app

# Явная установка pnpm (9.15.0 как в package.json) — надёжнее, чем lazy-download Corepack при сборке
RUN npm install -g pnpm@9.15.0

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 5173

CMD ["pnpm", "dev", "--host", "0.0.0.0", "--port", "5173"]
