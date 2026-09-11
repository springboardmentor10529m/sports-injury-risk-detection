# Stage 1: Build Vite/React production application
FROM node:20-alpine AS builder

WORKDIR /app

# Optional build argument for API URL (defaults to empty string for same-origin proxying through Nginx)
ARG VITE_API_URL=""
ENV VITE_API_URL=${VITE_API_URL}

# Copy package manifests and install dependencies with cache preservation
COPY package*.json ./
RUN npm ci --prefer-offline --no-audit

# Copy frontend source code and build production bundle
COPY . .
RUN npm run build

# Stage 2: Serve application using high-performance Nginx
FROM nginx:alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built app from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom optimized Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose HTTP port
EXPOSE 80

# Native healthcheck testing web server responsiveness
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
