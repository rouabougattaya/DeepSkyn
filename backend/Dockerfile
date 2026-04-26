# Build stage
FROM node:18-alpine AS build

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Run tests with coverage
RUN npm run test:coverage

# Production stage
FROM node:18-alpine

WORKDIR /app

COPY --from=build /app/package*.json ./
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules

EXPOSE 3001

CMD ["node", "dist/main.js"]
