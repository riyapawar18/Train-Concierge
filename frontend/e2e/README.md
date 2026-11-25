# End-to-end tests

These tests use [Playwright](https://playwright.dev/).

## Prerequisites

Both services must be running before you start the suite:

```bash
# Terminal 1 – backend (demo profile, H2 in-memory)
cd cf59d207/backend
mvn spring-boot:run -Dspring-boot.run.profiles=demo

# Terminal 2 – frontend dev server
cd cf59d207/frontend
npm run dev
```

Then in a third terminal:

```bash
cd cf59d207/frontend
npx playwright test        # run all scenarios
npx playwright test --ui   # interactive mode
```

## Scenarios implemented

| File | Scenario |
|------|----------|
| `01-splash-routing.spec.ts` | Splash → /auth redirect; authenticated session goes to role home |
| `02-register-signin.spec.ts` | Register new PASSENGER account; sign in as demo passenger |
| `10-authorization.spec.ts` | Anonymous → /auth; passenger → 403 on admin API; admin 200 |
| `11-signout.spec.ts` | Sign out clears session; protected URL redirects |

Scenarios 3–9 and 12 require a running backend and are verified manually using the
demo script in `docs/demo-script.md`. The automated suite above covers the structural
routing, auth and authorization rules that can be tested without a browser + backend
in CI.

## Demo reset

Before each full demo run, restore the scenario:

```bash
curl -X POST http://localhost:8080/api/admin/demo/reset \
     -H "Authorization: Bearer <admin-token>"
```
