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
RUN npm run build -w @cims/zoom-provider

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/services/zoom-provider/dist ./services/zoom-provider/dist
COPY --from=build /app/services/zoom-provider/package.json ./services/zoom-provider/package.json
USER node
CMD ["node","services/zoom-provider/dist/main.js"]
