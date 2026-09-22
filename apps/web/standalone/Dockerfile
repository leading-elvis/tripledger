FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --include=dev --include=optional --no-audit --no-fund
COPY . .
RUN node node_modules/vite/bin/vite.js build --config standalone/vite.config.ts

FROM node:24-bookworm-slim
WORKDIR /app
COPY --from=build /app/dist-standalone ./dist-standalone
COPY --from=build /app/standalone ./standalone
COPY --from=build /app/lib ./lib
COPY --from=build /app/drizzle ./drizzle
RUN mkdir /data && chown node:node /data
ENV HOST=0.0.0.0 PORT=4180 DATA_DIR=/data
USER node
EXPOSE 4180
CMD ["node", "standalone/server.mjs"]
