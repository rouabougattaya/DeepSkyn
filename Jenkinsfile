pipeline {
    agent any

    environment {
        PROJECT_NAME = "DeepSkyn"
        COMPOSE_PROJECT_NAME = "deepskynv1"
    }

    stages {
        stage('Checkout') {
            steps {
                echo "📦 Retrieving source code from GitHub..."
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
                echo "🐳 Building Docker images..."
                sh 'docker-compose build backend frontend'
            }
        }

        stage('Deploy') {
            steps {
                echo "🚀 Deploying containers..."
                sh '''
                    # Recréer uniquement backend et frontend (sans toucher à db)
                    docker-compose up -d --force-recreate --no-deps backend frontend
                    
                    # Vérifier l'état
                    sleep 5
                    docker-compose ps
                '''
            }
        }

        stage('Verify') {
            steps {
                echo "🏥 Verifying deployment..."
                sh '''
                    # Vérifier que le backend répond
                    curl -s -o /dev/null -w "Backend: %{http_code}\\n" http://localhost:3001/api/plans || echo "Backend not ready"
                    
                    # Vérifier que le frontend répond
                    curl -s -o /dev/null -w "Frontend: %{http_code}\\n" http://localhost || echo "Frontend not ready"
                '''
            }
        }
    }

    post {
        success {
            echo "✅ Pipeline completed successfully!"
            echo "📱 Application: http://localhost"
            echo "🔧 Jenkins: http://localhost:8080"
        }
        failure {
            echo "❌ Pipeline failed."
            sh 'docker-compose logs --tail=30 backend || true'
        }
    }
}