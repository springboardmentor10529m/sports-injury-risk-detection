FROM node:20-alpine

WORKDIR /app

# Copy package manifests and install dependencies
COPY package*.json ./
RUN npm install

# Copy application source files
COPY . .

# Expose Vite dev server port
EXPOSE 5173

# Start Vite dev server on host 0.0.0.0
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
