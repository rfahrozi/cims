FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY services/zoom-provider/package.json services/zoom-provider/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build:packages && npm run build -w @cims/api

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/packages/domain/dist ./packages/domain/dist
COPY --from=build /app/packages/domain/package.json ./packages/domain/package.json
USER node
# Worker tidak expose HTTP port — health check via exit code proses node
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD pgrep -x node || exit 1
CMD ["node","apps/api/dist/worker.js"]
