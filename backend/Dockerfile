FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Hardening: nothing in this image needs a package manager at runtime (the CMD
# is `node server.js`), and npm bundles its own copy of node-tar, which is what
# the Trivy image gate flagged (CVE-2026-59873). Removing npm removes both the
# finding and a real chunk of attack surface from production.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx
RUN addgroup -S app && adduser -S app -G app
COPY --from=deps /app/node_modules ./node_modules
COPY --chown=app:app . .
USER app
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://localhost:4000/api/health || exit 1
CMD ["node", "server.js"]