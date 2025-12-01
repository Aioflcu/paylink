# Security & Dependency Hygiene Checklist

This document lists steps to ensure the backend is secure and dependencies are current.

## Pre-Deployment Checks

### 1. npm audit

Run before every production deployment:

```bash
npm audit
```

**Actions:**
- Review any high/critical vulnerabilities
- If high/critical found:
  ```bash
  npm audit fix  # auto-fix safe updates
  npm audit fix --force  # accepts breaking changes (test thoroughly!)
  ```
- Document any accepted risks (e.g., dev-only vulns)

### 2. Dependency Updates

Check for outdated dependencies:
```bash
npm outdated
```

Update minor/patch versions regularly:
```bash
npm update  # updates to latest minor/patch within ^constraints
npm update --save [package-name]  # specific package
```

### 3. Dependabot (Automated)

Dependabot is already configured at `.github/dependabot.yml`:
- Automatically opens PRs for dependency updates
- Ignores Monnify major versions (per config)
- Run tests on PR; merge if tests pass

**Monitor:**
- Check GitHub > Insights > Dependency graph
- Review and merge Dependabot PRs regularly

### 4. Lock File

Always commit `package-lock.json`:
```bash
git add package-lock.json
git commit -m "chore: update dependencies"
```

Ensures reproducible installs across environments.

### 5. Security Headers & Middleware

**Already configured:**
- Helmet (security headers)
- CORS (restricted origins)
- Express rate limiter (brute-force protection)
- Idempotency middleware (replay protection)

**Review:** `backend/middleware/securityHeaders.js` for custom tweaks.

### 6. Environment Variables

**Never commit secrets:**
```bash
# .gitignore includes:
.env
.env.local
.env*.local
```

**Required non-secret vars** are listed in `.env.example`:
```bash
cat .env.example
```

**For GitHub Actions:** Secrets are stored in GitHub Settings > Secrets.

### 7. Code Scanning (Optional)

For extra security scanning:

#### ESLint
```bash
npm run lint  # if available
# or
npx eslint . --ext .js
```

#### npm ci (Secure Install)
```bash
npm ci --legacy-peer-deps  # uses package-lock.json, more secure than npm install
```

### 8. Third-Party Library Audit

Review critical dependencies:
- `mongoose` — DB driver (maintained by MongoDB)
- `express` — web framework (widely used, actively maintained)
- `jsonwebtoken` — JWT handling (review for recent CVEs)
- `bcryptjs` — password hashing (battle-tested)
- `prom-client` — metrics (used by Prometheus, safe)

Run monthly vulnerability checks on these.

### 9. API Key & Credential Rotation

**Non-expiring secrets to rotate regularly (quarterly):**
- JWT_SECRET
- PEYFLEX_API_KEY
- (Monnify secrets once configured)

**Rotation procedure:**
1. Generate new secret
2. Update in environment (GitHub Secrets, k8s secrets, etc.)
3. Redeploy
4. Monitor logs for auth errors
5. (Optional) Invalidate old JWTs if you track token issuance

### 10. Webhook Signature Verification

**Already implemented:**
- `backend/middleware/webhookVerify.js` — verifies signatures from Monnify & Peyflex
- `backend/middleware/webhookReplay.js` — prevents replay attacks

**Test:**
```bash
# Simulate webhook with invalid signature
curl -X POST http://localhost:5000/api/webhooks/monnify \
  -H "X-Monnify-Signature: invalid-sig" \
  -d '{"test": "data"}'
# Should return 401 Unauthorized
```

## Security Scan Automation

Add to CI (optional, low-priority for now):

### OWASP Dependency Check
```bash
npm install -g snyk
snyk test  # identifies vulnerable dependencies
```

### Trivy (Container Scanning)
```bash
trivy image your-registry/paylink:latest
```

## Checklist

- [ ] `npm audit` run and reviewed
- [ ] `npm audit fix` applied or risks documented
- [ ] Dependabot PRs reviewed & merged
- [ ] No secrets in `.env` file or git history
- [ ] `.env.example` is up-to-date
- [ ] GitHub Secrets are set (JWT_SECRET, PEYFLEX_API_KEY, etc.)
- [ ] Webhook signatures verified (test with invalid sig)
- [ ] Security headers middleware enabled (helmet)
- [ ] Rate limiting enabled on sensitive routes
- [ ] CORS is restricted to known origins (not *)
- [ ] Monthly vulnerability review scheduled

## Resources

- [npm audit documentation](https://docs.npmjs.com/cli/v9/commands/npm-audit)
- [Dependabot docs](https://docs.github.com/en/code-security/dependabot)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

