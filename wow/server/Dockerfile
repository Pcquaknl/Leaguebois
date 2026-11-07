FROM node:24.22.1-alpine
WORKDIR /app
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev --ignore-scripts && mkdir -p /data && chown node:node /data
COPY characters.json ./characters.json
COPY server/*.mjs ./server/
USER node
ENV NODE_ENV=production PORT=8080 LEAGUEBOIS_DB=/data/live.sqlite LEAGUEBOIS_CONFIG=/run/leaguebois/settings.json
EXPOSE 8080
CMD ["node", "server/index.mjs"]
