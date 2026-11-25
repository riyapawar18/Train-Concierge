# Phase 05 — Database Schema and Simulated Data

- **Date:** 2026-10-28
- **Branch:** `master`
- **Status:** Complete. The catalog schema, simulated dataset, authenticated read endpoints,
  demo accounts and tests are implemented. `mvn clean verify` passes with 38 tests and no
  failures. Live checks on the demo profile confirmed the endpoints, the admin sign-in and
  persistence of registered accounts across a backend restart on the `local-h2` profile.
  MySQL/Flyway execution remains unverified because the local MySQL root login was not
  available. Nothing was committed or pushed.

## 1. What was built

- **Schema migration** — `backend/src/main/resources/db/migration/V3__catalog.sql` creates
  `stations`, `trains`, `train_schedule`, `train_classes`, `coaches`, `seat_inventory`,
  `bus_services`, `bus_trips`, `hotels`, `hotel_policies`, `hotel_rooms`, `room_availability`
  and `settings`.
- **JPA domain** — `com.trainconcierge.catalog` entities, repositories, DTOs, service and
  controller for the read-only catalog.
- **Simulated data** — `backend/src/main/resources/db/demo/V100__demo_catalog.sql` and
  `V101__demo_inventory.sql`, kept outside `db/migration` so Flyway never versions demo rows.
- **Demo loader** — `DemoCatalogSeeder` executes the same scripts under the `demo` profile when
  the catalog is empty, which covers local H2 runs where Flyway is disabled.
- **Demo accounts** — `DemoAdminSeeder` now provisions one admin and five passengers from
  `DEMO_PASSWORD`; `UserService.ensurePassenger` was added for idempotent passenger creation.
- **Endpoints** — `GET /api/stations?q=`, `GET /api/stations/{code}` and
  `GET /api/trains/{number}`, authenticated by the existing security rules.

The frontend is unchanged in this phase.

## 2. Schema and relationships

| Table | Key columns | Relationships |
| --- | --- | --- |
| `stations` | `code` PK, name, city, state, latitude, longitude | Referenced by trains, schedules, buses, hotels |
| `trains` | `number` PK, name, type, `source_code`, `destination_code`, `runs_on` | Source/destination → `stations` |
| `train_schedule` | id PK, `train_number`, `station_code`, `stop_order`, arrival, departure, `day_offset`, `distance_km` | → `trains`, `stations` |
| `train_classes` | id PK, `train_number`, `class_code`, `base_fare`, `total_seats` | → `trains` |
| `coaches` | id PK, `train_number`, `class_code`, `coach_no`, `layout`, `seat_count` | → `trains` |
| `seat_inventory` | id PK, `train_number`, `travel_date`, `coach_id`, `seat_no`, `berth_type`, `status`, `held_until`, `version` | → `trains`, `coaches` |
| `bus_services` | id PK, operator, type, from/to city, `from_station_code`, departure, duration, fare, seats | → `stations` |
| `bus_trips` | id PK, `bus_service_id`, `travel_date`, `seats_left` | → `bus_services` |
| `hotels` | id PK, name, `station_code`, address, distance, price range, rating, contact | → `stations` |
| `hotel_policies` | `hotel_id` PK, check-in/out, late arrival/checkout rules, fee type and amount, extension rules | 1:1 → `hotels` |
| `hotel_rooms` | id PK, `hotel_id`, floor, room number, type, capacity, nightly price | → `hotels` |
| `room_availability` | id PK, `room_id`, `stay_date`, `status`, `held_until` | → `hotel_rooms` |
| `settings` | `setting_key` PK, `setting_value`, description | Standalone |

`settings` avoids the reserved words `key` and `value` by using `setting_key` and
`setting_value`.

Enum-like columns are constrained in the schema rather than left free text:

