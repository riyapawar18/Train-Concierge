# Phase 07 — Journeys and Bookings

- **Date:** 2026-10-28
- **Branch:** n/a (the workspace is not a Git repository)
- **Status:** Complete. Seat holds now become bookings with a PNR, My Journeys and the journey
  detail page read the signed-in passenger's own data, cancellation frees the seats and shows an
  estimated refund, and the dashboard is built from real journeys. `mvn clean verify` passes
  with 72 tests, `npm run build` passes and `npm run test` passes with 108 tests. Live checks on
  an isolated `local-h2,demo` backend covered the whole flow: hold → booking → seat occupancy →
  list and detail → cancel and refund → PNR lookup → dashboard counts → edit. Nothing was
  committed or pushed.

## 1. What was built

**Database**

- `V5__bookings.sql` — `bookings`, `booking_passengers` and `journeys` with their keys and
  checks. The brief names this file `V4__bookings.sql`, but `V4` already holds the Phase 06 seat
  holds, so the migration is numbered `V5` to keep Flyway's ordering.
- `bookings` stores the PNR (unique 10 digits), train, date, boarding and alighting stations,
  boarding and arrival times, class, quota, status (`HELD`, `CONFIRMED`, `REBOOKED`,
  `CANCELLED`), the fare breakdown (`base_fare`, `reservation_charge`, `gst`, `total_fare`), the
  refund (`refund_amount`, `refund_percent`), contact email and mobile, `source_booking_id` for
  later rebooking, timestamps and a `version` column for optimistic locking.
- `booking_passengers` stores name, age, gender, optional berth preference, the
  `seat_inventory_id`, the rendered seat label and the coach number.
- `journeys` links one user to one booking (`uk_journeys_booking`), with title, notes, stored
  status (`UPCOMING`, `ACTIVE`, `DISRUPTED`, `REBOOKED`, `COMPLETED`, `CANCELLED`),
  `disruption_id` and timestamps.

**Backend**

- `BookingService` / `BookingController` — `POST /api/bookings` and
  `GET /api/bookings/pnr/{pnr}`.
- `JourneyService` / `JourneyController` — `GET /api/journeys`, `GET /api/journeys/summary`,
  `GET /api/journeys/{id}`, `PUT /api/journeys/{id}` and `POST /api/journeys/{id}/cancel`.
- `JourneyStatuses`, `JourneyStatus`, `JourneySort` — status derivation and list sorting.
- `RefundPolicy` — the tiered refund used by cancellation and by the client-side estimate.
- `BookingMappings` and `dto/` — booking, journey list, detail, cancel, summary and fare
  payloads.
- `DemoJourneySeeder` — eight demo journeys in the demo profile.

**Frontend**

- `BookingFlow` — a four-step dialog launched from the seat map's **Book Now**: passenger
  details, review, stubbed payment, success with the PNR and **View my journeys**.
- `JourneysPage` at `/app/journeys` — heading and subtitle, **Plan a Journey** and **Check Train
  Status**, summary chips that double as status filters, search, status, date range, sort,
  pagination and the responsive table with View, Edit and Cancel.
- `JourneyDetailPage` at `/app/journeys/:id` — route timeline, passengers with a small berth
  diagram, fare, refund, trip details and hidden-when-empty disruption and hotel sections.
- `CancelJourneyDialog` and `EditJourneyDialog`, `CoachSeatDiagram`, `fare.ts` (the client mirror
  of the server fare and refund rules) and `format.ts`.
- `PnrStatusPanel` now performs a real owner-only PNR lookup instead of the Phase 06 placeholder.
- `DashboardPage` — welcome line, journey summary cards, the next three upcoming journeys,
  travel alerts, quick actions and recent activity, all from the passenger's own data.

### Alignment notes

- Status is derived on read. `UPCOMING`, `ACTIVE` and `COMPLETED` come from the clock;
  `CANCELLED`, `DISRUPTED` and `REBOOKED` win over the clock. A stored `UPCOMING` row whose
  boarding time has passed therefore reads as `ACTIVE` or `COMPLETED`.
- `NEEDS_ATTENTION` is the union of `DISRUPTED` and `REBOOKED` in both the list filter and the
  summary count. `Active disruptions` counts `DISRUPTED` only.
