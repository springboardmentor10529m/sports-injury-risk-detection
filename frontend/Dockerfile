# ==========================================
# Stage 1: Build the React Application
# ==========================================
FROM node:20-alpine AS build-stage

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install project dependencies
RUN npm ci || npm install

# Copy application source files
COPY . .

# Build production bundle to /app/dist
RUN npm run build

# ==========================================
# Stage 2: Production Nginx Server
# ==========================================
FROM nginx:alpine AS production-stage

# Copy custom reverse-proxy and SPA routing Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static assets from build-stage
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

# Run Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