- Train types: `RAJDHANI`, `SHATABDI`, `EXPRESS`, `SUPERFAST`, `VANDE_BHARAT`, `OTHER`.
- Coach layouts: `BERTH`, `CHAIR_2x2`, `CHAIR_3x2`, `CHAIR_2x1`.
- Seat status: `AVAILABLE`, `OCCUPIED`, `HELD`.
- Bus types: `AC_SLEEPER`, `AC_SEATER`, `NON_AC_SEATER`, `VOLVO_MULTIAXLE`.
- Room types: `STANDARD`, `DELUXE`, `SUITE`; room status: `AVAILABLE`, `BOOKED`, `HELD`.
- Late-checkout fee: `FREE`, `HOURLY`, `FLAT`, `HALF_DAY`; extension approval: `AUTO`,
  `ON_REQUEST`.

Natural unique keys make demo loading idempotent: `(train_number, stop_order)`,
`(train_number, class_code)`, `(train_number, coach_no)`,
`(train_number, travel_date, coach_id, seat_no)`, `(operator, from_city, to_city,
departure_time)`, `(bus_service_id, travel_date)`, `(name, station_code)`,
`(hotel_id, room_no)` and `(room_id, stay_date)`.

Two indexes support the expected query paths:
`idx_train_schedule_station_departure` on `(station_code, departure_time)` and
`idx_seat_inventory_train_date_status` on `(train_number, travel_date, status)`.

The migration is deliberately portable: `CREATE TABLE IF NOT EXISTS`, table-level unique
constraints instead of inline `UNIQUE` column attributes, no MySQL-only `ENGINE`/`CHARSET`
clauses, and timestamp defaults only where both MySQL and H2 accept them. This lets the same
file create the schema in H2 before the demo scripts run.

## 3. Simulated dataset

The dataset is hand-curated, not imported. Real station names, station codes and train numbers
are used for realism; fares, schedules, occupancy and hotel details are invented for the
project.

| Table | Rows | Notes |
| --- | --- | --- |
| `stations` | 29 | Maharashtra, Delhi, Madhya Pradesh, Karnataka, Tamil Nadu, Telangana, West Bengal, Gujarat, Rajasthan, Goa, Uttar Pradesh and Andhra Pradesh |
| `trains` | 25 | Pune–CSMT, Pune–Howrah, Rajdhani, Shatabdi, Charminar and Konkan corridors |
| `train_schedule` | 111 | Ordered stops with realistic arrival/departure times and distances |
| `train_classes` | 72 | Per-train classes with base fare and total seats |
| `coaches` | 72 | Generated from classes, one coach row per class with a layout and seat count |
| `seat_inventory` | 60,704 | 14 travel days, one row per seat |
| `bus_services` | 10 | Seven Pune→Mumbai, two Mumbai→Pune and one Bengaluru→Chennai |
| `bus_trips` | 140 | 14 days per service with deterministic remaining seats |
| `hotels` | 26 | Across Pune, CSMT, BCT, DR, KYN, NDLS, SBC and MAS |
| `hotel_policies` | 26 | Four deliberate policy styles to exercise later rules |
| `hotel_rooms` | 380 | 10–20 rooms per hotel, generated by hotel id |
| `room_availability` | 5,320 | 14 nights per room, with one fully booked night per hotel |
| `settings` | 6 | Alert threshold, hotel unlock, station transfer, rebooking buffer, seat hold |

Minimum-corridor requirement: at least five trains in each direction between Pune and Mumbai
CSMT, including 11007/11008 Deccan Express (11007 departs Pune 16:30 and reaches CSMT 19:45),
12123/12124 Deccan Queen, 12125/12126 Pragati, 12127/12128 Intercity and 12169/12170.

Occupancy is deterministic rather than random, so the same rows always produce the same busy
and quiet days:

```sql
CASE WHEN MOD(c.id * 31 + s.n * 17 + d.day_no * 13, 100) <
     CASE WHEN c.train_number IN ('12123','12125') THEN 97 ELSE 70 END
     THEN 'OCCUPIED' ELSE 'AVAILABLE' END
```

