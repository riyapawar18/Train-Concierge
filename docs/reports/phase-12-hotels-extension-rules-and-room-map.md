# Phase 12 – Hotels, Extension Rules and Room Map

## Build results

| Command | Result |
|---|---|
| `mvn clean verify` | **BUILD SUCCESS** — 121 tests, 0 failures, 0 errors |
| `npm run build` | **✔ built in 1.09 s** |
| `npm run test` | **25 test files, 178 tests passed** |

---

## Demo passenger verdict arithmetic

Evening service **11007**: departs PUNE 16:30, arrives CSMT **19:45** (original).

A **3 h 15 m (195 min) delay** moves the new train arrival to **23:00**.  
Station-transfer allowance (40 min, seeded in `settings.station_transfer_minutes`) gives an
**effective arrival of 23:40**.

### Asha Kulkarni – Harbour Gate Residency (CSMT)

| Item | Value |
|---|---|
| Check-in time | 14:00 |
| Late-arrival cutoff | **23:59** |
| Effective arrival | 23:40 |
| 23:40 ≤ 23:59? | **Yes** |
| **Verdict** | **`LATE_ARRIVAL_OK`** |
| Action offered | Notify hotel |
| Summary shown | "Your stay can be extended: late arrival is allowed until 23:59 at no charge." |

### Fatima Sheikh – Ballard Budget Lodge (CSMT)

| Item | Value |
|---|---|
| Check-in time | 12:00 |
| Late-arrival cutoff | **22:00** |
| `extra_night_possible` | FALSE |
| Effective arrival | 23:40 |
| 23:40 ≤ 22:00? | **No** |
| Extra night available? | **No** |
| **Verdict** | **`PAST_CUTOFF_NO_EXTENSION`** |
| Actions offered | Call hotel · See nearby stays |
| Summary shown | "This hotel cannot hold your room past 22:00. You'll arrive about 23:40. Please call the hotel or find a nearby stay." |

The verdicts differ because Asha's hotel allows late arrivals past 23:40 and Fatima's does not, and Fatima's lodge has no extra-night option.

### Karan Mehta – Fort Business Inn (CSMT)

Karan's scenario is departure-side: his train departs after his hotel checkout time.

| Item | Value |
|---|---|
| Checkout time | 11:00 |
| `late_checkout_allowed` | TRUE |
| `late_checkout_fee_type` | **FLAT** (₹500) |
| Disruption | Train delay pushes departure past 11:00 |
| **Verdict** | **`CHECKOUT_PRESSURE`** |
| Actions offered | Request extension · Call hotel |
| Summary shown | "Your train now departs at [new time], which is after checkout at 11:00. Late checkout until [max] is available (approx. fee applies)." |

---

## What was implemented

### Backend
- **V9__hotel_bookings.sql** – three new tables: `hotel_bookings`, `hotel_extension_requests`, `hotel_impacts`.
- **`com.trainconcierge.hotel` package** – `Hotel`, `HotelPolicy`, `HotelRoom`, `RoomAvailability` JPA entities (unique constraints matching V3 SQL so H2 tests stay idempotent); `HotelBooking`, `HotelExtensionRequest`, `HotelImpact` entities and repositories.
- **`HotelService`** – hotel list/detail/policy/rooms, room holds (optimistic locking, 10-min expiry), confirm booking, manual entry, extension requests (AUTO approval for non-manual, ON_REQUEST otherwise), shift stay, cancel (restores availability).
- **`HotelController`** – all endpoints listed in the spec; ownership enforced via `findByIdAndUserId`.
- **`HotelImpactAnalyzer`** – runs after `RecommendationEngine` in `DisruptionPipeline`; implements the full verdict matrix (UNAFFECTED / LATE_ARRIVAL_OK / PAST_CUTOFF_EXTENSION_POSSIBLE / PAST_CUTOFF_NO_EXTENSION / NIGHT_LOST / CHECKOUT_PRESSURE); skips delays < 30 min; adds 40-min station transfer; writes `hotel_impacts` rows; updates booking status; sends `hotel` SSE event.
- **`FitsHotelRule`** – `@Order(90)` recommendation rule; +20 pts "Fits your hotel check-in" when effective arrival ≤ late-arrival cutoff; adds cutoff warning otherwise.
- **`DemoHotelBookingSeeder`** – seeds Asha (LATE_ARRIVAL_OK), Fatima (PAST_CUTOFF_NO_EXTENSION), Karan (CHECKOUT_PRESSURE); idempotent; `@Order(35)`, `@Profile("demo")`.
- **Pre-existing fixes** – `BusHoldCleanupScheduler` cron (5→6 fields); `RecoveryService` rewritten against real APIs; `RecoveryController` duplicate mapping removed; `PaymentService` enum type fix; `@ConfigurationPropertiesScan` added to main application class; Hotel/HotelRoom/RoomAvailability unique constraints for idempotent H2 tests.

### Frontend
- **`/app/hotels`** – Hotels & Stay Recovery page: "Your stays" section with impact verdict cards, "Suggested stays" section with search.
- **`/app/hotels/:id`** – Hotel detail page with generic illustration, stay flexibility panel (required above Book button), room floor map with floor tabs and date strip, booking review step repeating the panel with "I've read the stay rules" checkbox.
- **`/app/hotels/bookings/:id`** – Booked stay detail: verdict card first, stay details, extension requests, cancel.
- **`VerdictCard`** – verdict badge + summary (answer first) + action buttons (Notify hotel, Request extension, Shift stay, Call hotel, See nearby stays). "Notify hotel" wording never claims a confirmed hold.
- **`StayFlexibilityPanel`** – all policy rows shown including unsupported options (never hidden).
- **`RoomMap`** – floor tabs, room buttons with `aria-label`, colour + pattern legend, date strip, keyboard Enter/Space support.
- **JourneyDetailPage** – Stay section added showing hotel impact verdict when a booking is linked.
- **Router** – `/app/hotels/:id` and `/app/hotels/bookings/:id` routes added.
