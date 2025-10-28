# Multi-stage build for client (Vite) and server (Express)
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@8

# Copy package files first for caching
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile --offline || pnpm install --frozen-lockfile

# Copy rest of the source
COPY . .

# Build client and server
RUN pnpm run build

# Runtime image
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy built artifacts
COPY --from=builder /app/dist/server ./dist/server
COPY --from=builder /app/dist/spa ./dist/spa

# Copy production dependencies from builder to avoid re-install in runtime
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 8080

# Start the Node server that serves the SPA and API
CMD ["node", "dist/server/node-build.mjs"]
