# --- NextStep backend (Express API) ---
# Starter Dockerfile for the Phase 2 DevOps work.
FROM node:18-alpine

WORKDIR /app

# Install dependencies first (better layer caching).
COPY package*.json ./
RUN npm install --production

# Copy the rest of the backend source.
COPY . .

# The API listens on port 4000.
EXPOSE 4000

CMD ["npm", "start"]
