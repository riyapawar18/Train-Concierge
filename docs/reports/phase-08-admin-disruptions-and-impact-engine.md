# Phase 08 — Admin Disruptions and the Impact Engine

- **Date:** 2026-10-29
- **Branch:** n/a (the workspace is not a Git repository)
- **Status:** Complete. An administrator can log a delay or cancellation, the backend works out
  exactly which confirmed bookings are affected and generates ranked, explainable alternatives,
  the passenger sees the update and can open the alternatives, and resolving the disruption
  restores the journeys. `mvn clean verify` passes with 85 tests, `npm run build` passes and
  `npm run test` passes with 129 tests. Live checks on an isolated `local-h2,demo` stack covered
  the full admin and passenger flows, including duplicate rejection, ownership `404`,
  admin-only `403`, the short-delay wait option, cancellation refund note and resolution.
  Nothing was committed or pushed.

## 1. What was built

**Database**

- `V6__disruptions.sql` — `disruptions`, `journey_impacts` and `recommendations`. The brief
  names this file `V5__disruptions.sql`, but `V5` already holds the Phase 07 bookings, so the
  migration is numbered `V6` to keep Flyway's ordering.
- `disruptions` stores the train, travel date, type (`DELAY`, `CANCELLATION`), delay minutes,
  reason, severity (`LOW`, `MEDIUM`, `HIGH`), status (`ACTIVE`, `RESOLVED`), creator and
  resolver, timestamps, a `version` column and an `active_marker` that is `1` while active and
  `NULL` after resolution. The unique key on `(train_number, travel_date, active_marker)` forbids
  a second active disruption for the same train and date while keeping the resolved history.
- `journey_impacts` stores one row per disruption and booking (`uk_journey_impacts_disruption_booking`),
  the original and new arrival, delay, missed-connection, overnight and hotel flags, the impact
  level (`MINOR`, `MODERATE`, `SEVERE`) and the plain-English summary.
- `recommendations` stores the kind (`TRAIN`, `BUS`, `WAIT`), the referenced train or bus trip,
  class, from/to stations, departure and arrival, fare, seats, score, `rank`, `recommended`
  (the best option), the reasons and warnings, and the creation time.
- `train status` now consults an active disruption: `GET /api/trains/{number}/status` returns
  `DELAYED` with the delay and a link to the passenger update, or `CANCELLED`, instead of
  `ON_TIME`.

**Backend**

- `AdminDisruptionController` — list, preview, create, detail, impacts, update and resolve under
  `/api/admin/disruptions`.
- `DisruptionController` — the passenger list, update detail, journey impact and recommendations.
- `DisruptionService`, `Disruption`, `DisruptionRepository`, the type/status/severity/level
  enums and the DTOs — validation, audit rows and domain events.
- `ImpactAnalysisService` — recomputes impacts for every confirmed booking on the train and date.
- `RecommendationEngine` plus thirteen `RecommendationRule` implementations — candidate
  generation, rule scoring, deterministic ranking and caps.
- `DisruptionPipeline`, `DisruptionEventListener`, `DisruptionProperties` and
  `DisruptionNotifier` — the after-commit pipeline, configurable weights and the notification
  seam.
- `ImpactText` — the shared duration and arrival wording used by the summaries and the train
  status.

**Frontend**

- `AdminDisruptionsPage` at `/admin/disruptions` — heading and subtitle, status chips
  (`Active`, `Resolved`, `All`), train and travel-date filters, refresh, responsive table and
  pagination-free list of every matching disruption, with a 30-second refetch.
- `NewDisruptionDialog` — train autocomplete, travel date, type, delay with 30/60/120/240-minute
  quick buttons, reason presets, severity and a live preview of the confirmed passengers and
  bookings affected.
- `AdminDisruptionDrawer` — the disruption, the affected passengers with PNRs and journey impact,
  the generated alternatives and a **Resolve disruption** action behind a confirmation dialog.
- `DisruptionsPage` at `/app/disruptions` — the passenger's active and resolved updates, with
  **View alternatives** and a calm "All clear" empty state.
- `DisruptionDetailPage` at `/app/disruptions/:id` — the update, its reason and severity, one
  card per affected journey with the impact summary and **View alternatives**.
