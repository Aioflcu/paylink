# Paylink Backend — Run & Deploy Guide

This document explains how to run the Paylink backend locally, build and push Docker images, and deploy to Kubernetes. It also lists required environment variables and GitHub secrets used by the CI workflows.

---

## Quick local run (development)

1. Copy environment variables from `.env.example` or create a `.env` file in the repo root. Example variables are listed below.
2. Install dependencies:

```bash
npm ci
```

3. Start backend (single node):

```bash
npm run start:backend
# or
node server.js
```

By default the server listens on port 5000. Health endpoints:
- Liveness: GET /api/health/liveness
- Readiness: GET /api/health/readiness

Indexes (MongoDB)
------------------
The project ensures important indexes at the Mongoose schema level. Key indexes:

- `users`: unique index on `email` and `username` (backgrounded)
- `wallets`: unique index on `userId`
- `transactions`: unique index on `reference`, and compound index on `{ userId, createdAt }`

If you change models or need to rebuild indexes manually, use `Model.syncIndexes()` in a maintenance run.
- Swagger UI: /api/docs

Notes: The project contains both frontend and backend; `npm start` runs the React dev server. Use `npm run start:backend` to run only the backend.

---

## Required environment variables (minimum)

Set these in your environment, .env file, or in Kubernetes secrets.

- MONGODB_URI - MongoDB connection string
- REDIS_URL - Redis connection string (optional for local/testing)
- JWT_SECRET - JWT signing secret
- SENTRY_DSN - (optional) Sentry DSN
- PEYFLEX_BASE_URL - Payflex API base URL
- PEYFLEX_API_KEY - Payflex API key
- MONNIFY_BASE_URL - Monnify API base URL
- MONNIFY_API_KEY - Monnify API key
- MONNIFY_SECRET_KEY - Monnify secret key
- EMAIL_USER / EMAIL_PASS - SMTP credentials for OTP emails
- FRONTEND_ORIGIN - allowed CORS origin for frontend

Optional for reconciliation and CI
- RECONCILE_BATCH_LIMIT - limit items per reconciliation run (default 200)

---

## Docker (build & run)

Build the image locally:

```bash
# Replace your-registry/paylink:latest with your registry/name
docker build -t your-registry/paylink:latest .

# Run locally (pass envs as needed)
docker run -p 5000:5000 \
  -e MONGODB_URI="mongodb://..." \
  -e REDIS_URL="redis://..." \
  your-registry/paylink:latest
```

Image layout: the Dockerfile uses `/app` as `WORKDIR` and copies the repo so the reconcile CLI is available at `/app/bin/reconcile.js`.

---

## Run everything locally with Docker Compose (recommended for testing)

There's a `docker-compose.yml` that brings up MongoDB, Redis, and the backend image built from the repository. This is the fastest way to run an isolated local environment for smoke tests.

1. Build and run everything (this will build the Docker image and start services):

```bash
./scripts/run_all.sh
```

2. The script will:
  - build the backend image (`paylink-local:latest`),
  - start `mongo`, `redis`, and `backend` services,
  - wait for the backend liveness endpoint (up to 120s),
  - run `npm run smoke` against `http://localhost:5000/api`,
  - prompt to tear down containers when finished.

If you prefer to run manually:

```bash
docker build -t paylink-local:latest .
docker-compose up --build

# run smoke checks
BACKEND_URL=http://localhost:5000/api npm run smoke

# teardown
docker-compose down -v
```

## Final step: Add your Monnify keys

To enable real wallet funding via Monnify you must add the following environment variables either to your `.env` (local) or to your Kubernetes secrets / CI secrets:

- `MONNIFY_BASE_URL` (e.g., https://api.monnify.com)
- `MONNIFY_API_KEY`
- `MONNIFY_SECRET_KEY`
- `MONNIFY_CONTRACT_CODE`

Frontend (React) also needs these prefixed with `REACT_APP_` when building the frontend bundle:

- `REACT_APP_MONNIFY_API_URL`
- `REACT_APP_MONNIFY_API_KEY`
- `REACT_APP_MONNIFY_SECRET_KEY`
- `REACT_APP_MONNIFY_CONTRACT_CODE`

Until those are set, the backend deposit endpoint and Monnify webhook will return a clear 501 response explaining that Monnify is not configured. This allows you to run and test the rest of the system without Monnify credentials.


## Kubernetes (example manifests)

Manifests are in `k8s/`:
- `k8s/secret/paylink-secrets.yaml` — template for secrets
- `k8s/deploy/backend-deployment.yaml` — Deployment + Service
- `k8s/cronjobs/reconcile-cronjob.yaml` — CronJob that runs reconciliation hourly
- `k8s/monitoring/prometheus-rule-reconcile.yaml` — example Prometheus rule

Create secrets (example using kubectl):

```bash
kubectl create secret generic paylink-secrets \
  --from-literal=MONGODB_URI="<your-mongo-uri>" \
  --from-literal=REDIS_URL="redis://redis:6379" \
  --from-literal=PEYFLEX_BASE_URL="<url>" \
  --from-literal=PEYFLEX_API_KEY="<key>" \
  --from-literal=MONNIFY_BASE_URL="<url>" \
  --from-literal=MONNIFY_API_KEY="<key>" \
  --from-literal=MONNIFY_SECRET_KEY="<secret>" \
  --from-literal=SENTRY_DSN=""

# Apply deployment and service
kubectl apply -f k8s/deploy/backend-deployment.yaml

# Apply reconcile CronJob
kubectl apply -f k8s/cronjobs/reconcile-cronjob.yaml

# (Optional) Apply PrometheusRule if using Prometheus Operator
kubectl apply -f k8s/monitoring/prometheus-rule-reconcile.yaml
```

Adjust `image` fields in manifests to point to your built image (e.g., `ghcr.io/myorg/paylink:latest`).

---

## GitHub Actions - required secrets

The CI workflows expect the following repository secrets (set in GitHub repo Settings -> Secrets):

- DOCKER_REGISTRY (e.g., ghcr.io)
- DOCKER_USERNAME
- DOCKER_PASSWORD
- DOCKER_REPOSITORY (e.g., myorg/paylink)
- RECONCILE_MONGODB_URI (used by reconciliation workflow)
- MONNIFY_BASE_URL, MONNIFY_API_KEY, MONNIFY_SECRET_KEY
- PEYFLEX_BASE_URL, PEYFLEX_API_KEY

---

## Reconciliation

Run manually:

```bash
npm run reconcile          # runs bin/reconcile.js
# or
node ./bin/reconcile.js 50 # limit to 50 items
```

CronJob: `k8s/cronjobs/reconcile-cronjob.yaml` runs hourly by default. Ensure the image used contains the CLI and env vars are provided via `paylink-secrets`.

---

## Smoke checks & tests

Lightweight smoke checks:

```bash
npm run smoke
```

Backend tests (Jest/Supertest):

```bash
# ensure test DB and envs are configured
npm run test:backend
```

---

## Next recommended operational items

- Add monitoring for critical endpoints and Sentry alerting rules.
- Add RBAC / network policies for the CronJob (if running in a restricted cluster).
- Add an automated job to rotate credentials and verify provider connectivity.

If you want, I can now:
- (A) Apply manifests commands in a prepared script and provide exact `kubectl` commands (no cluster-side execution here),
- (B) Run smoke tests locally (requires a running backend or env vars to start it), or
- (C) Add a small CI job to run the smoke script after deployment.

Tell me which of A/B/C you want me to do next.
