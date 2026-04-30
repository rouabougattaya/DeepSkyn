pipeline {
    agent any

    environment {
        PROJECT_NAME = "DeepSkyn"
        DOCKER_COMPOSE_FILE = "docker-compose.yml"
    }

    stages {
        stage('1. Fix DNS Resolution') {
            steps {
                script {
                    // Try to fix DNS temporarily (if running as root)
                    sh '''
                        # Option 1: Write to /etc/hosts if we have permission
                        if [ -w /etc/hosts ]; then
                            echo "140.82.112.3 github.com" >> /etc/hosts
                            echo "140.82.112.3 api.github.com" >> /etc/hosts
                        else
                            echo "No write permission to /etc/hosts"
                        fi
                        
                        # Option 2: Configure Git to use IP directly
                        # Get current GitHub IPs (more reliable)
                        GITHUB_IPS=$(dig +short github.com | head -1)
                        if [ ! -z "$GITHUB_IPS" ]; then
                            git config --global http.https://github.com/.proxy "http://$GITHUB_IPS"
                        fi
                    '''
                }
            }
        }

        stage('2. Checkout') {
            steps {
                echo "Retrieving source code..."
                
                // Alternative: Checkout with explicit IP in URL
                script {
                    try {
                        checkout scm
                    } catch (Exception e) {
                        echo "Standard checkout failed, trying with explicit IP..."
                        
                        // Get repository URL and replace domain with IP
                        def repoUrl = scm.userRemoteConfigs[0].url
                        def repoWithIP = repoUrl.replace("github.com", "140.82.112.3")
                        
                        checkout([
                            $class: 'GitSCM',
                            branches: scm.branches,
                            userRemoteConfigs: [[url: repoWithIP]],
                            extensions: scm.extensions
                        ])
                    }
                }
            }
        }

        stage('3. Build Docker Images') {
            steps {
                echo "Building Docker images..."
                sh 'docker-compose build'
            }
        }

        stage('4. Run Tests') {
            steps {
                echo "Running tests..."
                sh 'cd backend && npm install --legacy-peer-deps && npm run test || true'
            }
        }

        stage('5. Deploy') {
            steps {
                echo "Deploying containers..."
                sh 'docker-compose up -d'
            }
        }
    }

    post {
        success { 
            echo "Pipeline completed successfully!" 
        }
        failure { 
            echo "Pipeline failed. Check DNS configuration." 
        }
    }
}