- `RecoveryPage` at `/app/recovery?journey=` — the journey impact and the ranked alternatives,
  with kind filters, **Best option**, reasons, warnings, fares, seats and a 30-second refetch.
- `DashboardPage` — the travel alerts and **Needs attention** / **Active disruptions** counts
  now come from the passenger's real disruption data.
- `TrainStatusPage` — the simulated status badge now reflects an active disruption.

### Alignment notes

- Status is still derived on read for journeys. An active disruption marks the journey
  `DISRUPTED`; resolving restores the stored status (`UPCOMING`, `ACTIVE`, `COMPLETED`, ...)
  without rebooking anything.
- Recommendations are generated once per impact when the disruption is created and again when it
  is updated. Resolution keeps the recommendation rows for reference and the passenger API
  returns them with `active: false`.
- The preview endpoint is read-only and reuses the same train-and-date validation as creation;
  it does not write impacts or recommendations.
- The impact analyzer only considers `CONFIRMED` bookings. Held, cancelled and rebooked
  bookings are ignored, matching the brief.
- Every admin endpoint requires `ADMIN`; every passenger endpoint is scoped to the caller's
  bookings and returns `404` for another passenger's update or journey.

## 2. Admin API and validation

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/admin/disruptions?status&train&date` | Active, resolved or all disruptions, optionally filtered by train or travel date |
| `POST` | `/api/admin/disruptions/preview` | Confirmed bookings, passengers and journeys affected by a planned disruption |
| `POST` | `/api/admin/disruptions` | Log a disruption and start the impact pipeline |
| `GET` | `/api/admin/disruptions/trains?q=` | Train suggestions for the autocomplete |
| `GET` | `/api/admin/disruptions/{id}` | Disruption detail with the aggregate counts |
| `GET` | `/api/admin/disruptions/{id}/impacts` | Per-booking impacts with passengers and PNRs |
| `PATCH` | `/api/admin/disruptions/{id}` | Correct the delay or the reason |
| `PATCH` | `/api/admin/disruptions/{id}/resolve` | Resolve and restore the affected journeys |

Creation validates:

1. The train exists and runs on the travel date (`400`, field `trainNumber`).
2. A delay is between 5 and 1,440 minutes (`400`, field `delayMinutes`).
3. A cancellation has no delay (`400`, field `delayMinutes`).
4. The reason is present and at most 190 characters (`400`, field `reason`).
5. No other disruption for the same train and date is still active
   (`409 DISRUPTION_ALREADY_ACTIVE`).
6. The caller is an administrator (`403` for a passenger token).

Creation saves the disruption, writes a `DISRUPTION_CREATED` audit row and publishes a
`DisruptionCreatedEvent` in one transaction. Updates require an active disruption
(`409 DISRUPTION_RESOLVED` otherwise), and resolution records the resolver and time, writes a
`DISRUPTION_RESOLVED` audit row and publishes `DisruptionResolvedEvent`.

## 3. The impact pipeline

`DisruptionEventListener` handles the three events with
`@TransactionalEventListener(phase = AFTER_COMMIT)`. `DisruptionPipeline` opens a
`REQUIRES_NEW` transaction for the analysis; without the new transaction the after-commit
callback would still be bound to the committed transaction and the impact writes would be lost.

For each event the pipeline:

1. Loads the disruption.
2. Runs `ImpactAnalysisService.analyze`.
3. Generates recommendations for every impact.
4. Calls `DisruptionNotifier`, which is a no-op in this phase.

`ImpactAnalysisService` loads every `CONFIRMED` booking for the train and date, skips journeys
whose stored status is `CANCELLED`, and finds or creates one impact per disruption and booking.
The unique key guarantees idempotency: re-running the analysis updates the existing rows, and the
live flow created exactly two impacts for the two affected bookings.

For a delay:

- `newArrival` is the booked arrival plus the delay.
- `missedConnection` is true when the passenger has another confirmed booking that departs
  between the original arrival and the new arrival.
- `overnight` is true when the new arrival is after 22:00 or the delay is longer than six hours.
- `needsHotel` mirrors `overnight`.
- The impact level is `MINOR` below 60 minutes, `MODERATE` between 60 and 240 minutes inclusive,
  and `SEVERE` above 240 minutes.
- The summary names the train, the delay, the new arrival time and any missed connection or
  hotel consequence, capped at 300 characters.

For a cancellation:

- `newArrival` is `NULL`, the level is always `SEVERE`, and the summary states that a full refund
  applies and alternatives are being shown.
- `overnight` is true only when there is no same-day train or bus with enough seats after the
  rebooking buffer, so a cancellation with an evening alternative does not automatically create
  a hotel need.

Every affected journey is marked `DISRUPTED` with the disruption id. The passenger endpoints
read the impact and the recommendations rather than recomputing them.

## 4. The recommendation engine

Candidates are trains that pass through the booked stations in the right order on the travel date
or the next day, with enough seats in a class close to the booked class, plus buses between the
same cities on the same two days. A wait option is added only for a short delay. Every candidate
is scored by the ordered rules below; a rejection removes it entirely.

| # | Rule | Applies to | Points | Behaviour |
| --- | --- | --- | --- | --- |
| 10 | Reachability | Train, bus | reject | Drops anything departing before boarding time + 30-minute rebooking buffer + 20-minute station transfer ("Departs before you can reach the station") |
| 20 | Seat availability | Train, bus | reject | Drops anything with fewer seats than the party ("Not enough seats for your party") |
| 30 | Earlier arrival | Train, bus | +40, plus 5 per 30 minutes saved, capped at +20 | Only when it arrives before the delayed train's new arrival ("Arrives 2h 15m earlier than your delayed train") |
| 40 | Same class | Train | +20 | "Same class as your booked ticket" |
| 45 | Higher class | Train | +5, warning | "Higher fare" when the chosen class ranks above the booked class |
| 50 | Lower class | Train | +10, warning | "Lower class than booked" |
| 60 | Fare tolerance | Train, bus | +10 | Within ±20% of the fare paid ("Fare within 20% of what you paid") |
| 70 | Direct service | Train, bus | +15 | "Direct service, no change on the way" |
| 80 | Train type | Train | +5 | Rajdhani, Shatabdi or Vande Bharat ("Preferred premium train") |
| 90 | Bus duration | Bus | +20 / −20 | Faster than the delayed journey scores +20 and "Reaches sooner than your delayed train"; slower scores −20 and "Longer journey than your delayed train" |
| 100 | Wait option | Wait | 60 | Creates and scores "Wait for your train" for a delay between 1 and 59 minutes ("Short delay: your train is still the fastest option") |
| 110 | Cancellation | Train, bus | 0 | Adds "Full refund applies to your original ticket" to every alternative |
| 120 | Overnight | Train, bus | 0 | Adds "Overnight journey: hotel suggestions are available" when the impact needs a hotel |

The rules are Spring beans ordered by `@Order`; the engine injects every `RecommendationRule`,
so a new rule is a new class, not an engine change. All weights live in `application.yml` under
`app.disruptions` and can be overridden by environment variables:

| Setting | Value | Meaning |
| --- | --- | --- |
| `hotel-unlock-hour` | 22 | Arrivals after this hour count as overnight |
| `hotel-unlock-wait-hours` | 6 | A delay longer than this many hours also counts as overnight |
| `rebooking-buffer-minutes` | 30 | Time to rebook after boarding would have started |
| `station-transfer-minutes` | 20 | Time to reach the station |
| `short-delay-minutes` | 60 | Below this a delay offers the wait option |
| `fare-tolerance-percent` | 20 | Fare band that earns the fare points |
| `max-trains` / `max-buses` / `max-recommendations` | 5 / 3 / 8 | Selection caps |
| `savings-step-minutes` / `savings-step-points` / `savings-cap-points` | 30 / 5 / 20 | Earlier-arrival bonus |
| `earlier-arrival-points` | 40 | Base earlier-arrival score |
| `same-class-points` / `higher-class-points` / `lower-class-points` | 20 / 5 / 10 | Class fit |
| `fare-within-points` | 10 | Fare-band score |
| `direct-service-points` | 15 | Direct service score |
| `train-type-points` | 5 | Premium train score |
| `bus-duration-points` | 20 | Bus speed bonus or penalty |
| `wait-option-points` | 60 | Wait option score |

Ranking is deterministic: score descending, then kind (`TRAIN`, `BUS`, `WAIT`), then departure
time, then the train number or bus trip id. The first option is flagged `recommended` and the UI
labels it **Best option**. The engine keeps at most five trains, three buses and eight options in
total, so a passenger sees a short, ranked list rather than every departure in the corridor.
Recommendations are deleted and regenerated for an impact on update, which keeps the list in step
with a corrected delay or reason.

## 5. Passenger API and experience

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/disruptions/mine?status` | The caller's disruption updates, newest first |
| `GET` | `/api/disruptions/{id}` | One update with the caller's affected journeys, or `404` |
| `GET` | `/api/journeys/{id}/impact` | The caller's impact for a journey, or `404` |
| `GET` | `/api/journeys/{id}/recommendations?kind` | The ranked alternatives, optionally one kind |

