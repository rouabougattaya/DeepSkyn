#!/bin/bash
# scripts/docker-run.sh

echo "🧹 Nettoyage des anciens conteneurs..."
docker rm -f deepskyn-backend deepskyn-frontend deepskyn-db 2>/dev/null || true

echo "🌐 Création du réseau..."
docker network create deepskyn-net 2>/dev/null || true

echo "🐘 Démarrage de PostgreSQL..."
docker run -d \
  --name deepskyn-db \
  --network deepskyn-net \
  --env-file .env.prod \
  -p 5432:5432 \
  postgres:15-alpine

echo "⏳ Attente de la base de données..."
sleep 5

echo "📡 Démarrage du Backend..."
docker run -d \
  --name deepskyn-backend \
  --network deepskyn-net \
  --env-file .env.prod \
  -p 3001:3001 \
  deepskyn-backend:latest

echo "💻 Démarrage du Frontend..."
docker run -d \
  --name deepskyn-frontend \
  --network deepskyn-net \
  -p 80:80 \
  deepskyn-frontend:latest

echo "✨ DeepSkyn est prêt sur http://localhost !"
docker ps
