# 🚀 Jenkins CI/CD Setup Guide for DeepSkyn

This guide outlines the steps to configure and run the CI/CD pipeline for the DeepSkyn Full Stack project.

## 1. Required Jenkins Plugins
Install the following plugins from **Manage Jenkins > Manage Plugins**:
- **Docker Pipeline**: For building/pushing images.
- **SonarQube Scanner**: For code quality analysis.
- **Kubernetes**: For deploying to K8s clusters.
- **Slack Notification**: For build alerts.
- **Pipeline: GitHub**: To trigger on code pushes.

## 2. Credentials Configuration
Go to **Manage Jenkins > Manage Credentials** and create the following:

| ID | Type | Purpose |
|----|------|---------|
| `docker-registry-creds` | Username/Password | Access to Docker Hub/Registry |
| `sonar-token` | Secret Text | Authentication for SonarQube |
| `k8s-config` | Secret File | Your `~/.kube/config` for cluster access |
| `slack-token` | Secret Text | Integration with Slack Webhook |
| `backend-secrets` | K8s Secret | Create this manually in your cluster: `kubectl create secret generic backend-secrets --from-env-file=.env` |

## 3. Tool Setup
Go to **Manage Jenkins > Global Tool Configuration**:
- **NodeJS**: Install 'Node 18.x'.
- **SonarQube Scanner**: Add 'SonarScanner' and name it `SonarScanner`.
- **Docker**: Ensure Docker is installed on the Jenkins agent.

## 4. Creating the Pipeline
1. Create a new **Pipeline** job in Jenkins.
2. Under **Build Triggers**, select **GitHub hook trigger for GITScm polling**.
3. Under **Pipeline**, select **Pipeline script from SCM**.
4. Set **SCM** to `Git`, add your repository URL, and set the branch to `main`.
5. Ensure the **Script Path** is set to `Jenkinsfile`.

## 5. Kubernetes Setup
Ensure your Kubernetes cluster is accessible from Jenkins. The pipeline uses `kubectl` to apply manifests in the `kubernetes/` directory.

---

### 🧪 Running the Pipeline
- **Automatic**: Push code to the `main` branch.
- **Manual**: Click **Build Now** in the Jenkins UI.

### 📊 Monitoring Quality
- Visit your SonarQube dashboard to view the **Code Coverage** and **Vulnerability Reports** after each build.
