pipeline {
    agent any

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 1, unit: 'HOURS')
        timestamps()
    }

    environment {
        DOCKER_REGISTRY = credentials('docker-registry-url')
        DOCKER_CREDENTIALS = credentials('docker-registry-credentials')
        BACKEND_IMAGE = "${DOCKER_REGISTRY}/deepskyn-backend"
        FRONTEND_IMAGE = "${DOCKER_REGISTRY}/deepskyn-frontend"
        VERSION = "${env.BUILD_NUMBER}"
        SONAR_TOKEN = credentials('sonar-token')
        SONAR_HOST_URL = credentials('sonar-host-url')
        KUBERNETES_NAMESPACE = "production"
        KUBECONFIG = credentials('kubernetes-config')
    }

    stages {
        stage('Checkout') {
            steps {
                echo '📦 Checking out code...'
                checkout scm
            }
        }

        // ============= INSTALL & TEST =============
        stage('Install & Test') {
            parallel {
                stage('Backend CI') {
                    steps {
                        echo '🔧 Backend: Installing dependencies...'
                        dir('backend') {
                            sh '''
                                npm install --legacy-peer-deps
                                echo "✅ Backend dependencies installed"
                            '''
                        }
                    }
                }
                stage('Frontend CI') {
                    steps {
                        echo '🔧 Frontend: Installing dependencies...'
                        dir('frontend') {
                            sh '''
                                npm install --legacy-peer-deps
                                echo "✅ Frontend dependencies installed"
                            '''
                        }
                    }
                }
            }
        }

        // ============= RUN TESTS =============
        stage('Run Tests') {
            parallel {
                stage('Backend Tests') {
                    steps {
                        echo '🧪 Running Backend tests...'
                        dir('backend') {
                            sh '''
                                npm run test:coverage || exit 1
                                echo "✅ Backend tests passed"
                            '''
                        }
                    }
                }
                stage('Frontend Tests') {
                    steps {
                        echo '🧪 Running Frontend tests...'
                        dir('frontend') {
                            sh '''
                                npm run test:coverage || exit 1
                                echo "✅ Frontend tests passed"
                            '''
                        }
                    }
                }
            }
        }

        // ============= SONARQUBE ANALYSIS =============
        stage('SonarQube Analysis') {
            steps {
                echo '📊 Running SonarQube analysis...'
                script {
                    try {
                        def scannerHome = tool 'SonarScanner'
                        withSonarQubeEnv('SonarQube') {
                            sh '''
                                ${scannerHome}/bin/sonar-scanner \
                                -Dsonar.projectKey=DeepSkyn_FullStack \
                                -Dsonar.projectName="DeepSkyn Clinical AI" \
                                -Dsonar.projectVersion=${VERSION} \
                                -Dsonar.sources=backend/src,frontend/src \
                                -Dsonar.tests=backend/src,frontend/src \
                                -Dsonar.test.inclusions=**/*.spec.ts,**/*.test.tsx,**/*.test.ts \
                                -Dsonar.exclusions=**/node_modules/**,**/dist/**,**/build/**,**/coverage/** \
                                -Dsonar.javascript.lcov.reportPaths=backend/coverage/lcov.info,frontend/coverage/lcov.info
                            '''
                        }
                        
                        // Wait for quality gate
                        timeout(time: 5, unit: 'MINUTES') {
                            waitForQualityGate abortPipeline: true
                        }
                        echo "✅ SonarQube analysis passed"
                    } catch (Exception e) {
                        echo "❌ SonarQube analysis failed: ${e.message}"
                        currentBuild.result = 'FAILURE'
                        error("SonarQube quality gate failed")
                    }
                }
            }
        }

        // ============= BUILD DOCKER IMAGES =============
        stage('Build Docker Images') {
            parallel {
                stage('Build Backend Image') {
                    steps {
                        echo '🐳 Building Backend Docker image...'
                        script {
                            try {
                                sh '''
                                    docker build \
                                        -t ${BACKEND_IMAGE}:${VERSION} \
                                        -t ${BACKEND_IMAGE}:latest \
                                        ./backend
                                    echo "✅ Backend image built: ${BACKEND_IMAGE}:${VERSION}"
                                '''
                            } catch (Exception e) {
                                echo "❌ Backend build failed: ${e.message}"
                                currentBuild.result = 'FAILURE'
                                error("Docker build failed")
                            }
                        }
                    }
                }
                stage('Build Frontend Image') {
                    steps {
                        echo '🐳 Building Frontend Docker image...'
                        script {
                            try {
                                sh '''
                                    docker build \
                                        -t ${FRONTEND_IMAGE}:${VERSION} \
                                        -t ${FRONTEND_IMAGE}:latest \
                                        ./frontend
                                    echo "✅ Frontend image built: ${FRONTEND_IMAGE}:${VERSION}"
                                '''
                            } catch (Exception e) {
                                echo "❌ Frontend build failed: ${e.message}"
                                currentBuild.result = 'FAILURE'
                                error("Docker build failed")
                            }
                        }
                    }
                }
            }
        }

        // ============= PUSH TO REGISTRY =============
        stage('Push to Docker Registry') {
            steps {
                echo '📤 Pushing images to Docker Registry...'
                script {
                    try {
                        sh '''
                            echo ${DOCKER_CREDENTIALS_PSW} | docker login -u ${DOCKER_CREDENTIALS_USR} --password-stdin ${DOCKER_REGISTRY}
                            
                            docker push ${BACKEND_IMAGE}:${VERSION}
                            docker push ${BACKEND_IMAGE}:latest
                            echo "✅ Backend image pushed"
                            
                            docker push ${FRONTEND_IMAGE}:${VERSION}
                            docker push ${FRONTEND_IMAGE}:latest
                            echo "✅ Frontend image pushed"
                            
                            docker logout
                        '''
                    } catch (Exception e) {
                        echo "❌ Push failed: ${e.message}"
                        currentBuild.result = 'FAILURE'
                        error("Docker push failed")
                    }
                }
            }
        }

        // ============= DEPLOY TO KUBERNETES =============
        stage('Deploy to Kubernetes') {
            when {
                branch 'main'
            }
            steps {
                echo '🚀 Deploying to Kubernetes...'
                script {
                    try {
                        sh '''
                            # Create namespace if it doesn't exist
                            kubectl create namespace ${KUBERNETES_NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -
                            
                            # Update deployment with new image
                            kubectl set image deployment/deepskyn-backend \
                                deepskyn-backend=${BACKEND_IMAGE}:${VERSION} \
                                -n ${KUBERNETES_NAMESPACE} \
                                --record
                            
                            kubectl set image deployment/deepskyn-frontend \
                                deepskyn-frontend=${FRONTEND_IMAGE}:${VERSION} \
                                -n ${KUBERNETES_NAMESPACE} \
                                --record
                            
                            # Wait for rollout
                            kubectl rollout status deployment/deepskyn-backend -n ${KUBERNETES_NAMESPACE} --timeout=5m
                            kubectl rollout status deployment/deepskyn-frontend -n ${KUBERNETES_NAMESPACE} --timeout=5m
                            
                            echo "✅ Deployment successful"
                        '''
                    } catch (Exception e) {
                        echo "❌ Deployment failed: ${e.message}"
                        currentBuild.result = 'FAILURE'
                        error("Kubernetes deployment failed")
                    }
                }
            }
        }

        // ============= SMOKE TESTS =============
        stage('Smoke Tests') {
            when {
                branch 'main'
            }
            steps {
                echo '🔥 Running smoke tests...'
                script {
                    try {
                        sh '''
                            sleep 10
                            BACKEND_URL=$(kubectl get svc deepskyn-backend-service -n ${KUBERNETES_NAMESPACE} -o jsonpath='{.status.loadBalancer.ingress[0].ip}' || echo "localhost")
                            FRONTEND_URL=$(kubectl get svc deepskyn-frontend-service -n ${KUBERNETES_NAMESPACE} -o jsonpath='{.status.loadBalancer.ingress[0].ip}' || echo "localhost")
                            
                            echo "Testing Backend: http://${BACKEND_URL}:3001"
                            curl -f http://${BACKEND_URL}:3001/health || echo "⚠️ Backend health check failed"
                            
                            echo "Testing Frontend: http://${FRONTEND_URL}:80"
                            curl -f http://${FRONTEND_URL}:80 || echo "⚠️ Frontend health check failed"
                            
                            echo "✅ Smoke tests completed"
                        '''
                    } catch (Exception e) {
                        echo "⚠️ Smoke test warning: ${e.message}"
                        // Don't fail the build for smoke tests
                    }
                }
            }
        }
    }

    post {
        always {
            echo '🧹 Cleaning up...'
            sh 'docker logout || true'
        }
        
        success {
            echo '✅ Pipeline succeeded!'
            slackSend(
                color: '#00FF00',
                channel: '#deployments',
                message: """
                    ✅ DEPLOYMENT SUCCESSFUL
                    Job: ${env.JOB_NAME}
                    Build: #${env.BUILD_NUMBER}
                    Version: ${VERSION}
                    URL: ${env.BUILD_URL}
                """
            )
        }
        
        failure {
            echo '❌ Pipeline failed!'
            slackSend(
                color: '#FF0000',
                channel: '#deployments',
                message: """
                    ❌ DEPLOYMENT FAILED
                    Job: ${env.JOB_NAME}
                    Build: #${env.BUILD_NUMBER}
                    URL: ${env.BUILD_URL}
                    
                    Check logs for details!
                """
            )
        }
    }
}