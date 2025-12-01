# Frontend TODO

This file lists the remaining frontend work, prioritized and actionable, with related files and quick estimates so you can pick what to tackle next.

## High priority (blockers)

1. Fix runtime "Element type is invalid ... got: undefined" error
   - Why: Blocks Dashboard and related flows. Isolated to Internet/Education pages.
   - Files to check: `src/pages/Internet.js`, `src/pages/Education.js`, `src/App.js`, `src/pages/TransactionPIN.js`
   - Acceptance: App renders Dashboard without runtime error and /internet and /education routes load.
   - Est. time: 10–30 minutes (with stack trace), 30–60 minutes if it requires deeper refactor.
   - Status: not-started

2. Re-enable & test Internet + Education flows end-to-end
   - Why: Payment processors implemented; need to validate UI → PIN → processor → Firestore results.
   - Files to test: `src/pages/Internet.js`, `src/pages/Education.js`, `src/pages/TransactionPIN.js`, `src/services/transactionProcessor.js`
   - Acceptance: Successful test payments produce Firestore transaction docs and wallet updates in dev.
   - Est. time: 30–60 minutes
   - Status: not-started

## Medium priority (stability & dev ergonomics)

3. Add .env and wire environment variables for frontend
   - Why: Keep API URLs/keys out of source and make switching between dev/prod easy.
   - Variables suggested:
     - REACT_APP_PAYFLEX_API_URL
     - REACT_APP_PAYFLEX_API_KEY
     - REACT_APP_MONNIFY_API_URL
     - REACT_APP_MONNIFY_API_KEY
   - Files to update: `src/services/transactionProcessor.js` (read from process.env), README
   - Acceptance: App reads API URLs/keys from env and works in dev when provided.
   - Est. time: 10–20 minutes
   - Status: not-started

4. Add visual error and loading states for payment flows
   - Why: Improve UX during network calls and show clear failures.
   - Files to update: `src/pages/*` (Internet, Education, TransactionPIN, Dashboard), shared components (LoadingSpinner, Toast/Alert)
   - Acceptance: Loading indicator shows during API calls; errors surface with friendly messages.
   - Est. time: 30–90 minutes
   - Status: not-started

## Low / polish priority

5. Coverage & tests (unit + integration)
   - Why: Prevent regressions; verify transaction flows and key components.
   - Targets:
     - Unit tests for `TransactionPIN` logic and `transactionProcessor` (mock network + Firestore)
     - Component tests for `Internet` and `Education` forms
   - Framework: Jest + React Testing Library (project already has some test files)
   - Est. time: 1–3 hours (basic coverage)
   - Status: not-started

6. Accessibility & responsiveness checks
   - Why: Ensure forms and dashboard usable on mobile and by assistive tech.
   - Tasks: Lighthouse run, fix a11y issues (labels, contrast), check `App.css` breakpoints
   - Est. time: 1–2 hours
   - Status: not-started

7. Form validation improvements and helpful inline errors
   - Why: Prevent invalid payloads and reduce failed payments.
   - Files: `src/pages/Internet.js`, `src/pages/Education.js` and any shared Input components
   - Est. time: 30–90 minutes
   - Status: not-started

8. Transaction history UI polish
   - Why: Improve readability and paging of transaction feed.
   - Files: `src/pages/Transactions.js` (or wherever history is rendered), styles in `src/App.css`
   - Est. time: 1–2 hours
   - Status: not-started

## Optional / next-phase improvements

9. CI: run build + tests on push
   - Why: Catch regressions early
   - Tools: GitHub Actions or similar
   - Est. time: 1–2 hours

10. Error reporting (Sentry / LogRocket) for production
    - Why: Capture runtime exceptions in prod builds
    - Est. time: 1–2 hours

## Quick run & debug tips

- To get the exact runtime error stack trace: open DevTools (Cmd+Option+I) → Console and paste the full stack trace here. That will allow a targeted fix.
- To reproduce locally: run

```bash
npm install
npm start
# open http://localhost:3000 and navigate to Dashboard → click any card that leads to Internet/Education
```

## Files of interest (quick map)

- Pages: `src/pages/Dashboard.js`, `src/pages/Internet.js`, `src/pages/Education.js`, `src/pages/TransactionPIN.js`
- Services: `src/services/transactionProcessor.js`, `src/services/themeService.js`
- Styling: `src/App.css`
- Debug artifacts: `DEBUG_ERROR.md` (notes taken during investigation)

---

If you want, I can now (choose one):
- A) Insert temporary debug logs to identify which import is undefined and fix it (I can do this immediately), or
- B) Wait for you to paste the browser console stack trace and then patch the exact broken file.

Which do you prefer?