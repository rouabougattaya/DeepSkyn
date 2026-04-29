# Build stage
FROM node:22-slim AS build

# Installation des outils de build et de libgomp1 (crucial pour ONNX/AI)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    curl \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000

COPY package*.json ./

# Installation explicite de onnxruntime-node et sharp
RUN npm install onnxruntime-node sharp --legacy-peer-deps || true

# Installation du reste des dépendances
RUN npm install --legacy-peer-deps

COPY . .

# Build
RUN npm run build

# Production stage
FROM node:22-slim

# On réinstalle libgomp1 dans l'image finale pour l'exécution
RUN apt-get update && apt-get install -y libgomp1 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=build /app/package*.json ./
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules

EXPOSE 3001

CMD ["sh", "-c", "if [ -f dist/main.js ]; then node dist/main.js; else node dist/src/main.js; fi"]
