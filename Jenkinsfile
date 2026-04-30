pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                echo "📦 Récupération du code source..."
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
                echo "🐳 Construction et déploiement..."
                sh '''
                    # Arrêter et supprimer les anciens conteneurs
                    docker stop deepskyn-backend deepskyn-frontend 2>/dev/null || true
                    docker rm deepskyn-backend deepskyn-frontend 2>/dev/null || true
                    
                    # Builder les images
                    docker build -t deepskynv1-backend:latest ./backend
                    docker build -t deepskynv1-frontend:latest ./frontend
                    
                    # Démarrer le backend
                    docker run -d \
                        --name deepskyn-backend \
                        --network deepskyn_network \
                        -p 3001:3001 \
                        --restart always \
                        deepskynv1-backend:latest
                    
                    # Démarrer le frontend
                    docker run -d \
                        --name deepskyn-frontend \
                        --network deepskyn_network \
                        -p 80:80 \
                        --restart always \
                        deepskynv1-frontend:latest
                    
                    # Attendre le démarrage
                    sleep 10
                    
                    # Vérifier l'état
                    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
                '''
            }
        }

        stage('Verify') {
            steps {
                echo "🏥 Vérification..."
                sh '''
                    echo "Backend API:"
                    curl -s -o /dev/null -w "Status: %{http_code}\\n" http://localhost:3001/api/plans
                    
                    echo ""
                    echo "Frontend:"
                    curl -s -o /dev/null -w "Status: %{http_code}\\n" http://localhost
                '''
            }
        }
    }

    post {
        success {
            echo "✅ Pipeline réussi !"
            echo "📱 Application: http://localhost"
            echo "📡 API: http://localhost:3001"
            echo "🔧 Jenkins: http://localhost:8080"
            echo "📚 Swagger: http://localhost:3001/docs"
        }
        failure {
            echo "❌ Pipeline échoué"
            echo "Logs du backend:"
            sh 'docker logs deepskyn-backend --tail=30 2>/dev/null || echo "Conteneur non trouvé"'
        }
    }
}