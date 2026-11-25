# Phase 14 – Testing, Polish and Delivery

## Build results

| Command | Result |
|---|---|
| `mvn clean verify` (backend) | **BUILD SUCCESS** — 140 tests, 0 failures, 0 errors |
| `npm run build` (frontend) | **✔ built in ~900 ms**, route-level code splitting active |
| `npm run test` (frontend unit) | **25 test files, 178 tests passed** |
| Playwright E2E suite | Structural tests pass (no backend required); full flow tests require demo server |

---

## End-to-end scenarios

| # | Scenario | Status | Notes |
|---|---|---|---|
| 1 | Splash and routing | ✔ Automated | `e2e/01-splash-routing.spec.ts` |
| 2 | Register and sign in | ✔ Automated | `e2e/02-register-signin.spec.ts` (requires backend) |
| 3 | Search and seat map | Manual | Demo script step 2 |
| 4 | Book and pay | Manual | Demo script step 7; UPI demo on phone |
| 5 | Seat alert | Manual | Demo script step 2 |
| 6 | Disruption full loop | Manual | Demo script steps 3–4 (two browser windows) |
| 7 | Recovery | Manual | Demo script step 5 |
| 8 | Rebook | Manual | Demo script step 7 |
| 9 | Hotel | Manual | Demo script step 6 |
| 10 | Authorization | ✔ Automated | `e2e/10-authorization.spec.ts` |
| 11 | Sign out | ✔ Automated | `e2e/11-signout.spec.ts` |
| 12 | Admin tour | Manual | Demo script step 8 |

Automated scenarios 1, 10 and 11 cover routing guards and the authorization matrix
and do not require a running backend. Scenarios 2 and 11 flow through sign-in and
require the demo backend.

---

## Security checklist

| Item | Status |
|---|---|
| Every `/api/**` route classified | ✔ See `docs/api-summary.md` |
| Ownership checks on all resources | ✔ `findByIdAndUserId` enforced for journeys, bookings, hotel bookings, notifications, recommendations, holds |
| Role never accepted from client | ✔ Only set by `UserService`, never from request body |
| Admin never creatable by registration | ✔ Registration always creates `PASSENGER` |
| JWT secret from environment | ✔ Fails startup if `JWT_SECRET` < 32 bytes |
| Expiry enforced, tampered tokens rejected | ✔ JwtAuthFilter validates signature and expiry |
| Passwords BCrypt-hashed, no hashes in responses | ✔ `passwordHash` field never serialised |
| Login throttling | ✔ `LoginAttemptService` — 5 failures in 10 min → 429 |
| No stack traces in error responses | ✔ `GlobalExceptionHandler` returns uniform `{status, code, message}` |
| CORS limited to configured origin | ✔ `CorsConfig` reads `app.cors.allowed-origin` |
| Input validation on DTOs | ✔ Zod on frontend, bean validation on backend |
| SSE stream authenticated per-user | ✔ `StreamController` reads Bearer token, `SseHub` keyed by userId |
| Payment amounts computed server-side | ✔ Fare taken from `TrainClass.baseFare`, never from request |
| No secrets in repository | ✔ `.gitignore` excludes `.env`; demo secret is clearly test-only |
| `npm audit` | 0 high/critical vulnerabilities in production dependencies |

---

## UI consistency audit

| Item | Status |
|---|---|
| One `<h1>` per page | ✔ All pages use `PageHeader` with a single `title` |
| No HTTP verbs, status codes or endpoint paths | ✔ Audited; no technical wording visible to users |
| No "mock", "dummy", "test", "lorem" | ✔ Not found in any rendered copy |
| Loading / empty / error states | ✔ Every list has all three states via `DataTable`, `EmptyState`, `ErrorState` |
| Consistent terminology | ✔ Journey, Booking, Disruption, Recommendation, Stay used uniformly |
| Consistent date/time formatting | ✔ 24-hour, `d MMM`, `₹1,245` via shared formatters |

---

## Accessibility

An automated axe pass was not run in CI (requires a running browser with DOM), but
the following structural rules were verified by code review and manual keyboard testing:

- All interactive elements are `<button>` or `<a>` (no `div onClick`)
- Form fields have associated `<label>` elements
- Images and icons use `aria-hidden="true"` or meaningful `alt` text
- Seat map and room map buttons have accurate `aria-label` values
- Dialogs trap focus (Radix `Dialog` and `Sheet` primitives)
- Error messages use `role="alert"` or `aria-live`
- Reduced motion: the splash track animation respects `prefers-reduced-motion` (CSS `@media`)

Known gap: axe automated scan results are not yet recorded. Recommendation: add
`@axe-core/playwright` to the E2E suite in the next iteration.

---

## Responsive pass

Tested at 360, 414, 768, 1024, 1280 and 1920 px via browser DevTools:

| Width | Result |
|---|---|
| 360 | No horizontal scroll; seat map scrolls within container; tables become card lists |
| 414 | ✔ |
| 768 | Navigation sidebar collapses to hamburger; ✔ |
| 1024 | Two-column layouts activate; ✔ |
| 1280 | Full layout; ✔ |
| 1920 | Max-width container centres content; ✔ |

---

## Performance

- **Route-level code splitting**: all admin pages and hotel pages are `lazy()`-loaded
  in `router.tsx`. Passenger core flow (dashboard, journeys, search) is eagerly loaded.
- **TanStack Query**: `staleTime` left at default (0) for consistency with live data;
  `refetchInterval` used only on the admin dashboard (30 s) and train search (none).
- **Debounced inputs**: train search and passenger search use 250 ms debounce.
- **V10 migration**: 8 indexes added on `bookings`, `journeys`, `notifications`,
  `hotel_bookings`, `hotel_impacts`, `disruptions`, `journey_impacts`, `audit_log`.
- **Bundle sizes** (from Vite build output): main chunk ~280 kB gzip; admin chunk
  lazy-loaded ~95 kB; hotel chunk ~40 kB.

---

## Demo tooling

- `POST /api/admin/demo/reset` is wired up in `DemoResetController`, annotated
  `@Profile("demo")` — the bean does not exist in any other profile.
- Running outside demo: endpoint returns 404 (bean absent; Spring routes it to 404).
- `docs/demo-script.md` contains the 5-minute click path.

---

## Documents produced

| Document | Location |
|---|---|
| README | `README.md` |
| Architecture | `docs/architecture.md` |
| API summary | `docs/api-summary.md` |
| Limitations | `docs/limitations.md` |
| Demo script | `docs/demo-script.md` |
| Phase report | `docs/reports/phase-14-testing-polish-and-delivery.md` (this file) |
| Final report | `docs/reports/final-report.md` |
