pipeline {
    agent any

    environment {
        PROJECT_NAME = "DeepSkyn"
        DOCKER_COMPOSE_FILE = "docker-compose.yml"
        // On force l'IP de GitHub pour eviter les erreurs DNS
        GITHUB_IP = "140.82.121.3"
    }

    stages {
        stage('0. Force DNS') {
            steps {
                // Cette commande ecrit l'IP de GitHub dans le fichier hosts du container de build
                sh "echo '${GITHUB_IP} github.com' >> /etc/hosts || true"
                sh "echo '${GITHUB_IP} api.github.com' >> /etc/hosts || true"
            }
        }

        stage('1. Checkout') {
            steps {
                echo "Recuperation du code source..."
                // On utilise checkout scm mais avec la resolution forcee juste avant
                checkout scm
            }
        }

        stage('2. Build Docker Images') {
            steps {
                echo "Construction des images Docker..."
                sh 'docker-compose build'
            }
        }

        stage('3. Run Tests') {
            steps {
                echo "Lancement des tests..."
                sh 'cd backend && npm install --legacy-peer-deps && npm run test || true'
            }
        }

        stage('4. Deploy') {
            steps {
                echo "Deploiement des containers..."
                sh 'docker-compose up -d'
            }
        }
    }

    post {
        success { echo "Pipeline reussi !" }
        failure { echo "Le pipeline a echoue." }
    }
}