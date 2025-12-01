#!/usr/bin/env bash
# Run everything locally: mongo, redis, build backend image, start services, run smoke checks, then optionally tear down.
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT_DIR"

echo "1/5 - Building backend Docker image (paylink-local:latest)..."
docker build -t paylink-local:latest .

echo "2/5 - Starting docker-compose services (mongo, redis, backend)..."
docker-compose up -d --build

echo "Waiting for backend health endpoint to become healthy (timeout 120s)..."
SECS=0
while [ $SECS -lt 120 ]; do
  if docker-compose exec -T backend wget -qO- http://localhost:5000/api/health/liveness >/dev/null 2>&1; then
    echo "Backend is healthy"
    break
  fi
  sleep 2
  SECS=$((SECS+2))
done

if [ $SECS -ge 120 ]; then
  echo "Backend did not become healthy within timeout"
  docker-compose logs backend --tail=200
  exit 1
fi

echo "3/5 - Running smoke checks (npm run smoke)..."
# Run smoke from host against localhost:5000
BACKEND_URL=http://localhost:5000/api npm run smoke

read -p "Tear down containers? (y/N) " answer
if [[ "$answer" =~ ^[Yy]$ ]]; then
  echo "Tearing down docker-compose services..."
  docker-compose down -v
else
  echo "Leaving docker-compose services running. Use 'docker-compose down -v' to stop them later."
fi

echo "Done."
