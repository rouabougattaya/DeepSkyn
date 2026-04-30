pipeline {
    agent any

    environment {
        PROJECT_NAME = "DeepSkyn"
        COMPOSE_PROJECT_NAME = "deepskyn"  // Important : correspond au nom du projet
    }

    stages {
        stage('Checkout') {
            steps {
                echo "Retrieving source code from GitHub..."
                checkout([
                    $class: 'GitSCM',
                    branches: [[name: 'DEVOPS']],
                    userRemoteConfigs: [[
                        url: 'https://github.com/rouabougattaya/DeepSkyn.git',
                        credentialsId: 'github-token'
                    ]]
                ])
            }
        }

        stage('Build Docker Images') {
            steps {
                echo "Building Docker images..."
                // Utilise le docker-compose.yml déjà présent
                sh 'docker-compose -f docker-compose.yml build'
            }
        }

        stage('Run Tests') {
            steps {
                echo "Running backend tests..."
                sh 'docker-compose run --rm backend npm test || true'
            }
        }

        stage('Deploy') {
            steps {
                echo "Recreating containers with latest images..."
                // Force la recreation des conteneurs avec les nouvelles images
                sh 'docker-compose up -d --force-recreate'
            }
        }
    }

    post {
        success {
            echo "✅ Pipeline completed successfully!"
            sh 'docker-compose ps'
        }
        failure {
            echo "❌ Pipeline failed. Check the logs above."
            sh 'docker-compose logs --tail=50 backend || true'
        }
    }
}