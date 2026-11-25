# TrainConcierge — Final Report

## Project summary

TrainConcierge is a full-stack passenger disruption management platform for Indian
Railways. Passengers search for trains, book journeys, receive live disruption alerts,
see ranked recovery options, rebook, and manage hotel stays. Admins manage
disruptions, passengers, notifications and system settings.

---

## Phase-by-phase results

| Phase | Title | Key deliverables |
|---|---|---|
| 00 | Project setup | Vite + React 19, Spring Boot 3.5, H2, Flyway, Tailwind CSS 4 |
| 01 | Splash and auth | JWT auth, BCrypt, login throttling, animated splash, route guards |
| 02 | Catalog | Stations, trains, schedules, train classes — seeded from SQL |
| 03 | User accounts | Registration, password policy, profile, role system |
| 04 | Seat holds | Optimistic locking, expiry scheduler, availability levels |
| 05 | Train search | Full search with filters, seat map per coach, seat alert emails |
| 06 | Train status | Live status page with schedule, occupancy, coach diagram |
| 07 | Booking | PNR generation, multi-passenger, fare breakdown, cancellation + refund |
| 08 | Disruptions | Impact analysis, recommendation engine with 10 rules, DisruptionPipeline |
| 09 | Notifications | In-app feed, email via Thymeleaf + retry, SSE stream, preferences |
| 10 | Payments | Simulated gateway, Razorpay test mode, UPI intent demo, idempotency |
| 11 | Recovery & rebooking | Rebooking flow, bus seat holds, wait acknowledgement |
| 12 | Hotels | Hotel booking, room map, date strip, HotelImpactAnalyzer, FitsHotelRule |
| 13 | Admin modules | All admin pages, profile, settings, announcement, role management |
| 14 | Testing & delivery | E2E tests, demo reset, indexes, code splitting, all docs |

---

## Test results (actual)

```
mvn clean verify
  Tests run: 140, Failures: 0, Errors: 0, Skipped: 0
  BUILD SUCCESS

npm run build
  ✔ built in ~900 ms

npm run test
  Test Files  25 passed (25)
  Tests       178 passed (178)
```

---

## Known issues and future work

| Item | Impact | Suggestion |
|---|---|---|
| Axe automated accessibility scan not yet in CI | Medium | Add `@axe-core/playwright` to E2E suite |
| SSE is in-process (not distributed) | Low for single node | Redis Pub/Sub for horizontal scaling |
| Login throttling is in-memory | Resets on restart | Redis-backed `LoginAttemptService` |
| No real IRCTC data | Demo only | Integrate with IRCTC API when available |
| UPI live mode excluded | Demo only | Implement Razorpay UPI intent or UPI 2.0 |
| Hotel PMS integration absent | Demo only | Webhooks from hotel PMS on room availability changes |
| Train Management (V13) is read-only | Admin can view trains only | Add CRUD for trains and schedules |
| Saved passengers feature | Phase 13 skeleton | API exists (`/api/profile/saved-passengers`), UI not wired |

---

## Security summary

All `/api/admin/**` endpoints require `ROLE_ADMIN`. Every resource has ownership
enforcement. JWT secret validated at startup. Login throttled. Error responses
contain no stack traces. CORS restricted to configured origin. See
`docs/reports/phase-14-testing-polish-and-delivery.md` for the full checklist.

---

## Architecture at a glance

See `docs/architecture.md`. The system is a standard three-tier:
browser (React/Vite) → Spring Boot 3 REST + SSE → H2/MySQL with Flyway.

The disruption event pipeline is the most complex component: after a disruption is
committed, an after-transaction event runs `ImpactAnalysisService` → `RecommendationEngine`
(with `FitsHotelRule`) → `HotelImpactAnalyzer` → `NotificationService` (SSE + email).

---

## Demo accounts

| Role | Email |
|---|---|
| Admin | `admin@trainconcierge.demo` |
| Asha (PASSENGER) | `asha.kulkarni@trainconcierge.demo` |
| Fatima (PASSENGER) | `fatima.sheikh@trainconcierge.demo` |
| Karan (PASSENGER) | `karan.mehta@trainconcierge.demo` |
