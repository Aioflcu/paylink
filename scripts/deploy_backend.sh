#!/usr/bin/env bash
set -euo pipefail

# Build, push and deploy backend to Google Cloud Run using Artifact Registry and Secret Manager.
# Usage (example):
# PROJECT_ID=my-gcp-project REGION=us-central1 SERVICE_NAME=paylink-backend ./scripts/deploy_backend.sh

PROJECT_ID=${PROJECT_ID:-}
REGION=${REGION:-us-central1}
SERVICE_NAME=${SERVICE_NAME:-paylink-backend}
REPO=${REPO:-paylink-backend-repo}
IMAGE_NAME=${IMAGE_NAME:-paylink-backend}
TAG=${TAG:-latest}

if [[ -z "$PROJECT_ID" ]]; then
  echo "Error: set PROJECT_ID environment variable. Example: PROJECT_ID=my-project ./scripts/deploy_backend.sh"
  exit 1
fi

IMAGE_HOST="$REGION-docker.pkg.dev"
IMAGE="$IMAGE_HOST/$PROJECT_ID/$REPO/$IMAGE_NAME:$TAG"

echo "Project: $PROJECT_ID"
echo "Region:  $REGION"
echo "Service: $SERVICE_NAME"
echo "Image:   $IMAGE"

command -v gcloud >/dev/null 2>&1 || { echo "gcloud CLI not found. Install and authenticate first."; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "docker not found. Install Docker and make sure it can run."; exit 1; }

echo "Enabling required APIs (Artifact Registry, Cloud Run, Secret Manager)"
gcloud services enable artifactregistry run secretmanager --project="$PROJECT_ID"

echo "Creating Artifact Registry repo (if not exists)"
if ! gcloud artifacts repositories describe "$REPO" --location="$REGION" --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud artifacts repositories create "$REPO" --repository-format=docker --location="$REGION" --project="$PROJECT_ID"
else
  echo "Repository $REPO already exists in $REGION"
fi

echo "Configuring Docker credential helper for Artifact Registry"
gcloud auth configure-docker "$REGION-docker.pkg.dev" --quiet

echo "Building Docker image"
docker build -t "$IMAGE" .

echo "Pushing image to Artifact Registry"
docker push "$IMAGE"

echo "Prepare secrets (MONGODB_URI, JWT_SECRET, REDIS_URL). Provide values via environment variables before running this script or press enter to skip creating each."
read -r -p "Create/Update MONGODB_URI secret? (y/N): " create_mongo
if [[ "$create_mongo" =~ ^[Yy]$ ]]; then
  if [[ -z "${MONGODB_URI:-}" ]]; then
    echo "Enter MONGODB_URI (will be stored in Secret Manager):"
    read -r MONGODB_URI
  fi
  if gcloud secrets describe MONGODB_URI --project="$PROJECT_ID" >/dev/null 2>&1; then
    echo "$MONGODB_URI" | gcloud secrets versions add MONGODB_URI --data-file=- --project="$PROJECT_ID"
  else
    printf '%s' "$MONGODB_URI" | gcloud secrets create MONGODB_URI --data-file=- --replication-policy="automatic" --project="$PROJECT_ID"
  fi
fi

read -r -p "Create/Update JWT_SECRET secret? (y/N): " create_jwt
if [[ "$create_jwt" =~ ^[Yy]$ ]]; then
  if [[ -z "${JWT_SECRET:-}" ]]; then
    echo "Enter JWT_SECRET:"
    read -r JWT_SECRET
  fi
  if gcloud secrets describe JWT_SECRET --project="$PROJECT_ID" >/dev/null 2>&1; then
    echo "$JWT_SECRET" | gcloud secrets versions add JWT_SECRET --data-file=- --project="$PROJECT_ID"
  else
    printf '%s' "$JWT_SECRET" | gcloud secrets create JWT_SECRET --data-file=- --replication-policy="automatic" --project="$PROJECT_ID"
  fi
fi

read -r -p "Create/Update REDIS_URL secret? (y/N): " create_redis
if [[ "$create_redis" =~ ^[Yy]$ ]]; then
  if [[ -z "${REDIS_URL:-}" ]]; then
    echo "Enter REDIS_URL:"
    read -r REDIS_URL
  fi
  if gcloud secrets describe REDIS_URL --project="$PROJECT_ID" >/dev/null 2>&1; then
    echo "$REDIS_URL" | gcloud secrets versions add REDIS_URL --data-file=- --project="$PROJECT_ID"
  else
    printf '%s' "$REDIS_URL" | gcloud secrets create REDIS_URL --data-file=- --replication-policy="automatic" --project="$PROJECT_ID"
  fi
fi

echo "Deploying to Cloud Run"
gcloud run deploy "$SERVICE_NAME" \
  --image="$IMAGE" \
  --region="$REGION" \
  --platform=managed \
  --project="$PROJECT_ID" \
  --set-secrets="MONGODB_URI=MONGODB_URI:latest,JWT_SECRET=JWT_SECRET:latest,REDIS_URL=REDIS_URL:latest" \
  --allow-unauthenticated

echo "Deployment complete. Run 'gcloud run services describe $SERVICE_NAME --region=$REGION --project=$PROJECT_ID' to get details." 
