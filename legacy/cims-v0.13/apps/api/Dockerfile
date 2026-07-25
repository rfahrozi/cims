FROM node:22-alpine
WORKDIR /workspace
COPY . .
ENV CIMS_API_PORT=4000 CIMS_DB_PATH=/data/cims.sqlite
VOLUME ["/data"]
EXPOSE 4000
CMD ["node","apps/api/src/server.mjs"]
