# Huglu API Server Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    bash \
    curl \
    tzdata

# Set timezone
ENV TZ=Europe/Istanbul

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S huglu -u 1001

# Create logs directory
RUN mkdir -p logs && chown -R huglu:nodejs logs

# Copy application code
COPY . .

# Change ownership of app directory
RUN chown -R huglu:nodejs /app

# Switch to non-root user
USER huglu

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Start application
CMD ["npm", "run", "start:prod"]
