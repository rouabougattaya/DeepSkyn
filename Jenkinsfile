pipeline {
    agent any

    environment {
        PROJECT_NAME = "DeepSkyn"
        DOCKER_COMPOSE_FILE = "docker-compose.yml"
    }

    stages {

        stage('1. Checkout') {
            steps {
                echo "Recuperation du code source..."
                checkout scm
            }
        }

        stage('2. Build Docker Images') {
            steps {
                echo "Construction des images Docker..."
                sh 'docker-compose build --no-cache'
            }
        }

        stage('3. Run Tests') {
            parallel {
                stage('Backend Tests') {
                    steps {
                        dir('backend') {
                            echo "Lancement des tests backend..."
                            sh 'npm install --legacy-peer-deps'
                            sh 'npm run test || true'
                        }
                    }
                }
                stage('Frontend Tests') {
                    steps {
                        dir('frontend') {
                            echo "Lancement des tests frontend..."
                            sh 'npm install --legacy-peer-deps'
                            sh 'npm run test || true'
                        }
                    }
                }
            }
        }

        stage('4. SonarQube Analysis') {
            steps {
                script {
                    def scannerHome = tool 'SonarScanner'
                    withSonarQubeEnv('SonarQube') {
                        sh """
                            ${scannerHome}/bin/sonar-scanner \
                            -Dsonar.projectKey=DeepSkyn \
                            -Dsonar.projectName=DeepSkyn \
                            -Dsonar.sources=backend/src,frontend/src \
                            -Dsonar.host.url=${SONAR_HOST_URL}
                        """
                    }
                }
            }
        }

        stage('5. Deploy with Docker Compose') {
            steps {
                echo "Deploiement des containers..."
                sh 'docker-compose down || true'
                sh 'docker-compose up -d'
                echo "Application disponible sur http://localhost"
            }
        }
    }

    post {
        success {
            echo "Pipeline reussi ! DeepSkyn est en ligne."
        }
        failure {
            echo "Le pipeline a echoue. Verifiez les logs."
        }
        always {
            echo "Nettoyage des images inutilisees..."
            sh 'docker image prune -f || true'
        }
    }
}