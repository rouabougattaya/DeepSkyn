# Monitoring Stack (Prometheus + Alertmanager)

## Services

- Prometheus: http://localhost:9090
- Alertmanager: http://localhost:9093
- Grafana: http://localhost:3005 (admin/admin)
- Node Exporter: http://localhost:9100/metrics
- cAdvisor: http://localhost:8080
- Blackbox Exporter: http://localhost:9115

## Start

```bash
docker compose -f monitoring/docker-compose.yml up -d
```

## What is monitored

- DevOps platform metrics: Prometheus, Alertmanager, Node Exporter, cAdvisor
- Backend application availability: `http://host.docker.internal:3001/api/auth/health`
- Frontend application availability: `http://host.docker.internal:5173`

## Alerting

- `BackendDown`: backend health endpoint unreachable for 1 minute
- `FrontendDown`: frontend endpoint unreachable for 1 minute
- `HighNodeCpu`: host CPU usage above 85% for 5 minutes

You can replace the Alertmanager webhook receiver in `monitoring/alertmanager.yml` with Slack, Teams, or email integrations.
