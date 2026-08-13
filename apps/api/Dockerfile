FROM node:22-alpine AS build
WORKDIR /app

# Copy semua package.json untuk workspace
COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY services/zoom-provider/package.json services/zoom-provider/package.json
COPY services/brevo-notification/package.json services/brevo-notification/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/contracts/package.json packages/contracts/package.json

# Install root workspace dependencies
RUN npm install --no-audit --no-fund

# Copy seluruh source code
COPY . .

# Install LANGSUNG di folder apps/api untuk memastikan semua deps tersedia
# Ini yang selama ini hilang!
WORKDIR /app/apps/api
RUN npm install --no-audit --no-fund

# Kembali ke root dan build
WORKDIR /app
RUN npm run build:packages && npm run build -w @cims/api

# =============================================================================
# Runtime Stage
# =============================================================================
FROM node:22-alpine AS runtime
WORKDIR /app

# Salin node_modules dari root (berisi shared deps)
COPY --from=build /app/node_modules ./node_modules

# Salin node_modules dari apps/api (berisi @fastify/helmet, reflect-metadata, dll)
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules

# Salin hasil build
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json

# Salin packages
COPY --from=build /app/packages/domain/dist ./packages/domain/dist
COPY --from=build /app/packages/domain/package.json ./packages/domain/package.json
COPY --from=build /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=build /app/packages/contracts/package.json ./packages/contracts/package.json

ENV NODE_ENV=production
USER node

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node","apps/api/dist/main.js"]