- Every read filters by the authenticated user id; another passenger's journey id or PNR returns
  `404`, not `403`, so the API does not confirm that the record exists.
- Money copy: the refund is always **Estimated refund** in the UI, never "mock" and never
  "simulated"; the cancel payload carries `simulated: true` and the label, and this report names
  the simulation. The existing fare and payment notes still say fares and payment are simulated.

## 2. Booking behaviour

`POST /api/bookings` accepts the train number, date, boarding and alighting stations, class,
quota, contact email and mobile, one passenger per held seat and the matching `holdIds`.

1. The train, class and date are validated against the catalog and the travel-date window.
2. The hold list must have one entry per passenger, no duplicates and at most six passengers.
3. Each hold must belong to the caller, still be `HELD`, not be expired, and match the train,
   date and class. A mismatched, expired or foreign hold returns `409 SEAT_HOLD_INVALID` or
   `409 HOLD_EXPIRED` and no booking is written.
4. Boarding and alighting stops must exist in that order; the segment fare and the quota fare
   are recomputed on the server, then reservation charge (₹60 AC, ₹40 non-AC per passenger) and
   5% GST are added.
5. The seats become `OCCUPIED`, a unique 10-digit PNR is allocated (20 attempts, then an error),
   the booking is saved with `CONFIRMED` and an `UPCOMING` journey is created.
6. An optimistic-locking or unique-constraint failure is translated to
   `409 SEAT_UNAVAILABLE`, so two bookings racing for one hold produce one winner.

`GET /api/bookings/pnr/{pnr}` returns the caller's booking with its journey id, passengers,
seats and fare, or `404` for anyone else. The booking flow's success screen shows the PNR and
links to My Journeys; the seat map is refreshed so the booked seats render as occupied.

## 3. Journeys list, detail and editing

`GET /api/journeys` accepts:

| Parameter | Behaviour |
| --- | --- |
| `status` | `ALL` (default), `UPCOMING`, `ACTIVE`, `NEEDS_ATTENTION`, `COMPLETED` or `CANCELLED`; unknown values return `400` |
| `from` / `to` | Travel-date range; `from` after `to` returns `400` |
| `q` | Case-insensitive match on PNR, train name, train number, title, origin and destination |
| `page` / `size` | `page` starts at 1; `size` is clamped to 1–50 (the UI uses 10) |
| `sort` | `TRAVEL_DATE_ASC` (default), `TRAVEL_DATE_DESC` or `CREATED_DESC` |

The response carries the page, size, totals and the server time used for status derivation, so
the client renders the same state the server computed. Rows include PNR, train, route, date and
time, class and seat labels, effective status, booking status, total fare and any refund.

`GET /api/journeys/{id}` adds the ordered route stops with the boarding and alighting flags,
passengers with coach and berth labels, the fare breakdown and the refund when cancelled.
`PUT /api/journeys/{id}` changes the title and notes at any time before the journey is locked;
passenger names can be changed only while the journey is `UPCOMING`. Date, train, class and
seats cannot be changed. `CANCELLED`, `COMPLETED` and `REBOOKED` journeys return
`409 JOURNEY_LOCKED`.

My Journeys keeps its state in the URL (`status`, `q`, `from`, `to`, `sort`, `page`), so filters
survive a refresh. The summary chips show the API counts and set the matching status filter.

## 4. Cancellation and refunds

`POST /api/journeys/{id}/cancel`:

- Rejects an already-cancelled journey (`409 JOURNEY_ALREADY_CANCELLED`) and a completed one
  (`409 JOURNEY_COMPLETED`).
- Computes the refund from the hours between now and the booking's boarding time, using whole
  hours: more than 48 h → 75%, more than 12 h → 50%, more than 4 h → 25%, otherwise 0.
- Stores the amount and percent on the booking, marks the booking and journey `CANCELLED`,
  timestamps the cancellation and returns every `OCCUPIED` seat to `AVAILABLE`.
- Responds with `refund: { amount, percent, label: "Estimated refund", simulated: true }` and
  the cancellation time.

The cancel dialog states the same estimate before the request, for example
`Estimated refund: ₹410 (50% of the fare).` After confirmation the row and the detail page show
`CANCELLED` and the refund, and the summary chips and dashboard counts move with it. The
client-side estimate in `fare.ts` mirrors the server exactly, including `Math.trunc` whole-hour
arithmetic and the strict `>` boundaries.

