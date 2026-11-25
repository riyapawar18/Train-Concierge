# API Summary

All endpoints are under `/api`. Authentication is via `Authorization: Bearer <token>`.

## Public endpoints (no token required)

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/auth/register` | Register as PASSENGER |
| `POST` | `/auth/login` | Sign in, returns JWT |
| `POST` | `/auth/logout` | Revoke token |
| `GET` | `/auth/me` | Current user profile |

## Passenger endpoints (PASSENGER or ADMIN)

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/journeys` | Own journeys (paginated) |
| `GET` | `/journeys/:id` | Journey detail |
| `POST` | `/journeys/:id/cancel` | Cancel own journey |
| `GET` | `/journeys/:id/impact` | Disruption impact |
| `GET` | `/journeys/:id/recommendations` | Ranked alternatives |
| `GET` | `/journeys/:id/hotel-impact` | Hotel impact verdict |
| `GET/POST` | `/bookings` | Search / create booking |
| `GET` | `/notifications/feed` | In-app notification feed |
| `GET/PUT` | `/settings/preferences` | Notification preferences |
| `GET/PUT` | `/profile` | Own profile |
| `POST` | `/profile/password` | Change password (revokes JWT) |
| `GET` | `/hotels` | Hotels near a station |
| `GET` | `/hotels/:id` | Hotel detail |
| `GET` | `/hotels/:id/policy` | Stay flexibility policy |
| `GET` | `/hotels/:id/rooms` | Room map + date strip |
| `POST` | `/room-holds` | Hold a room |
| `DELETE` | `/room-holds/:id` | Release hold |
| `GET/POST` | `/hotel-bookings` | Own hotel bookings / book |
| `POST` | `/hotel-bookings/manual` | Add existing stay |
| `GET` | `/hotel-bookings/:id` | Stay detail |
| `POST` | `/hotel-bookings/:id/extension-requests` | Extension request |
| `POST` | `/hotel-bookings/:id/shift` | Shift stay |
| `POST` | `/hotel-bookings/:id/cancel` | Cancel stay |
| `GET` | `/stream` | SSE stream (all events) |
| `GET` | `/catalog/trains` | Train list |
| `GET` | `/catalog/search` | Train search |

## Admin-only endpoints (ADMIN)

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/admin/stats` | Dashboard stat cards |
| `GET` | `/admin/stats/delay-trend` | 7-day disruption chart |
| `GET` | `/admin/stats/activity` | Recent audit feed |
| `GET` | `/admin/passengers` | Paginated passenger list |
| `GET` | `/admin/passengers/:id` | Passenger detail |
| `PATCH` | `/admin/passengers/:id/enabled` | Enable / disable account |
| `GET` | `/admin/journeys` | All journeys with filters |
| `POST` | `/admin/journeys/:id/cancel` | Admin cancel |
| `PATCH` | `/admin/journeys/:id/flag` | Flag for attention |
| `GET/POST/PATCH` | `/admin/disruptions` | Disruption CRUD |
| `GET` | `/admin/recommendations` | Recommendations by disruption |
| `POST` | `/admin/impacts/:id/regenerate` | Re-run engine |
| `GET/PATCH` | `/admin/extension-requests` | Hotel extension inbox |
| `GET` | `/admin/notifications` | Notification log |
| `POST` | `/admin/notifications/announce` | Send announcement |
| `POST` | `/admin/notifications/:id/retry` | Retry failed email |
| `GET` | `/admin/users` | All users |
| `PATCH` | `/admin/users/:id/role` | Change role |
| `GET` | `/admin/reports/:name` | Report data |
| `GET` | `/admin/reports/:name/export.csv` | CSV download |
| `GET/PUT` | `/admin/settings` | System settings |
| `POST` | `/api/admin/demo/reset` | Demo reset (**demo profile only**) |