Room availability uses the same idea: one fully booked night per hotel
(`day_no = MOD(hotel_id, 14)`) and roughly 65% occupancy elsewhere. Bus seats use a derived
`GREATEST(0, total_seats - MOD(...))` so a trip never sells more seats than it has.

Dates and number series are derived tables of literal `CURRENT_DATE + INTERVAL 'n' DAY`
selects and `UNION ALL` counters. `DATE_ADD` was avoided because H2 does not support it, and
the literal-interval form works in both H2 (MySQL mode) and MySQL. The 14-day window is
anchored to the date the rows were first loaded; later restarts skip the load and do not slide
the window.

The six `settings` rows are: `seat_alert_threshold` (20), `hotel_unlock_hour` (22),
`hotel_unlock_wait_hours` (6), `station_transfer_minutes` (40), `rebooking_buffer_minutes` (30)
and `seat_hold_minutes` (10).

## 4. Demo accounts

`DemoAdminSeeder` runs only on the `demo` profile. It does nothing when `DEMO_PASSWORD` is
missing or does not meet the policy, and it never updates an existing account. Passwords are
stored only as BCrypt hashes and the log reports counts, never values.

| Email | Name | Role |
| --- | --- | --- |
| `admin@trainconcierge.demo` | Operations Admin | `ADMIN` |
| `asha.kulkarni@trainconcierge.demo` | Asha Kulkarni | `PASSENGER` |
| `rohan.deshmukh@trainconcierge.demo` | Rohan Deshmukh | `PASSENGER` |
| `meera.iyer@trainconcierge.demo` | Meera Iyer | `PASSENGER` |
| `karan.singh@trainconcierge.demo` | Karan Singh | `PASSENGER` |
| `fatima.sheikh@trainconcierge.demo` | Fatima Sheikh | `PASSENGER` |

All six use the same value of `DEMO_PASSWORD`; no password is committed, written to the
repository or printed in logs. The admin email changed in this phase from
`admin@trainconcierge.local` to `admin@trainconcierge.demo` so every demo identity shares the
`@trainconcierge.demo` domain.

## 5. Catalog API

All three endpoints require a bearer token. Authentication is enforced by the existing
`anyRequest().authenticated()` rule; no new public route was added.

| Method | Path | Response |
| --- | --- | --- |
| `GET` | `/api/stations?q=` | `200` array of `{code, name, city, state, latitude, longitude}` |
| `GET` | `/api/stations/{code}` | `200` single station, `404` unknown code |
| `GET` | `/api/trains/{number}` | `200` train with classes and ordered schedule, `404` unknown number |

Search behaviour:

- `q` is optional; blank or whitespace-only input returns `[]` instead of the whole catalog.
- Matching is case-insensitive over code, name and city via `LIKE '%q%'`.
- Exact code matches rank first, then exact name matches, then the rest, ordered by name.
- Results are capped at 10.
- Codes and train numbers are trimmed and uppercased before lookup, so `pune` and `PUNE`
  resolve to the same station.

Train detail returns:

- `number`, `name`, `type`, `sourceCode`, `sourceName`, `destinationCode`, `destinationName`,
  `runsOn`.
- `classes[]` ordered by ascending base fare: `classCode`, `baseFare`, `totalSeats`.
- `schedule[]` ordered by stop order: `stationCode`, `stationName`, `stopOrder`,
  `arrivalTime`, `departureTime`, `dayOffset`, `distanceKm`, with times formatted as `HH:mm`
  and `null` at the origin arrival and destination departure.

Failures use the shared `ApiError` shape (`timestamp`, `status`, `code`, `message`,
`fieldErrors[]`). Unknown resources return `404 NOT_FOUND`; missing or invalid tokens return
`401`. Responses never contain password hashes or stack traces.

## 6. Loading and idempotency

