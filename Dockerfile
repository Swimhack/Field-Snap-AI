# Field Snap AI - Web App Production Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install ALL dependencies (including devDependencies for build)
RUN npm install

# Copy source code (only what we need to build)
COPY tsconfig.json ./
COPY src/server.ts ./src/server.ts
COPY src/core ./src/core
COPY src/utils ./src/utils
COPY src/services ./src/services

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files and install only production dependencies
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY public ./public

# Set environment
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Start the server
CMD ["node", "dist/server.js"]
