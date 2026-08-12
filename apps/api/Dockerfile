FROM node:22-alpine AS build
WORKDIR /app

# Copy semua package.json dulu (untuk caching layer npm install)
COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY services/zoom-provider/package.json services/zoom-provider/package.json
COPY services/brevo-notification/package.json services/brevo-notification/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/contracts/package.json packages/contracts/package.json

# Install SEMUA dependency (termasuk @fastify/helmet, @fastify/rate-limit, dll)
# menggunakan package-lock.json agar versi PERSIS sama dengan yang di lokal
RUN npm ci --no-audit --no-fund

# Copy seluruh source code
COPY . .

# Build semua packages dan API
RUN npm run build:packages && npm run build -w @cims/api

# =============================================================================
# Runtime Stage - hanya menyalin hasil build dan node_modules yang LENGKAP
# =============================================================================
FROM node:22-alpine AS runtime
WORKDIR /app

# Salin node_modules LENGKAP dari build stage (ini yang paling penting!)
# node_modules dari `npm ci` sudah berisi @fastify/helmet dan semua depedencies
COPY --from=build /app/node_modules ./node_modules

# Salin hasil build API
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json

# Salin packages yang dibutuhkan runtime
COPY --from=build /app/packages/domain/dist ./packages/domain/dist
COPY --from=build /app/packages/domain/package.json ./packages/domain/package.json
COPY --from=build /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=build /app/packages/contracts/package.json ./packages/contracts/package.json

ENV NODE_ENV=production

USER node

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node","apps/api/dist/main.js"]
