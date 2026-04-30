# Guide Kubernetes (Kubeadm) - DeepSkyn

Ce guide détaille les étapes pour déployer l'application sur un cluster Kubernetes.

## 1. Création de l'espace de travail
```bash
kubectl apply -f k8s/postgres.yaml  # Crée aussi le namespace 'deepskyn'
```

## 2. Déploiement des services
Appliquez les manifests dans l'ordre :
```bash
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/frontend.yaml
```

## 3. Vérification
```bash
kubectl get pods -n deepskyn
kubectl get svc -n deepskyn
```

## 4. Accès au cluster
Les services sont exposés via **NodePort** :
- **Frontend** : http://<NODE_IP>:30080
- **Backend** : http://<NODE_IP>:30001
