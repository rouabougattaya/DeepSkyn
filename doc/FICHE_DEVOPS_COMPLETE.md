# FICHE DEVOPS COMPLETE - DEEPSKYN

Date: 2026-04-21

Objectif de cette fiche:
- Comprendre simplement Docker, Kubernetes, CI/CD, SonarQube, Monitoring.
- Savoir a quoi servent les fichiers crees dans ce projet.
- Avoir un plan de demo clair pour la soutenance.

---

## 1) Vue globale (version simple)

Un projet DevOps complet suit ce chemin:
1. Le code est pousse sur GitHub.
2. La CI lance build + tests automatiques.
3. Si la CI reussit, la CD construit des images Docker et deploie.
4. Kubernetes fait tourner les applications (frontend, backend, base de donnees).
5. Prometheus/Grafana/Alertmanager surveillent l'etat et envoient des alertes.
6. SonarQube mesure la qualite et la couverture des tests.

---

## 2) C est quoi Docker ?

Definition simple:
- Docker met ton application dans une boite standard (conteneur).
- La boite tourne pareil sur toutes les machines.

Pourquoi c est utile:
- Evite les problemes "chez moi ca marche".
- Facilite le deploiement automatique.

Fichiers Docker de ce projet:
- backend/Dockerfile
- backend/.dockerignore
- frontend/Dockerfile
- frontend/.dockerignore

Ce que font ces fichiers:
- Dockerfile backend: installe dependances, build NestJS, lance le serveur.
- Dockerfile frontend: build Vite, sert les fichiers avec Nginx.
- .dockerignore: evite de copier des fichiers inutiles dans l image (node_modules, dist, etc.).

---

## 3) C est quoi Kubernetes (K8s) ?

Definition simple:
- Docker cree les conteneurs.
- Kubernetes les orchestre (demarre, redemarre, scale, expose reseau).

Pourquoi c est utile:
- Plus robuste en production.
- Peut gerer plusieurs copies de service.
- Supporte bien les deploiements continus.

Fichiers K8s de ce projet:
- k8s/namespace.yaml
- k8s/postgres.yaml
- k8s/backend.yaml
- k8s/frontend.yaml
- k8s/ingress.yaml

Role de chaque fichier:
1. namespace.yaml
- Cree l espace logique "deepskyn".

2. postgres.yaml
- Deploye PostgreSQL.
- Cree un service pour que le backend puisse s y connecter.
- Cree un stockage persistant (PVC).

3. backend.yaml
- Deploye le backend (2 replicas).
- Expose un service interne sur le port backend.
- Defini des probes (readiness/liveness) pour verifier la sante.

4. frontend.yaml
- Deploye le frontend (2 replicas).
- Expose un service interne.

5. ingress.yaml
- Route les requetes externes vers frontend et backend.
- Ex: host web -> frontend, host api -> backend.

---

## 4) C est quoi CI/CD ?

Definition simple:
- CI (Continuous Integration): verifier automatiquement le code.
- CD (Continuous Deployment/Delivery): deployer automatiquement apres succes CI.

Fichiers workflows presents:
- .github/workflows/ci-backend.yml
- .github/workflows/ci-frontend.yml
- .github/workflows/cd-backend.yml
- .github/workflows/cd-frontend.yml

Ce que fait la CI backend:
1. checkout code
2. setup node
3. npm ci
4. npm run build
5. npm run test:cov
6. upload couverture
7. scan Sonar (si secrets presents)

Ce que fait la CI frontend:
1. checkout code
2. setup node
3. npm ci
4. npm run build
5. npm run test:cov
6. upload couverture
7. scan Sonar (si secrets presents)

Ce que font les CD backend/frontend:
1. Se declenchent seulement apres CI correspondant reussi.
2. Build image Docker.
3. Push image dans registry (GHCR).
4. Deploiement K8s si secret kube configure.

---

## 5) C est quoi SonarQube ?

Definition simple:
- Outil de qualite de code.
- Mesure bugs, smells, dette technique, couverture tests.

Fichier de config:
- sonar-project.properties

