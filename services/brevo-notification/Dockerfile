FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY services/zoom-provider/package.json services/zoom-provider/package.json
COPY services/brevo-notification/package.json services/brevo-notification/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build -w @cims/brevo-notification

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/services/brevo-notification/dist ./services/brevo-notification/dist
COPY --from=build /app/services/brevo-notification/package.json ./services/brevo-notification/package.json
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3020/health || exit 1
USER node
CMD ["node","services/brevo-notification/dist/main.js"]
