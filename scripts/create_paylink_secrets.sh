#!/usr/bin/env bash
# Helper to create paylink Kubernetes secret with your sensitive values.
# EDIT the variables below (or set them in your environment) before running.

set -euo pipefail

# You can set these as environment variables, or edit below directly.
: ${MONGODB_URI:=""}
: ${REDIS_URL:="redis://redis:6379"}
: ${PEYFLEX_BASE_URL:=""}
: ${PEYFLEX_API_KEY:=""}
: ${MONNIFY_BASE_URL:=""}
: ${MONNIFY_API_KEY:=""}
: ${MONNIFY_SECRET_KEY:=""}
: ${MONNIFY_CONTRACT_CODE:=""}
: ${JWT_SECRET:=""}
: ${SENTRY_DSN:=""}
: ${EMAIL_USER:=""}
: ${EMAIL_PASS:=""}

# If any required value is empty, warn
echo "This script will create/update a kubernetes secret named 'paylink-secrets' in the current kubernetes context."
read -p "Proceed? (y/N) " proceed
if [[ ! "$proceed" =~ ^[Yy]$ ]]; then
  echo "Aborted"
  exit 0
fi

# Build the kubectl command. Prefer using --from-literal to avoid writing plain-text files.
# If you prefer to source from an env file, create a .env.secrets file and use --from-env-file.

kubectl create secret generic paylink-secrets \
  --from-literal=MONGODB_URI="${MONGODB_URI}" \
  --from-literal=REDIS_URL="${REDIS_URL}" \
  --from-literal=PEYFLEX_BASE_URL="${PEYFLEX_BASE_URL}" \
  --from-literal=PEYFLEX_API_KEY="${PEYFLEX_API_KEY}" \
  --from-literal=MONNIFY_BASE_URL="${MONNIFY_BASE_URL}" \
  --from-literal=MONNIFY_API_KEY="${MONNIFY_API_KEY}" \
  --from-literal=MONNIFY_SECRET_KEY="${MONNIFY_SECRET_KEY}" \
  --from-literal=MONNIFY_CONTRACT_CODE="${MONNIFY_CONTRACT_CODE}" \
  --from-literal=JWT_SECRET="${JWT_SECRET}" \
  --from-literal=SENTRY_DSN="${SENTRY_DSN}" \
  --from-literal=EMAIL_USER="${EMAIL_USER}" \
  --from-literal=EMAIL_PASS="${EMAIL_PASS}" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "Secret 'paylink-secrets' created/updated in current kubernetes context."

echo "Tip: you can also create the secret from an env file like this:"
cat <<'EOF'
# create a file .env.secrets with the key=value pairs (no spaces around =)
# then run:
# kubectl create secret generic paylink-secrets --from-env-file=.env.secrets
EOF
