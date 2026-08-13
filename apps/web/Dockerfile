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

# Variabel ini HARUS tersedia saat build time (Vite men-bake nilai ini ke dalam JS)
ARG VITE_API_BASE_URL=https://devapps.pt-kepri.go.id/cims/api/v1
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build -w @cims/web

FROM nginx:1.27-alpine AS runtime
RUN mkdir -p /usr/share/nginx/html/cims
COPY --from=build /app/apps/web/dist /usr/share/nginx/html/cims
COPY apps/web/nginx.conf /etc/nginx/nginx.conf
USER nginx
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:8080/health || exit 1
CMD ["nginx", "-g", "daemon off;"]
