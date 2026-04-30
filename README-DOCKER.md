# Guide Docker (Sans Compose) - DeepSkyn

Ce guide explique comment faire tourner l'application en utilisant des conteneurs séparés.

## 1. Construction des images
Utilisez le script fourni pour construire les images optimisées :
```bash
sh scripts/docker-build.sh
```

## 2. Lancement des conteneurs
Le script de lancement gère la création du réseau Docker, le volume pour la persistance PostgreSQL et l'ordre de démarrage :
```bash
sh scripts/docker-run.sh
```

## 3. Accès
- **Frontend** : http://localhost
- **Backend API** : http://localhost:3001/api
- **PostgreSQL** : localhost:5432