`/app/disruptions` lists every update with the train, route, travel date, delay or cancellation,
severity, status, reason and the number of the caller's journeys affected. The chips switch
between `All`, `Active` and `Resolved`. **View alternatives** opens the recovery page for the
affected journey. When nothing is active the page shows **All clear** with a calm explanation
rather than an error, and the Resolved tab explains that resolved updates stay on record.

`/app/disruptions/:id` shows the update and one card per affected journey with the impact level,
summary, original and new arrival, hotel or missed-connection flags, and a link to the
alternatives. Another passenger's update, or a journey the caller does not own, renders the
friendly **Update not found** state because the API returns `404`.

`/app/recovery?journey=` shows the impact summary, the original and new arrival, the refund note
for a cancellation, the filters for all options, trains, buses and wait, and the ranked cards
with departure, arrival, duration, fare, seats, score, reasons and warnings. A resolved
disruption adds a note that the alternatives are kept for reference and can no longer be booked
from the page. The page refetches every 30 seconds while open.

The dashboard's **Travel alerts** card shows up to three active updates with a link to the list,
and the **Needs attention** and **Active disruptions** counts come from the journey summary and
the active disruption list. When there is nothing active the card says
`No disruptions affecting your journeys.`

## 6. Worked demo example

The demo data has Asha and Fatima on **11007 Deccan Express**, PUNE 16:30 → CSMT 19:45, 3A,
two passengers each, on 2026-10-31 (today + 2). Rohan is on 12123 Deccan Queen the same day.
The administrator logs a **195-minute delay** (3h 15m) with a "Signal failure near Lonavala"
reason and `MEDIUM` severity.