Ce qu il faut montrer en soutenance:
1. Etat avant correction (captures).
2. Etat apres correction/refactoring.
3. Couverture de tests visible.

Secrets necessaires pour scan Sonar dans GitHub Actions:
- SONAR_HOST_URL
- SONAR_TOKEN

---

## 6) C est quoi Monitoring + Alerting ?

Definition simple:
- Monitoring: observer la sante de la plateforme et des apps.
- Alerting: envoyer une alerte quand il y a un probleme.

Fichiers monitoring presents:
- monitoring/docker-compose.yml
- monitoring/prometheus.yml
- monitoring/alert.rules.yml
- monitoring/alertmanager.yml
- monitoring/blackbox.yml
- monitoring/README.md

Role de chaque composant:
1. Prometheus
- Recupere les metriques.

2. Grafana
- Affiche des dashboards visuels.

3. Alertmanager
- Gere et envoie les alertes.

4. Node Exporter
- Metriques systeme machine (CPU, RAM, disque).

5. cAdvisor
- Metriques conteneurs Docker.

6. Blackbox Exporter
- Verifie si URLs frontend/backend repondent.

Exemples d alertes configurees:
- BackendDown
- FrontendDown
- HighNodeCpu

---

## 7) Tests unitaires integres

Backend:
- Commande locale: npm run test:cov
- Utilisee dans CI backend.

Frontend:
- Vitest configure dans frontend.
- Test exemple: frontend/src/lib/utils.test.ts
- Commande locale: npm run test:cov
- Utilisee dans CI frontend.

Remarque importante:
- L evaluation regarde surtout l integration des tests dans pipeline.
- Les scenarios tres complexes ne sont pas obligatoires.

---

## 8) Commandes utiles (local)

Depuis la racine du projet:

1. Tester backend:
- cd backend
- npm ci
- npm run test:cov

2. Tester frontend:
- cd frontend
- npm ci
- npm run test:cov

3. Lancer monitoring:
- docker compose -f monitoring/docker-compose.yml up -d

4. Appliquer manifests K8s:
- kubectl apply -f k8s/namespace.yaml
- kubectl apply -f k8s/postgres.yaml
- kubectl apply -f k8s/backend.yaml
- kubectl apply -f k8s/frontend.yaml
- kubectl apply -f k8s/ingress.yaml

---

## 9) Secrets GitHub Actions a configurer

Dans Settings -> Secrets and variables -> Actions:
1. SONAR_HOST_URL
2. SONAR_TOKEN
3. KUBE_CONFIG_DATA

Note:
- KUBE_CONFIG_DATA = contenu kubeconfig encode en base64.

---

## 10) Plan de soutenance (5-7 min)

Script simple:
1. Expliquer l architecture
- "On a separe CI/CD backend et frontend, puis deploiement K8s."

2. Montrer pipelines
- Ouvrir les 4 workflows.
- Expliquer chainage CI -> CD.

3. Montrer tests dans CI
- Montrer etapes test:cov backend/frontend.
- Montrer artefacts coverage.

4. Montrer SonarQube
- Capture avant.
- Capture apres.
- Coverage visible.

5. Montrer Kubernetes
- Expliquer namespace, deploy, service, ingress.

6. Montrer monitoring
- Prometheus targets.
- Grafana dashboard.
- Regle alerte + Alertmanager.

7. Conclure
- "Le projet est automatisable, deployable et monitorable de bout en bout."

---

## 11) Check-list finale avant rendu

1. Les 4 workflows existent et s executent.
2. Les tests backend/frontend passent en CI.
3. Sonar est branche (host + token).
4. Couverture visible dans Sonar.
5. Les manifests K8s sont appliquables.
6. Monitoring demarre sans erreur.
7. Alertes visibles/testables.
8. Captures avant/apres pretes pour presentation.

---

## 12) Resume ultra-court

- Docker = packager app.
- Kubernetes = faire tourner les conteneurs a grande echelle.
- CI/CD = tester puis deployer automatiquement.
- SonarQube = qualite + couverture.
- Monitoring = observer + alerter.

Cette fiche couvre toute la partie DevOps demandee pour ton projet Full Stack JS.
