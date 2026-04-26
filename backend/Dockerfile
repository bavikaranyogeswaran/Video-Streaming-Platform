# ── Stage 1: Build ──────────────────────────────────────────────
FROM node:20 AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: Production ─────────────────────────────────────────
FROM node:20

# Install ffmpeg for real HLS transcoding (used from Day 4)
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json package-lock.json ./

# Temp directory for upload processing
RUN mkdir -p /tmp/uploads

EXPOSE 3000
CMD ["node", "dist/main.js"]