Before saving, the preview shows **Will affect 4 confirmed passengers** with the count of
`2 confirmed bookings`. Creating the disruption produces exactly two impacts; Rohan's 12123
booking is untouched:

| Passenger | Journey | Level | New arrival | Hotel | Alternatives |
| --- | --- | --- | --- | --- | --- |
| Asha Kulkarni | 11007, 3A, 2 passengers | `MODERATE` (195 min) | 23:00 | Yes (arrival after 22:00) | 7 |
| Fatima Sheikh | 11007, 3A, 2 passengers | `MODERATE` (195 min) | 23:00 | Yes (arrival after 22:00) | 7 |

Both journeys read `DISRUPTED`, and the train status becomes `DELAYED` with a link to
`/app/disruptions/1`. The admin detail shows **4 passengers**, **2 bookings** and
**14 alternatives** in total.

Asha's options are ranked as follows. Her booking total is ₹1,638 (two 3A passengers), the new
arrival is 23:00 and the earliest viable departure is 17:20.

| Rank | Option | Departure → arrival | Fare | Score | Why it ranks here |
| --- | --- | --- | --- | --- | --- |
| 1 | Bus — Western Express (VOLVO) | 19:00 → 22:55 | ₹1,560 | 85 | Arrives before the delayed train (+40), fare within 20% (+10), direct (+15), faster than the delayed journey (+20) |
| 2 | 12169 Solapur Mumbai Express | 23:10 → 02:25 +1 | ₹1,491 | 45 | Same class (+20), fare within 20% (+10), direct (+15); overnight hotel warning |
| 3 | Bus — Sahyadri Travels (AC sleeper) | 22:30 → 03:30 +1 | ₹1,700 | 45 | Fare within 20% (+10), direct (+15), faster than the delayed journey (+20) |
| 4 | Bus — Konkan Coachlines (Volvo) | 2026-11-01 08:30 → 12:20 | ₹1,500 | 45 | Fare within 20% (+10), direct (+15), faster than the delayed journey (+20) |
| 5-7 | Next-day trains 12127, 12125, 12123 | 2026-11-01 | ₹1,176–₹2,751 | 25 / 25 / 20 | Direct service, with a class-change warning where the nearest class differs |

