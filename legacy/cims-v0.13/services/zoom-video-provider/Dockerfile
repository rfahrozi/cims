FROM node:22-alpine
WORKDIR /app
COPY services/zoom-video-provider ./services/zoom-video-provider
RUN mkdir -p /data && chown -R node:node /data /app
USER node
ENV ZOOM_ADAPTER_PORT=4200 ZOOM_ADAPTER_DB_PATH=/data/zoom-adapter.sqlite
EXPOSE 4200
CMD ["node", "services/zoom-video-provider/src/server.mjs"]
