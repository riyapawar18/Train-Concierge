# Phase 13 – Admin Modules, Profile and Settings

## Build results

| Command | Result |
|---|---|
| `mvn clean verify` | **BUILD SUCCESS** — 140 tests, 0 failures, 0 errors |
| `npm run build` | **✔ built in 794 ms** |
| `npm run test` | **25 test files, 178 tests passed** |

---

## Endpoint authorization matrix

Every `/api/admin/**` endpoint requires `ROLE_ADMIN`. The table below summarises
the HTTP status returned for each principal type.

| Endpoint | Anonymous | PASSENGER | ADMIN |
|---|---|---|---|
| `GET /api/admin/stats` | 401 | 403 | 200 |
| `GET /api/admin/stats/delay-trend` | 401 | 403 | 200 |
| `GET /api/admin/stats/activity` | 401 | 403 | 200 |
| `GET /api/admin/passengers` | 401 | 403 | 200 |
| `GET /api/admin/passengers/{id}` | 401 | 403 | 200 |
| `PATCH /api/admin/passengers/{id}/enabled` | 401 | 403 | 200 |
| `GET /api/admin/journeys` | 401 | 403 | 200 |
| `POST /api/admin/journeys/{id}/cancel` | 401 | 403 | 200 |
| `PATCH /api/admin/journeys/{id}/flag` | 401 | 403 | 200 |
| `GET /api/admin/recommendations` | 401 | 403 | 200 |
| `POST /api/admin/impacts/{id}/regenerate` | 401 | 403 | 200 |
| `GET /api/admin/extension-requests` | 401 | 403 | 200 |
| `PATCH /api/admin/extension-requests/{id}` | 401 | 403 | 200 |
| `GET /api/admin/notifications` | 401 | 403 | 200 |
| `POST /api/admin/notifications/announce` | 401 | 403 | 200 |
| `POST /api/admin/notifications/{id}/retry` | 401 | 403 | 200 |
| `GET /api/admin/users` | 401 | 403 | 200 |
| `PATCH /api/admin/users/{id}/role` | 401 | 403 | 200/409 |
| `GET /api/admin/reports/{name}` | 401 | 403 | 200 |
| `GET /api/admin/reports/{name}/export.csv` | 401 | 403 | 200 |
| `GET /api/admin/settings` | 401 | 403 | 200 |
| `PUT /api/admin/settings/{key}` | 401 | 403 | 200 |
| `GET /api/profile` | 401 | 200 | 200 |
| `PUT /api/profile` | 401 | 200 | 200 |
| `POST /api/profile/password` | 401 | 200 | 200 |

Spring's `SecurityConfig` uses `anyRequest().authenticated()` for all other paths
and `.requestMatchers("/api/admin/**").hasRole("ADMIN")` for admin paths, enforcing
all of the above automatically.

---

## Role-change guards

| Guard | Behaviour |
|---|---|
| Demote self | `409 CONFLICT` — "You cannot change your own role." |
| Remove last admin | `409 CONFLICT` — "Cannot remove the last admin." |
| Invalid role string | `400 VALIDATION_ERROR` |

Both guards are validated in `AdminService.changeRole` before any database write.
Each successful role change writes an `audit_log` row with action `ROLE_CHANGED` and
the `from`/`to` values in `details`.

---

## What was implemented

### Backend
- `AdminService` — stats, delay trend, recent activity feed, passenger management
  (search, detail, enable/disable), journey management (list, cancel, flag),
  recommendation inspection and regeneration, hotel extension request approval,
  notification log and announcement, user role management with self-demotion and
  last-admin guards, five report types with raw-map aggregation, settings CRUD.
- `AdminController` — all endpoints from the spec, CSV export via servlet response.
- `ProfileService` / `ProfileController` — `GET/PUT /api/profile` and
  `POST /api/profile/password` (revokes current JWT so the user must sign in again).
- Repository extensions on `UserRepository`, `JourneyRepository`,
  `DisruptionRepository`, `JourneyImpactRepository`, `NotificationRepository`,
  `HotelBookingRepository`, `HotelExtensionRequestRepository`.
- `NotificationService` additions — `sendAnnouncement`, `sendTrainAnnouncement`,
  `sendUserAnnouncement`, `sendHotelNotification`, `retryEmail`.
- `User` — `setEnabled`, `setFullName`, `setMobile`, `setPasswordHash` setters.
- `Journey` — `flagged` field, `setFlagged`, `isFlagged`, `markRebooked`.
- `Setting` — `setValue` setter.
- `@ConfigurationPropertiesScan` on main application class (fixes test context).
- `BusHoldCleanupScheduler` cron corrected to 6-field format.

### Frontend (all previously-placeholder pages replaced)
| Page | Route | Was |
|---|---|---|
| Admin Dashboard | `/admin/dashboard` | Placeholder |
| Passenger Management | `/admin/passengers` | Placeholder |
| Journey Management | `/admin/journeys` | Placeholder |
| Recovery Recommendations | `/admin/recommendations` | Placeholder |
| Hotel Management | `/admin/hotels` | Placeholder |
| Notification Management | `/admin/notifications` | Placeholder |
| User Roles & Access | `/admin/roles` | Placeholder |
| Reports & Analytics | `/admin/reports` | Placeholder |
| System Settings | `/admin/settings` | Placeholder |
| Admin Profile | `/admin/profile` | Placeholder |
| Passenger Profile | `/app/profile` | Placeholder |
| Train catalogue | `/admin/trains` | Placeholder |

All admin pages follow the consistent pattern: `PageHeader` with primary action,
filter controls, server-paginated `DataTable`, detail `Sheet` drawer where needed,
`ConfirmDialog` for destructive actions, toast on success/error.