The bus wins because it reaches Mumbai five minutes before the delayed train would have, is
direct, is faster than the delayed journey and costs about the same as the original booking. The
23:10 train keeps the same class and fare band but arrives in the small hours. The UI marks
rank 1 **Best option**, shows every reason and warning, and the kind filters read 4 trains,
3 buses and 0 wait.

Resolving the disruption restores both journeys to `UPCOMING` (their derived state), keeps both
impacts for the record, leaves the recommendation rows in place with `active: false`, returns the
train to `ON_TIME` and removes the update from the active list. The passenger sees **All clear**
and the Resolved tab still explains what happened.

The other two acceptance scenarios use the same engine:

- A **30-minute delay** on the same train produces a `MINOR` impact and the wait option at rank 1
  with score 60: "Short delay: your train is still the fastest option". Waiting beats the
  alternatives because the delayed arrival is only 20:15.
- A **cancellation of 12123** affects Rohan only. His impact is `SEVERE`, `newArrival` is empty,
  the recovery page shows the refund note **"Full refund applies to your original ticket."** and
  the same-day trains and buses are offered. The train status reads `CANCELLED`.

## 7. Acceptance criteria

| Criterion | Result |
| --- | --- |
| A 3h 15m delay on the evening demo service affects Asha and Fatima but not Rohan | **Pass.** 11007 on 2026-10-31 produced exactly two impacts for Asha and Fatima (4 passengers); Rohan's 12123 booking was not in the disruption. |
| Impacts are created exactly once | **Pass.** The unique `(disruption, booking)` key and the find-or-create logic produced two impacts for two bookings; re-running the analysis updates them instead of duplicating. The pipeline test asserts the write happens only after the creating transaction commits. |
| Journeys become `DISRUPTED` and the resolution restores them | **Pass.** Both journeys read `DISRUPTED` while active; after resolve both returned to `UPCOMING`, impacts stayed on record and the train status returned to `ON_TIME`. |
| At least two trains and one bus are ranked with reasons and a recommended top option | **Pass.** Asha received 4 trains and 3 buses; rank 1 (Western Express) was flagged `recommended` and rendered **Best option**, with reasons and warnings on every card. |
| A delay under 60 minutes offers waiting | **Pass.** A 30-minute delay produced the wait option at rank 1 with score 60 and the wait reason. |
| A cancellation offers alternatives and a refund note | **Pass.** Cancelling 12123 produced alternatives for Rohan, a `SEVERE` impact and the refund note `Full refund applies to your original ticket.` in the impact API and the recovery page. |
| An overnight impact sets the hotel need | **Pass.** The 195-minute delay moved the arrival to 23:00, which is after the 22:00 unlock hour, so `overnight` and `needsHotel` were true and the drawer and recovery cards showed the hotel warning. |
| Another passenger's disruption or journey is `404`, and a passenger on the admin API is `403` | **Pass.** A foreign disruption id and a foreign journey id both returned `404`; an Asha token on `POST /api/admin/disruptions` returned `403`. |
| A second active disruption for the same train and date is rejected | **Pass.** The duplicate create returned `409 DISRUPTION_ALREADY_ACTIVE` and no extra impact was written. |
| `mvn clean verify`, `npm run build`, `npm run test` pass | **Pass.** 85 backend tests, production build succeeds, 129 frontend tests. |

## 8. Live verification

The backend ran on port 8082 with `local-h2,demo` and a throwaway H2 file; Vite ran on port 5176
with `VITE_PROXY_TARGET=http://localhost:8082`, so the user's own 8080/5173 instance was left
untouched. The administrator was `admin@trainconcierge.demo`; the passengers were Asha Kulkarni
and Rohan Deshmukh. The password and tokens are not recorded here.