## 5. Demo journeys

`DemoJourneySeeder` runs after the catalog in the demo profile and is idempotent because each
journey is matched by user and title. Dates are relative to the day the app starts, PNRs are
unique and the seats are real `OCCUPIED` inventory rows:

| Passenger | Train | Class | Date | State |
| --- | --- | --- | --- | --- |
| Asha Kulkarni | 11007 PUNE → CSMT (2 passengers) | 3A | today + 2 | `UPCOMING` |
| Asha Kulkarni | 11007 PUNE → CSMT (evening service) | 2A | today if still running, else tomorrow | `UPCOMING` |
| Fatima Sheikh | 11007 PUNE → CSMT (2 passengers) | 3A | today + 2 | `UPCOMING` |
| Rohan Deshmukh | 12123 PUNE → CSMT | CC | today + 2 | `UPCOMING` |
| Meera Iyer | 12007 SBC → MAS | CC | today + 5 | `UPCOMING` |
| Meera Iyer | 12007 SBC → MAS (2 passengers) | EC | today − 7 | reads `COMPLETED` |
| Karan Singh | 12951 BCT → NDLS | 2A | today + 9 | `UPCOMING` |
| Karan Singh | 12951 BCT → NDLS | 3A | today + 4 | `CANCELLED` |

The evening service runs 16:30–19:45; the seeder uses today while it is still running and
tomorrow otherwise, so the journey never starts in the past. The seeder calls
`SeatInventoryService.ensureInventory` for each date, which adds the past 12007 date to the
14-day catalog window (128 more rows) so the completed journey has seats to show.

## 6. Acceptance criteria

| Criterion | Result |
| --- | --- |
| A booking made from held seats earns a PNR and appears in My Journeys | **Pass.** Live: 11007 3A PUNE → CSMT on 2026-10-30, 2 passengers → PNR `8075359965`, journey 9, listed at the top of My Journeys and in the dashboard's recent activity. |
| Held seats become occupied on the seat map | **Pass.** C1-13 flipped from `AVAILABLE` to `OCCUPIED` after booking; coach C1's available count dropped 16 → 15 in the same map. |
| Only the caller's journeys are listed and another user's id returns `404` | **Pass.** `GET /api/journeys/3` with Asha's token returns `404` (journey 3 belongs to Fatima); the list only ever contains her own rows. |
| Cancelling frees the seats, shows an estimated refund and marks the journey `CANCELLED` | **Pass.** The dialog showed `Estimated refund: ₹410 (50% of the fare).`; confirming released the seat back to `AVAILABLE`, changed the row and detail page to `CANCELLED` with `Refund ₹410`, and moved the summary to 2 upcoming / 1 cancelled. |
| PNR lookup is owner-only and returns `404` for anyone else | **Pass.** The caller's PNR rendered the booking card; a foreign PNR returned `404` and the UI said `No booking found for 8984840656`. |
| Dashboard counts match the journey list | **Pass.** After the booking and cancellation the dashboard showed 2 Upcoming, 0 Active, 1 Needs attention and 0 Active disruptions, matching the list chips; the top recent-activity row was the new booking. |
| Demo accounts show the described journeys and re-seeding does not duplicate them | **Pass.** `DemoJourneySeederTest` asserts the eight journeys, unique PNRs, seat occupancy and an idempotent second run; a fresh live start showed Asha's `Mumbai weekend with Neha` (3A, 2026-10-30) and `Evening run to Mumbai` (2A, 2026-10-29). |
| Empty, loading and error states render with friendly copy | **Pass.** Loading skeletons, the "No journeys planned yet. Search trains to plan your next trip." empty state and "No journeys match these filters" were rendered live; the error state with **Try again** is covered by a new `JourneysPage` test (see §8 for why it was not captured live). |
| `mvn clean verify`, `npm run build`, `npm run test` pass | **Pass.** 72 backend tests, production build succeeds, 108 frontend tests. |

## 7. Live verification

