FROM node:20.11-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:20.11-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S app && adduser -S app -G app
COPY --from=deps /app/node_modules ./node_modules
COPY --chown=app:app . .
USER app
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://localhost:4000/api/health || exit 1
CMD ["node", "server.js"]