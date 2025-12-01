# Deploying Redis for Paylink

This document shows two simple ways to run Redis for the Paylink backend: Docker Compose for local/dev and a minimal Kubernetes manifest for production.

## 1) Docker Compose (local / dev)

Create a `docker-compose.yml` file and run `docker compose up -d`.

```yaml
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    container_name: paylink_redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  redis_data:
```

Environment variable for Paylink: set `REDIS_URL=redis://localhost:6379` or leave defaults.

## 2) Kubernetes (production) - minimal Deployment + Service

Create `redis-deployment.yaml` and apply with `kubectl apply -f redis-deployment.yaml`.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "250m"
        volumeMounts:
        - name: redis-data
          mountPath: /data
      volumes:
      - name: redis-data
        emptyDir: {}
---
apiVersion: v1
kind: Service
metadata:
  name: redis
spec:
  selector:
    app: redis
  ports:
  - protocol: TCP
    port: 6379
    targetPort: 6379
  type: ClusterIP
```

Set `REDIS_HOST=redis` and `REDIS_PORT=6379` (or `REDIS_URL=redis://redis:6379`) in your Paylink deployment environment.

## Notes & Recommendations
- For production readiness, use a managed Redis (AWS Elasticache, DigitalOcean Managed, Azure Cache) or a Redis cluster with persistence (AOF/RDB) and auth.
- Protect Redis with network policies and avoid exposing it publicly.
- Use Redis AUTH or managed IAM policies where supported.
- Consider using a Redis client with retries and monitoring (we use `node-redis` in the codebase).