`DemoCatalogSeeder` runs on the `demo` profile and checks `SELECT COUNT(*) FROM stations`:

- If `stations` is missing or empty, it executes `V3__catalog.sql` (a no-op where Flyway or
  Hibernate already created the mapped tables), then `V100__demo_catalog.sql`, then
  `V101__demo_inventory.sql`.
- If `stations` has rows (MySQL with Flyway, or a later start), it does nothing.
- If `app.demo.catalog.enabled=false`, it does nothing.

Every demo statement is `INSERT IGNORE` and targets a natural unique key, so even a manual
re-run of the scripts does not create duplicates. `DemoCatalogSeeder` and `DemoAdminSeeder` are
independent: catalog rows can load without demo accounts and vice versa.

The H2 loader exists because H2 is test-scoped and the repository's Flyway migrations are
MySQL-flavoured. It feeds the same SQL files through Spring's `ScriptUtils`, so MySQL and H2
load byte-identical data. On MySQL, Flyway owns `V1`–`V3` and the runner only adds demo rows.
Demo files are not under `db/migration`, so they are never recorded in Flyway history.

**Local persistence.** The first demo command used `jdbc:h2:mem:` with
`ddl-auto=create-drop`, so every restart discarded registrations and accounts. The `local-h2`
profile now uses a file-based database at `backend/data/trainconcierge.mv.db` with
`ddl-auto=update` and Flyway disabled. Registrations and demo accounts survive restarts, and
the file is ignored by Git. MySQL remains the real database; this profile exists only for
local demos without MySQL.

Persistence was verified end to end: a temporary passenger was registered, the backend was
stopped and restarted, and the same credentials still signed in. The demo admin also signed in
after the restart, and the seeder logged `0 created, 6 already existed` instead of recreating
rows. The temporary account was removed afterwards.

## 7. Tests

`mvn clean verify` → **38 tests, 0 failures, 0 errors, BUILD SUCCESS**. The Phase 05 additions:

**`CatalogControllerTest`** (4 tests, H2 `jdbc:h2:mem:catalog-api`, profiles `test,demo`)

- Catalog endpoints return `401` without a token.
- Station search matches code, name and city ignoring case; `pune` returns PUNE and Khadki;
  blank and `zzz` return empty arrays.
- `/api/stations/pune` resolves case-insensitively and an unknown code returns `404`.
- `/api/trains/11007` returns 4 classes and 5 ordered stops, departs 16:30, arrives 19:45; an
  unknown number returns `404`.

**`DemoCatalogSeedTest`** (5 tests, H2 `jdbc:h2:mem:catalog-seed`, profiles `test,demo`)

- Every catalog table is populated with the expected row counts.
- Pune↔CSMT has at least five trains each way, at least two trains are ≥90% occupied today,
  and at least three fee types and cutoffs are present.
- Re-running `V100` and `V101` creates no duplicates.
- Duplicate station codes are rejected.
- Invoking the seeder again is a no-op.

**`CatalogProfileGatingTest`** (1 test, H2 `jdbc:h2:mem:catalog-nodemo`, profile `test`)

- Without the `demo` profile there are no stations, trains or demo users.

Each test class uses its own in-memory database URL so `create-drop` contexts cannot interfere.
The pre-existing `DemoAdminSeederTest` was updated for six accounts and the new admin email; it
asserts every stored hash is BCrypt and matches the configured demo password.

## 8. Live verification

Backend started on port 8080 with the `local-h2,demo` profiles, file-based H2 in MySQL mode,
Flyway disabled and a local-only `DEMO_PASSWORD`. Startup log:

```
Demo catalog data loaded from the db/demo scripts.
Demo accounts ready: 6 created, 0 already existed.
```