Backend on port 8082 with `local-h2,demo` and a locally supplied `DEMO_PASSWORD` and
`JWT_SECRET`; the password and token are not recorded here. Vite ran on port 5176 with
`VITE_PROXY_TARGET=http://localhost:8082`, so the passenger's own 8080/5173 instance was left
untouched. The passenger was `asha.kulkarni@trainconcierge.demo`.

| Check | Result |
| --- | --- |
| Sign in and dashboard | Welcome line with the first name; summary cards, upcoming journeys and the `No disruptions affecting your journeys.` alert |
| `GET /api/trains/search?from=PUNE&to=CSMT&date=2026-10-30` | `200`, 11007 available in 3A |
| Hold C1-13 from the seat map | Held, countdown shown, `Book Now` enabled |
| `Book Now` with empty passenger fields | Inline validation, no request sent |
| Passenger details filled and reviewed | Base fare ₹720 + reservation ₹60 + GST ₹39 = **₹819** |
| Stubbed payment → booking | PNR `8075359965`, journey 9, success screen with **View my journeys** |
| Seat map after booking | C1-13 `OCCUPIED`, C1 available 16 → 15 |
| `GET /api/journeys?page=1&size=10` | `200`, the new journey first, pagination footer `1 of 1 · 3 journeys` |
| Cancel dialog | `Estimated refund: ₹410 (50% of the fare).` |
| Cancel response | `{ amount: 409.50, percent: 50, label: "Estimated refund", simulated: true }` |
| After cancelling | Row `CANCELLED` with `Refund ₹410`, seat `AVAILABLE` again, summary 2 upcoming / 0 active / 1 cancelled |
| Journey detail | Route timeline, passenger berth diagram, fare ₹819 and refund ₹410 |
| `GET /api/journeys/3` as Asha | `404` |
| `GET /api/bookings/pnr/{own}` and a foreign PNR | `200` with the card, `404` and `No booking found for 8984840656` |
| Status chip and search | `Cancelled` chip filtered the list; a nonsense search showed `No journeys match these filters` |
| Edit dialog | Prefilled, saved a new title, the heading updated and the dialog closed |
| Dashboard after booking and cancelling | 2 upcoming, 0 active, 1 needs attention, 0 active disruptions; recent activity topped by the new booking |
| Fresh demo start | Asha's two upcoming journeys seeded with the briefed titles and relative dates |

Failure modes use the shared `ApiError` shape with a friendly message; no stack trace, SQL or
seat owner is exposed. `normalizeApiError` keeps the copy human in every error state.

## 8. Tests and build

**Backend — `mvn clean verify`:** 72 tests, 0 failures, 0 errors, 0 skipped, BUILD SUCCESS
(16 test classes). Phase 07 adds 17 tests:

- `BookingApiTest` (9) — a booking creates the journey and occupies the held seats; foreign,
  expired and mismatched holds are rejected; a hold can be booked only once; cancellation frees
  the seats and estimates the refund; journeys and PNR lookups are owner-scoped; title, notes and
  passenger names can be edited until departure; status follows the clock even when the stored
  row says `UPCOMING`; the list supports status, search, date filters, sorting and pagination;
  the needs-attention filter combines `DISRUPTED` and `REBOOKED`.
- `DemoJourneySeederTest` (4) — relative upcoming and past journeys, unique PNRs with real seats
  that match the state, an idempotent re-seed, and the evening-service date rule.
- `RefundPolicyTest` (1) — the four refund tiers at their boundaries.
- `JourneyStatusesTest` (3) — clock-derived statuses, stored states winning, and the exact
  boarding/arrival instants.
- `DemoCatalogSeedTest` now expects 85,920 seat rows and 100 coaches because the journey seeder
  adds inventory for the past 12007 date.

**Frontend — `npm run build && npm run test`:** the type-check and Vite production build pass
(2,350 modules; 842.44 kB JavaScript, 258.90 kB gzip; 57.46 kB CSS, 11.13 kB gzip). Vite warns
that the main chunk exceeds 500 kB; it is a warning, not a failure. Vitest runs **108 tests in
13 files, all passing**. Phase 07 tests:

- `BookingFlow.test.tsx` — passenger validation before review, confirming with the stubbed
  payment and showing the PNR, and expired holds sending the passenger back to the seat map.
