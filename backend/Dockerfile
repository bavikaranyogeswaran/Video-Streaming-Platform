# ── Stage 1: Build ──────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: Production ─────────────────────────────────────────
FROM node:20-alpine

# Install ffmpeg for real HLS transcoding (used from Day 4)
RUN apk add --no-cache ffmpeg

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Temp directory for upload processing
RUN mkdir -p /tmp/uploads

# Run as non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S appuser -u 1001 -G nodejs
RUN chown -R appuser:nodejs /app /tmp/uploads
USER appuser

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "dist/main.js"]