| Check | Result |
| --- | --- |
| `GET /api/stations?q=pune` without a token | `401` |
| Admin sign-in with `admin@trainconcierge.demo` | `200`, role `ADMIN`, `Bearer`, 3,600 s |
| `GET /api/stations?q=pune` with a token | 2 results: PUNE (Pune Junction), KK (Khadki) |
| `GET /api/stations/CSMT` | Mumbai CSMT, Mumbai, Maharashtra |
| `GET /api/trains/11007` | Deccan Express, `EXPRESS`, PUNE → CSMT, 4 classes, 5 stops, 16:30 → 19:45 |
| `GET /api/trains/99999` and `/api/stations/NOPE` | `404` |
| Register a temporary passenger | `201` with role `PASSENGER` |
| Sign in before restart | `200` with a token |
| Restart the backend on the same database file | `Demo accounts ready: 0 created, 6 already existed` |
| Sign in after restart with the same credentials | `200`, role `PASSENGER` |
| Admin sign-in after restart | `200`, role `ADMIN` |
| Wrong password after restart | `401` |

The access token was held in a shell variable and never printed or logged. The temporary
passenger and its audit row were deleted after the check; the database contains only the six
demo accounts.

## 9. Limitations and follow-ups

- **MySQL/Flyway not executed live.** The local MySQL root login was rejected without a
  password, so `V3__catalog.sql` and the demo scripts were only exercised on H2 in MySQL mode.
  Run `mvn spring-boot:run` against a throwaway MySQL schema before relying on Flyway in a
  shared environment.
- **Local H2 schema is Hibernate-managed.** Under `local-h2`, Flyway is disabled and
  Hibernate updates the schema, so constraints and indexes can differ from the MySQL `V3`
  migration. Use MySQL for schema-accurate verification.
- **Fixed inventory window.** Seat and room rows cover 14 days from first load; they do not
  slide forward on later restarts. A later phase that needs future dates must either regenerate
  inventory or add a window-refresh job.
- **No booking integration yet.** `seat_inventory.status` and `held_until`/`version` exist for
  the booking phase but nothing changes them yet.
- **Frontend unchanged.** The catalog endpoints are not consumed by the UI in this phase;
  Phase 04 behaviour (83 frontend tests) is unaffected.
- **No external dataset.** If the project later adopts a public dataset such as DataMeet, its
  licence and attribution requirements must be reviewed before import.

## 10. Files

Created:

- `backend/src/main/resources/db/migration/V3__catalog.sql`
- `backend/src/main/resources/db/demo/V100__demo_catalog.sql`
- `backend/src/main/resources/db/demo/V101__demo_inventory.sql`
- `backend/src/main/java/com/trainconcierge/catalog/` — `Station`, `Train`, `TrainType`,
  `TrainSchedule`, `TrainClass`, repositories, DTOs, `CatalogService`, `CatalogController`,
  `DemoCatalogSeeder`
- `backend/src/test/java/com/trainconcierge/catalog/CatalogControllerTest.java`
- `backend/src/test/java/com/trainconcierge/catalog/DemoCatalogSeedTest.java`
- `backend/src/test/java/com/trainconcierge/catalog/CatalogProfileGatingTest.java`
- `backend/src/main/resources/application-local-h2.yml` — persistent file-based H2 profile for
  local demos

Modified:

- `backend/src/main/java/com/trainconcierge/user/DemoAdminSeeder.java` — six accounts and the
  `@trainconcierge.demo` domain.
- `backend/src/main/java/com/trainconcierge/user/UserService.java` — `ensurePassenger`.
- `backend/src/test/java/com/trainconcierge/user/DemoAdminSeederTest.java` — six-account
  assertions.
- `backend/src/main/resources/application-demo.yml` — demo data is loaded by
  `DemoCatalogSeeder`, not by Flyway versioned migrations.
- `backend/.gitignore` — ignores the local `data/` database.
- `.env.example` — demo catalog toggle and local database URL.
- `README.md` — Phase 05 state, schema versions, demo data, local persistence, catalog API and
  test counts.

Not committed or pushed.
