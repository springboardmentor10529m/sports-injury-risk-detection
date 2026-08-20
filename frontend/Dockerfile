# Stage 1: Build Vite/React application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package manifests and install dependencies
COPY package*.json ./
RUN npm ci

# Copy frontend source code and build
COPY . .
RUN npm run build

# Stage 2: Serve application using Nginx
FROM nginx:alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built app from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
