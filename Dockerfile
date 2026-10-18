# syntax=docker/dockerfile:1

# --- Compilación (TypeScript -> dist) ---
FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build

# --- Dependencias de producción (bcrypt es nativo: toolchain solo en esta etapa) ---
FROM node:24-slim AS prod-deps
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# --- Imagen final ---
FROM node:24-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
# Esquema de la base y herramientas de administración (se usan con "docker exec" o desde el kit de despliegue)
COPY db ./db
COPY scripts ./scripts
USER node
EXPOSE 3100
CMD ["node", "dist/main"]
