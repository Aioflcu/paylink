# GitHub Secrets Setup for CI/CD

This guide documents all GitHub Secrets required for the Paylink CI/CD pipeline and deployment workflows.

## Required Secrets

### 1. JWT_SECRET
- **Purpose:** Signing JSON Web Tokens for user authentication
- **Value:** Generate a strong random string (32+ chars recommended)
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- **Used by:** CI backend tests, production server
- **Rotation:** Quarterly; old tokens will become invalid after deployment

### 2. PEYFLEX_API_KEY
- **Purpose:** Authentication for PayFlex API calls (airtime, data, electricity, etc.)
- **Value:** Provided by PayFlex
- **Used by:** Utility purchase flows, payment processing
- **Keep secret:** Never commit or expose in logs

### 3. PEYFLEX_BASE_URL
- **Purpose:** Base URL for PayFlex API
- **Value:** (e.g., `https://api.payflex.io` or staging URL)
- **Used by:** Utility service integrations

### 4. SENTRY_DSN (Optional)
- **Purpose:** Error tracking and reporting
- **Value:** Your Sentry project DSN
- **Used by:** Backend error capture, CI tests
- **Optional:** Leave empty if not using Sentry

### 5. MONGODB_URI (Optional for CI)
- **Purpose:** MongoDB connection string for production
- **Value:** (e.g., `mongodb+srv://user:pass@cluster.mongodb.net/paylink`)
- **Used by:** Production deployment
- **CI override:** CI tests use local MongoDB service, this not needed for tests

### 6. REDIS_URL (Optional for CI)
- **Purpose:** Redis connection string for caching/idempotency
- **Value:** (e.g., `redis://:password@host:6379`)
- **Used by:** Production deployment
- **CI override:** CI tests use local Redis service, this not needed for tests

### 7. EMAIL_USER & EMAIL_PASS
- **Purpose:** Gmail SMTP credentials for sending OTP emails
- **Value:** Gmail app-specific password (not your main Gmail password)
- **How to generate:**
  1. Enable 2FA on your Google account
  2. Go to https://myaccount.google.com/apppasswords
  3. Select Mail and Windows Computer (or custom app)
  4. Copy the generated password
- **Used by:** User verification, password reset flows

### 8. DOCKER_REGISTRY_URL (Future)
- **Purpose:** Docker registry hostname (e.g., Docker Hub, ECR, GCR)
- **Value:** (e.g., `docker.io` for Docker Hub, or ECR/GCR URL)
- **Used by:** Docker image push in CI

### 9. DOCKER_REGISTRY_USERNAME (Future)
- **Purpose:** Docker registry authentication
- **Value:** Your Docker registry username

### 10. DOCKER_REGISTRY_PASSWORD (Future)
- **Purpose:** Docker registry authentication
- **Value:** Your Docker registry password or personal access token

## How to Add Secrets to GitHub

1. **Navigate to your repository**
   ```
   GitHub > Your Repo > Settings > Secrets and variables > Actions
   ```

2. **Click "New repository secret"**

3. **Enter Name and Value**
   - Name: (exactly as listed above, e.g., `JWT_SECRET`)
   - Value: (your secret value)

4. **Click "Add secret"**

5. **Verify in CI logs** (without exposing the value)
   ```
   # CI will show:
   Run [command using ${{ secrets.JWT_SECRET }}]
   # But NOT display the actual value
   ```

## Required Secrets Quick Setup

Copy this checklist and fill in your values:

```
[ ] JWT_SECRET: _________________________________
[ ] PEYFLEX_API_KEY: _________________________________
[ ] PEYFLEX_BASE_URL: _________________________________
[ ] EMAIL_USER: _________________________________
[ ] EMAIL_PASS: _________________________________
[ ] SENTRY_DSN: _________________________________ (optional)
```

Then add each to GitHub via the UI above.

## Secret Rotation

**When to rotate:**
- Quarterly (recommended)
- If leaked or exposed
- After employee departure
- Before major security incident

**Rotation procedure:**
1. Generate new secret value
2. Update in GitHub Secrets
3. Redeploy application (triggers CI)
4. Monitor logs for auth errors
5. (Optional) Invalidate old tokens/sessions in database

## CI Environment Variables

The CI workflow (`.github/workflows/ci.yml`) automatically injects these secrets as environment variables:

```yaml
env:
  MONGODB_URI: mongodb://localhost:27017/paylink_test  # local override
  REDIS_URL: redis://localhost:6379  # local override
  JWT_SECRET: ${{ secrets.JWT_SECRET }}  # from GitHub Secrets
  SENTRY_DSN: ${{ secrets.SENTRY_DSN || '' }}  # optional, defaults to empty
```

## Testing Secrets Locally

To test with secrets before committing to CI:

```bash
# Create a local .env file (NOT committed)
echo "JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")" >> .env
echo "PEYFLEX_API_KEY=your-api-key" >> .env
echo "SENTRY_DSN=your-sentry-dsn" >> .env

# Load and test
source .env
npm run test:backend
```

## Troubleshooting

### Secret not accessible in workflow
- Check spelling matches exactly (case-sensitive)
- Ensure secret is added to the correct repository (not organization-level)
- Restart workflow run after adding secret

### CI tests failing with auth error
- Verify JWT_SECRET is set
- Regenerate and re-add if corrupted
- Check logs for "Invalid token" errors

### Email not sending
- Verify EMAIL_USER and EMAIL_PASS are correct
- Ensure Gmail 2FA is enabled
- Check if 2FA app password was generated correctly (not main password)

## References

- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Managing Secrets in GitHub Actions](https://docs.github.com/en/actions/security-guides/encrypted-secrets?tool=webui)

