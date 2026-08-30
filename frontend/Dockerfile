# ==============================================================================
# Frontend Dockerfile - Multi-Stage Production Build
# ==============================================================================

# --- Stage 1: Build the React Application ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package dependency definitions
COPY package.json package-lock.json* ./

# Install clean dependencies
RUN npm ci

# Copy source code and build config
COPY . .

# Build production bundle to dist/
RUN npm run build

# --- Stage 2: Serve with Nginx ---
FROM nginx:alpine AS runner

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built application from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx reverse proxy configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
