This file describes the remaining operational steps to finish backend deployment (Monnify keys intentionally excluded).

Quick steps to run locally (no Monnify keys required):

1. Install dependencies
   npm install --legacy-peer-deps

2. Create `.env` from `.env.example` and leave Monnify variables empty until you want to enable them.

3. Start local services (recommended using docker-compose):
   docker-compose up -d --build

4. Start the backend:
   node server.js

5. Health endpoints:
   - GET /api/health/liveness
   - GET /api/health/readiness

6. Reconciliation (run manually):
   npm run reconcile

7. To enable Monnify later:
   - Add MONNIFY_BASE_URL, MONNIFY_API_KEY, MONNIFY_SECRET_KEY, MONNIFY_CONTRACT_CODE to your `.env` or k8s secret.
   - Restart backend.

Commit & push guidance:
- Create a branch: git checkout -b finish-backend
- Commit changes and push: git push --set-upstream origin finish-backend
- Open a Pull Request in GitHub and merge when ready.

Notes:
- The repo includes Prometheus metrics route and a reconciliation metric.
- Sentry is optional — set SENTRY_DSN in env or skip.
- Monnify endpoints and webhook handlers explicitly return 501 when keys are not configured, so it's safe to run the backend before adding Monnify keys.
