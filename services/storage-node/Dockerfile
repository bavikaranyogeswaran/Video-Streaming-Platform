# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY src ./src
COPY tsconfig.json ./
RUN npm run build

# Stage 2: Production
FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

# Create video storage directory
RUN mkdir -p /videos

# Run as non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S appuser -u 1001 -G nodejs
RUN chown -R appuser:nodejs /app /videos
USER appuser

EXPOSE 4001

HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://localhost:4001/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
