# TrainConcierge Architecture

## Component overview

```
┌─────────────────────────────────────────────────────────────────────┐
│  Browser                                                             │
│  React 19 + React Router 7 + TanStack Query 5 + Tailwind CSS 4     │
│  Vite 8 build, route-level code splitting                           │
└───────────────────┬─────────────────────────────────────────────────┘
                    │  HTTPS (REST JSON, Server-Sent Events)
┌───────────────────▼─────────────────────────────────────────────────┐
│  Spring Boot 3.5 (Java 17)                                          │
│  ┌───────────┐  ┌──────────┐  ┌───────────┐  ┌────────────────┐   │
│  │  auth/    │  │ booking/ │  │disruption/│  │  hotel/        │   │
│  │  JwtAuth  │  │ Journey  │  │  Pipeline │  │  HotelService  │   │
│  │  Filter   │  │ Service  │  │  ImpactAn.│  │  ImpactAnalyz. │   │
│  └───────────┘  └──────────┘  └───────────┘  └────────────────┘   │
│  ┌───────────┐  ┌──────────┐  ┌───────────┐  ┌────────────────┐   │
│  │ payment/  │  │recovery/ │  │notification│  │  admin/        │   │
│  │ Service   │  │ Service  │  │  Service  │  │  AdminService  │   │
│  └───────────┘  └──────────┘  └───────────┘  └────────────────┘   │
└───────────────────┬─────────────────────────────────────────────────┘
                    │  JPA / Flyway
┌───────────────────▼─────────────────────────────────────────────────┐
│  H2 (demo/test)  ─  MySQL 8 (production)                           │
│  Migrations V1–V10 (Flyway)                                         │
└─────────────────────────────────────────────────────────────────────┘
```

## Event pipeline

```
Admin creates disruption
  → DisruptionCreatedEvent (Spring ApplicationEvent, after-commit)
  → DisruptionPipeline.onCreated()
      → ImpactAnalysisService.analyze()      [writes journey_impacts]
      → RecommendationEngine.generate()      [writes recommendations + FitsHotelRule]
      → HotelImpactAnalyzer.analyze()        [writes hotel_impacts, sets AT_RISK]
      → DisruptionNotifier / NotificationService
           → SSE push (EVENT_DISRUPTION per user)
           → In-app notification rows
           → Email rows → MailService async delivery
```

## Data model (key tables)

| Table | Phase |
|---|---|
| `users`, `revoked_tokens`, `audit_log` | V2 |
| `stations`, `trains`, `train_schedule`, `train_classes`, `coaches` | V3 |
| `hotels`, `hotel_policies`, `hotel_rooms`, `room_availability`, `settings` | V3 |
| `seat_inventory` | V3/V4 |
| `bookings`, `booking_passengers`, `journeys` | V5 |
| `disruptions`, `journey_impacts`, `recommendations` | V6 |
| `notifications`, `user_preferences` | V7 |
| `payments`, `payment_events` | V7 |
| `rebookings`, `bus_seats`, `bus_holds` | V8 |
| `hotel_bookings`, `hotel_extension_requests`, `hotel_impacts` | V9 |
| Performance indexes | V10 |

## RBAC matrix

| Resource | ANONYMOUS | PASSENGER | ADMIN |
|---|---|---|---|
| Auth (register, login) | ✔ | ✔ | ✔ |
| Own journeys, bookings | ✗ | ✔ | ✔ |
| Own hotel bookings | ✗ | ✔ | ✔ |
| Own notifications | ✗ | ✔ | ✔ |
| Own profile & settings | ✗ | ✔ | ✔ |
| Disruption read (own) | ✗ | ✔ | ✔ |
| `/api/admin/**` | ✗ | ✗ | ✔ |
| Demo reset | ✗ | ✗ | ✔ (demo only) |
