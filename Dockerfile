# Field Snap AI - Simple Production Dockerfile
FROM oven/bun:1-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile

# Copy all source files
COPY . .

# Debug: List all files in the container
RUN echo "=== Files in /app ===" && ls -la /app/
RUN echo "=== Looking for server files ===" && find /app -name "*.ts" -type f

# Set environment
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Use production server with logging
CMD ["bun", "run", "production-server.ts"]