| Check | Result |
| --- | --- |
| `/admin/disruptions` on a fresh database | Table with `Active` selected and the calm **No active disruptions** state |
| Train autocomplete and live preview | Searching "Deccan" listed 11007; choosing 2026-10-31 and 195 minutes previewed the confirmed passengers before saving |
| Create the disruption | Row `Delayed 3h 15m`, `Medium` severity, `4 passengers / 2 bookings · 14 options` |
| Duplicate create | `409 DISRUPTION_ALREADY_ACTIVE`, no new impacts |
| Passenger token on the admin API | `403 FORBIDDEN` |
| `GET /api/disruptions/mine` as Asha | One active update with a `MODERATE` impact, 23:00 arrival and hotel flag |
| `GET /api/disruptions/mine` as Rohan | Empty; `GET /api/disruptions/1` as Rohan returned `404` |
| Journey status and train status | Asha's journey `DISRUPTED`; 11007 status `DELAYED` with the update link |
| Admin detail and impacts | Two impacts, four passengers, the two PNRs and the overnight/hotel flags; 14 recommendations |
| `/app/disruptions` and detail | Active update, impact summary, **View alternatives**; resolved tab empty until resolution |
| `/app/recovery?journey=` | 7 ranked options (4 trains, 3 buses), **Best option** on the Western Express, reasons, warnings and the kind filters |
| Dashboard | 1 upcoming, 1 needs attention, 1 active disruption; the travel alert linked to `/app/disruptions/1` |
| Resolve confirmation | Confirmed; toast **Disruption resolved**; list showed **No active disruptions** and the Resolved tab kept the row |
| After resolution | Journeys `UPCOMING`; two impacts retained; recommendations `active: false`; train status `ON_TIME`; passenger **All clear** |
| Short delay | 30 minutes → `MINOR`, wait option rank 1, score 60 |
| Cancellation | 12123 → Rohan `SEVERE`, `CANCELLED` status, refund note `Full refund applies to your original ticket.`, same-day alternatives |
| Validation | Delay 4 → `400`; cancellation with a delay → `400`; a train that does not run that date → `400` |
| Empty and error states | All-clear, not-found, no-alternatives and retry states rendered; failures use the shared `ApiError` copy with no stack trace or SQL |

The isolated backend and Vite processes were stopped afterwards, and the throwaway H2 file and
temporary logs were deleted. The user's `trainconcierge.mv.db` was not touched.

## 9. Tests and build

**Backend — `mvn clean verify`:** 85 tests, 0 failures, 0 errors, 0 skipped, BUILD SUCCESS
(18 test classes). Phase 08 adds 13 tests:

- `DisruptionApiTest` (5) — a delay creates impacts for exactly the confirmed bookings on the
  train and date, ranks alternatives with reasons and marks the top one, and resolves cleanly;
  a short delay recommends waiting; a cancellation keeps the refund note and still offers
  alternatives; validation and authorization protect the admin API; the pipeline runs only
  after the creating transaction commits.
- `RecommendationRulesTest` (8) — reachability, seat availability, earlier arrival, class fit
  and warnings, fare tolerance, premium train types, the overnight warning and the wait option
  boundary.

`DemoCatalogSeedTest` was unaffected after the bus and trip unique constraints were declared on
the entities in the earlier fix, so re-running the demo scripts remains idempotent.

**Frontend — `npm run build && npm run test`:** the type-check and Vite production build pass
(870 kB JavaScript, 265 kB gzip; 58 kB CSS, 11 kB gzip). Vite warns that the main chunk exceeds
500 kB; it is a warning, not a failure. Vitest runs **129 tests in 17 files, all passing**.
Phase 08 adds 21 tests:

- `AdminDisruptionsPage.test.tsx` (5) — listing and status filtering, the calm empty state,
  validation before submitting, the live preview followed by creation, and resolution behind a
  confirmation.
- `PassengerDisruptions.test.tsx` (8) — the active list with impact details and recovery links,
  Resolved and All filters, the all-clear state, a friendly error with retry, the update detail,
  the cancellation refund note, the resolved note and the not-found state for another
  passenger's update.
- `RecoveryPage.test.tsx` (6) — ranking and explaining recommendations, kind filters, the
  refund and resolved notes, the no-alternatives state, a missing journey parameter and a
  friendly error.
- `DashboardPage.test.tsx` (2) — active disruption alerts and real summary counts, and the
  all-clear variant.

Existing suites were updated for the shared copy: delay wording is now produced by a single
`formatDelay` helper ("Delayed 3h 15m", "Cancelled"), and the disruption tests scope duplicate
labels to the list item and tolerate the table and list views that the responsive table renders
at once.

