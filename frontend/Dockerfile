# Build stage
FROM node:18-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Production stage (Nginx)
FROM nginx:alpine

# Copy build artifacts to Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom nginx config if exists, else use default
# COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
