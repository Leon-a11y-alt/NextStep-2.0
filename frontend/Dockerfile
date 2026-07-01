# --- NextStep frontend (Next.js) ---
# Starter Dockerfile for the Phase 2 DevOps work.
FROM node:18-alpine

WORKDIR /app

# Install dependencies first (better layer caching).
COPY package*.json ./
RUN npm install

# Copy source and build the production bundle.
COPY . .
RUN npm run build

# Next.js serves on port 3000.
EXPOSE 3000

CMD ["npm", "start"]