## 10. Limitations and follow-ups

- **Notifications are a seam, not a delivery.** `DisruptionNotifier` is implemented by
  `NoOpDisruptionNotifier`; no email, SMS or in-app notification is sent yet. The pipeline calls
  the notifier so the next phase can add delivery without touching the analyzer or the engine.
- **Resolving does not rebook.** It restores the journey to its derived status and keeps the
  impacts and alternatives for reference. Moving a passenger onto an alternative is a later
  phase.
- **Alternatives are informational.** There is no accept, decline or rebook action on the
  recovery page; the option cards show the journey details link only. Fares and payment remain
  simulated.
- **The engine loads the schedule and classes per impact.** That is fine for the demo dataset;
  a real deployment would cache the corridor or query candidates in the database.
- **Impact analysis covers confirmed bookings only.** Waitlisted, RAC and held bookings are
  outside the brief and are ignored.
- **The train status shows the disruption but not revised downstream times.** The route still
  shows the scheduled stops with a delayed badge; per-stop revised times are not modelled.
- **No screenshots in this report.** The in-app browser used for verification had no visible
  surface, so DOM snapshots and API responses were used instead, as in Phase 07.
- **MySQL and Flyway for V6 are not verified live.** The checks ran on H2 in MySQL mode with
  Flyway disabled, consistent with earlier phases; the local MySQL account cannot create a
  scratch schema. Run `V6__disruptions.sql` against a throwaway MySQL schema before a shared
  deployment.
- **Recommendation scores depend on live seat availability.** The demo dataset is deterministic,
  so the example above reproduces, but a real inventory change can reorder or drop an option.

## 11. Files

Created:

- `backend/src/main/resources/db/migration/V6__disruptions.sql`
- `backend/src/main/java/com/trainconcierge/disruption/` — the entities, enums, repositories,
  admin and passenger controllers, `DisruptionService`, `ImpactAnalysisService`,
  `RecommendationEngine`, `Recommendation`, `DisruptionPipeline`, `DisruptionEventListener`,
  `DisruptionProperties`, `ImpactText`, `ImpactLevel`, `DisruptionNotifier`,
  `NoOpDisruptionNotifier`, `dto/`, `event/` and `rules/` (thirteen rules plus the context,
  candidate and result records)
- `backend/src/test/java/com/trainconcierge/disruption/` — `DisruptionApiTest`,
  `RecommendationRulesTest`
- `frontend/src/features/disruptions/` — `api.ts`, `types.ts`, `constants.ts`, `components/`
  (`NewDisruptionDialog`, `TrainCombobox`, `AdminDisruptionDrawer`) and `__tests__/`
- `frontend/src/features/admin/pages/AdminDisruptionsPage.tsx`
- `frontend/src/features/passenger/pages/DisruptionsPage.tsx`
- `frontend/src/features/passenger/pages/DisruptionDetailPage.tsx`
- `frontend/src/features/passenger/pages/RecoveryPage.tsx`

Modified:

- `backend/src/main/java/com/trainconcierge/travel/TrainSeatService.java` — train status consults
  active disruptions.
- `backend/src/main/java/com/trainconcierge/catalog/BusService.java` and `BusTrip.java` — the
  demo unique keys declared on the entities so Hibernate-created test schemas stay idempotent.
- `backend/src/main/resources/application.yml` — the `app.disruptions` weights.
- `frontend/src/app/router.tsx` — `/admin/disruptions`, `/app/disruptions`,
  `/app/disruptions/:id` and `/app/recovery`.
- `frontend/src/layouts/nav.ts` — passenger **Disruptions** and admin **Disruption Management**.
- `frontend/src/features/passenger/pages/DashboardPage.tsx` — travel alerts and disruption
  counts from real data.
- `frontend/src/features/passenger/pages/TrainStatusPage.tsx` — disruption-aware status.
- `frontend/src/features/travel/...` — the train status response carries the disruption link and
  delay.
- `frontend/src/features/disruptions/__tests__/fixtures.ts` and the existing test suites — shared
  disruption fixtures and the single delay-copy helper.
- `README.md` — Phase 08 state, V6, the disruption API, admin and passenger pages, routes and
  test counts.