- `JourneysPage.test.tsx` — listing and chip filtering, the estimated refund in the cancel
  dialog and cancelling, the friendly error with **Try again** recovering, and the empty state.
- `fare.test.ts` — the AC and non-AC fare rules, the quota multiplier and the tiered refund with
  a fixed clock.

Existing suites were updated where the behaviour changed: the seat panel's **Book Now** now
opens the booking flow, the guards and layout tests follow the new routes, and the status badge
snapshot includes the journey statuses. The shared test setup raises `asyncUtilTimeout` to 5 s
and the Vitest timeouts to 20 s because interaction-heavy tests exceeded the 1 s default when
workers share the CPU during a Maven build.

## 9. Limitations and follow-ups

- **Payment is stubbed.** The payment step creates the booking without charging anything; real
  payment arrives in a later phase. The UI says so.
- **Refunds are simulated.** The amount is stored for display; no money moves and there is no
  refund gateway. The UI never promises a payout.
- **No screenshots in this report.** The UI was verified through the in-app browser with DOM
  snapshots and API calls, but that browser had no visible surface, so screenshots could not be
  captured this phase. The Phase 06 screenshots still describe the surrounding shell.
- **The error state was verified by test, not by stopping the backend.** With the backend down
  the session hydration fails too and the guard redirects to `/auth`, so the journeys error
  state is only reachable through a failing list request while the session is valid. The new
  `JourneysPage` test covers the error copy and the retry.
- **Disruption, rebooking and hotel content are placeholders.** The detail page hides those
  sections when empty; they arrive in later phases.
- **MySQL/Flyway for V5 is not verified live.** The checks ran on H2 in MySQL mode with Flyway
  disabled, consistent with the Phase 05 and 06 limitation; the local MySQL account cannot
  create a scratch schema. Run `V5__bookings.sql` against a throwaway MySQL schema before a
  shared deployment.
- **Journey lists are assembled in memory.** `JourneyService` filters and paginates the
  passenger's journeys after loading them, which is fine at demo scale; a database-side query
  is the next step if a passenger can have thousands of journeys.

## 10. Files

Created:

- `backend/src/main/resources/db/migration/V5__bookings.sql`
- `backend/src/main/java/com/trainconcierge/booking/` — `Booking`, `BookingPassenger`,
  `Journey`, `BookingService`, `JourneyService`, `RefundPolicy`, `JourneyStatuses`, status and
  sort enums, repositories, `BookingMappings`, `DemoJourneySeeder` and `dto/`
- `backend/src/test/java/com/trainconcierge/booking/` — `BookingApiTest`,
  `DemoJourneySeederTest`, `RefundPolicyTest`, `JourneyStatusesTest`
- `frontend/src/features/journeys/` — `api.ts`, `types.ts`, `fare.ts`, `format.ts`,
  `constants.ts`, `components/` (`BookingFlow`, `CancelJourneyDialog`, `EditJourneyDialog`,
  `CoachSeatDiagram`) and `__tests__/`
- `frontend/src/features/passenger/pages/JourneysPage.tsx`
- `frontend/src/features/passenger/pages/JourneyDetailPage.tsx`

Modified:

- `frontend/src/app/router.tsx` — `/app/journeys` and `/app/journeys/:id`.
- `frontend/src/features/passenger/pages/DashboardPage.tsx` — journey widgets from real data.
- `frontend/src/features/passenger/pages/TrainSearchPage.tsx` — passes the route and fare into
  the seat panel so **Book Now** can open the booking flow.
- `frontend/src/features/travel/components/SeatSelectionPanel.tsx` — booking flow entry point.
- `frontend/src/features/travel/components/PnrStatusPanel.tsx` — real owner-only PNR lookup.
- `frontend/src/lib/status.ts` — journey statuses for the badge.
- `frontend/src/test/setup.ts` and `frontend/vite.config.ts` — async and test timeouts.
- `backend/src/main/java/com/trainconcierge/travel/SeatInventory.java` and
  `seat_inventory` mappings — confirm/release transitions used by booking and cancellation.
- `backend/src/test/java/com/trainconcierge/catalog/DemoCatalogSeedTest.java` — seat and coach
  counts after the journey seeder adds the past date.
- `README.md` — Phase 07 state, V5, booking and journey API, demo journeys, routes and test
  counts.
