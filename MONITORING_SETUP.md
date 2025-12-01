# Monitoring & Observability Setup

This guide covers how to verify and configure Prometheus monitoring, metrics exposure, and alerting rules for the Paylink backend.

## Metrics Endpoint

The backend exposes Prometheus metrics at `/api/metrics` when `prom-client` is installed.

### Verify Metrics Endpoint

1. **Local verification:**
   ```bash
   npm run start
   # In another terminal:
   curl http://localhost:5000/api/metrics
   ```
   You should see Prometheus format output (lines starting with `#` for comments, then key-value pairs).

2. **Docker verification:**
   ```bash
   docker-compose up -d
   curl http://localhost:5000/api/metrics
   ```

### Key Metrics

- **Request Count & Latency** (auto-tracked by prom-client):
  - `http_requests_total` — total requests by endpoint/method/status
  - `http_request_duration_seconds` — request latency histogram

- **Reconciliation Metrics** (emitted by reconciliation job):
  - `paylink_reconcile_attempts_total` — cumulative reconciliation attempts
  - Incremented each time a transaction is reconciled (see `backend/jobs/reconciliation.js`)

- **Custom Application Metrics** (add as needed):
  - Payment failures
  - Wallet balance anomalies
  - Webhook delivery failures

## Prometheus Configuration

1. **Update Prometheus scrape config** to include your backend:
   ```yaml
   # prometheus.yml or k8s ConfigMap
   scrape_configs:
     - job_name: 'paylink-backend'
       static_configs:
         - targets: ['localhost:5000']  # or your backend URL
       metrics_path: '/api/metrics'
       scrape_interval: 30s
   ```

2. **For Kubernetes deployment**, the `prometheus-rule-reconcile.yaml` is already present at `k8s/monitoring/prometheus-rule-reconcile.yaml`. Apply it:
   ```bash
   kubectl apply -f k8s/monitoring/prometheus-rule-reconcile.yaml
   ```

## Alerting Rules

Two alert rules are defined in `k8s/monitoring/prometheus-rule-reconcile.yaml`:

1. **PaylinkReconcileJobFailing** — fires if reconciliation CronJob has failures in past hour
2. **PaylinkReconcileHighAttempts** — fires if reconciliation attempts exceed 50 in past hour

### Validate Rules (Dry-run)

```bash
# Check Prometheus rule syntax
promtool check rules k8s/monitoring/prometheus-rule-reconcile.yaml

# Or in Prometheus UI: Alerts tab to see rule status
```

### Manual Test

To test alerting without waiting for scheduled conditions:
1. Trigger a reconciliation failure in the reconciliation job
2. Monitor Prometheus UI at `/alerts` to see if the rule fires

## Sentry Integration (Optional)

If `SENTRY_DSN` is set in environment, errors are automatically captured:
- All unhandled exceptions in middleware/routes
- Webhook processing errors
- Payment provider errors

**Verify Sentry is capturing:**
1. Trigger an error: `curl http://localhost:5000/invalid-route`
2. Check your Sentry project for the error event
3. Confirm `X-Request-Id` appears in the error context

## Health Checks

Readiness and liveness probes are available for k8s:
```bash
curl http://localhost:5000/api/health/ready
curl http://localhost:5000/api/health/live
```

Readiness checks DB and Redis connectivity; liveness checks process is still running.

## Checklist

- [ ] Metrics endpoint responds at `/api/metrics`
- [ ] Prometheus successfully scrapes metrics (check Prometheus Targets page)
- [ ] At least one reconciliation run has completed
- [ ] Reconciliation metric `paylink_reconcile_attempts_total` is visible
- [ ] Alerting rules are imported to Prometheus
- [ ] Alert rule syntax is valid (via promtool or UI)
- [ ] Sentry is capturing errors (if SENTRY_DSN configured)
- [ ] Health endpoints respond 200 (readiness/liveness)

## Next Steps

1. Set up Grafana dashboards to visualize key metrics
2. Configure email/Slack notifications for alert firing
3. Add custom metrics for business-critical operations (e.g., payment success rate, reconciliation coverage)
4. Monitor logs in production (use centralized logging like ELK, DataDog, etc. alongside Prometheus)

