Deploy backend to Google Cloud Run
================================

This document explains how to build, push and deploy the backend service to Google Cloud Run using Artifact Registry and Secret Manager. The repository includes `scripts/deploy_backend.sh` which automates the common steps; run it locally where you have `gcloud` and `docker` installed and authenticated.

Pre-requisites
--------------
- Install and authenticate the Google Cloud SDK (gcloud). See https://cloud.google.com/sdk/docs/install
- Install Docker and ensure you can run docker builds.
- Have Owner/Editor permissions for the target GCP project (or at least permissions to create Artifact Registry repos, Secret Manager secrets, and deploy Cloud Run services).

Quick steps (manual)
--------------------
1. Build and push image:

```bash
PROJECT_ID=my-gcp-project
REGION=us-central1
REPO=paylink-backend-repo
IMAGE_NAME=paylink-backend
TAG=latest

gcloud config set project $PROJECT_ID
gcloud services enable artifactregistry run secretmanager
gcloud artifacts repositories create $REPO --repository-format=docker --location=$REGION || true
gcloud auth configure-docker $REGION-docker.pkg.dev
docker build -t $REGION-docker.pkg.dev/$PROJECT_ID/$REPO/$IMAGE_NAME:$TAG .
docker push $REGION-docker.pkg.dev/$PROJECT_ID/$REPO/$IMAGE_NAME:$TAG
```

2. Create secrets (recommended):

```bash
# MONGODB_URI, JWT_SECRET and REDIS_URL
gcloud secrets create MONGODB_URI --replication-policy="automatic" || true
echo -n "$MONGODB_URI_VALUE" | gcloud secrets versions add MONGODB_URI --data-file=-

gcloud secrets create JWT_SECRET --replication-policy="automatic" || true
echo -n "$JWT_SECRET_VALUE" | gcloud secrets versions add JWT_SECRET --data-file=-

gcloud secrets create REDIS_URL --replication-policy="automatic" || true
echo -n "$REDIS_URL_VALUE" | gcloud secrets versions add REDIS_URL --data-file=-
```

3. Deploy to Cloud Run (map secrets to env vars):

```bash
gcloud run deploy paylink-backend \
  --image=$REGION-docker.pkg.dev/$PROJECT_ID/$REPO/$IMAGE_NAME:$TAG \
  --region=$REGION \
  --platform=managed \
  --set-secrets=MONGODB_URI=MONGODB_URI:latest,JWT_SECRET=JWT_SECRET:latest,REDIS_URL=REDIS_URL:latest \
  --allow-unauthenticated
```

Using the provided script
-------------------------
Run the helper script from the repo root. It will prompt you to create/update secrets.

```bash
PROJECT_ID=my-gcp-project REGION=us-central1 SERVICE_NAME=paylink-backend ./scripts/deploy_backend.sh
```

Notes
-----
- The script and commands require `gcloud` and `docker` on your machine. I cannot run `gcloud` from this environment, so run them locally.
- If you prefer not to allow unauthenticated access, remove `--allow-unauthenticated` and instead bind IAM principals to the Cloud Run service.
- After deployment, verify the service and run smoke tests against any public or internal endpoints.
