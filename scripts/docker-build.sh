#!/bin/bash
# scripts/docker-build.sh

echo "🔨 Construction des images DeepSkyn..."

docker build -t deepskyn-backend:latest -f backend/Dockerfile.prod backend/
docker build -t deepskyn-frontend:latest \
  --build-arg VITE_API_BASE_URL=http://localhost:3001/api \
  -f frontend/Dockerfile.prod frontend/

echo "✅ Images prêtes !"
