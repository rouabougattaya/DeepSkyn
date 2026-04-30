pipeline {
    agent any

    environment {
        PROJECT_NAME = "DeepSkyn"
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

        stage('Build & Deploy') {
            steps {
                echo "🐳 Building and deploying..."
                sh '''
                    # Arrêter et supprimer les anciens conteneurs backend/frontend
                    docker stop deepskyn-backend deepskyn-frontend 2>/dev/null || true
                    docker rm deepskyn-backend deepskyn-frontend 2>/dev/null || true
                    
                    # Rebuild des images
                    docker build -t deepskynv1-backend:latest ./backend
                    docker build -t deepskynv1-frontend:latest ./frontend
                    
                    # Lancer le backend
                    docker run -d \
                        --name deepskyn-backend \
                        --network deepskyn_network \
                        -p 3001:3001 \
                        --restart always \
                        deepskynv1-backend:latest
                    
                    # Lancer le frontend
                    docker run -d \
                        --name deepskyn-frontend \
                        --network deepskyn_network \
                        -p 80:80 \
                        --restart always \
                        deepskynv1-frontend:latest
                    
                    # Vérifier que les conteneurs tournent
                    sleep 5
                    docker ps | grep deepskyn
                '''
            }
        }

        stage('Verify') {
            steps {
                echo "🏥 Verifying..."
                sh '''
                    curl -s -o /dev/null -w "Backend: %{http_code}\\n" http://localhost:3001/api/plans
                    curl -s -o /dev/null -w "Frontend: %{http_code}\\n" http://localhost
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
            sh 'docker logs deepskyn-backend --tail=30 2>/dev/null || true'
        }
    }
}