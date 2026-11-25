# Phase 09 — Real-Time Updates, Notifications and Email

- **Date:** 2026-10-29
- **Branch:** n/a (the workspace is not a Git repository)
- **Status:** Code complete and fully tested. `mvn clean verify` passes with 107 backend
  tests, `npm run build` passes and `npm run test` passes with 153 frontend tests. The
  browser live pass (realtime popup, bell, delivered email) is handed over to run locally —
  see §6 for the exact commands; the automated suites cover the same behaviours against the
  real Spring context and a mocked SMTP transport. Nothing was committed or pushed.

## 1. Channel decision: Server-Sent Events

The brief asked for a justified choice. The app needs server → client pushes for disruption
alerts, seat-availability updates and notification refreshes. **SSE won over WebSockets** for
three reasons:

1. **Strictly one-directional.** Only the server ever sends; clients acknowledge by refetching
   REST data. Half of WebSocket's complexity (per-connection read loops, fragmentation,
   ping/pong liveness) simply does not exist.
2. **HTTP-native.** It reuses the existing bearer-token filter, CORS policy, load behaviour
   and proxies. Reconnection with backoff, `Last-Event-ID`-style recovery by refetch, and the
   25-second heartbeat comment are all standard. The React client uses
   `@microsoft/fetch-event-source` because the stock `EventSource` cannot send the
   `Authorization` header.
3. **Fits the load model.** This is a notifications channel, not a chat fabric; one text
   frame per event at low volume is exactly what SSE is for.

**Implementation.** `SseHub` keeps per-user emitter lists (`userId → CopyOnWriteArrayList`),
sends heartbeats on a scheduled task, and prunes emitters whose send throws or completes. The
frontend opens a single stream per passenger session (`RealtimeProvider`), dispatches `event`
types to TanStack Query cache updates (unread-count `setQueryData`, list invalidation,
disruption/journey/seat/hotel key invalidation), and closes it on sign-out or provider
unmount via the session-cleanup registry. Reconnects run capped exponential backoff
(1 s → 30 s, 20 % jitter) and fire a refetch of the critical queries so a silently dropped
connection self-heals without missed events.

## 2. What was built

**Database**

- `V7__notifications.sql` — `notifications`, `seat_alert_log` and `user_preferences`. The
  brief names the file `V6__notifications.sql`, but `V6` already holds the Phase 08
  disruptions, so the migration is numbered `V7`.
- `notifications` stores the user, channel (`IN_APP`, `EMAIL`), type, title, body, link path,
  entity reference, read flag and attempt/error columns for email delivery.
- `seat_alert_log` gives the seat-alert job its one-alert-per-search-per-hour throttle.
- `user_preferences` holds the four per-user switches (email, disruption alerts, seat alerts,
  announcements), defaulting to on.

**Backend**

- `SseHub`, `StreamController` (`GET /api/stream`) and `RealtimeNotifier` — the per-user hub,
  heartbeat/cleanup and the fan-out seam other services call.
- `NotificationService` — creates the `IN_APP` + `EMAIL` rows honouring `user_preferences`,
  pushes the SSE `notification` and `disruption` events only to the owning user, and exposes
  the passenger queries and mark-read/read-all mutations.
- `MailService` — renders the Thymeleaf HTML + plain-text templates, sends through
  `JavaMailSender` asynchronously, records `SENT`/`FAILED` with a friendly error, and retries
  `FAILED` rows on a scheduled job (3 attempts, configurable delays). With no SMTP configured
  the row fails gracefully with *"Email not configured"* and nothing is thrown into the user
  flow. Templates render through `SpringTemplateEngine` — the plain Thymeleaf engine needs
  OGNL, which is not on the classpath and would have failed at first render.
- `SeatAlertNotifier` — hourly job: for seat searches that are running low against the
  configured threshold it notifies the searching passenger (max 3 searches per user, once per
  hour per search).
- Endpoints: `GET /api/notifications` (paged, filter), `…/unread-count`,
  `PATCH …/notifications/{id}/read`, `POST …/notifications/read-all`,
  `GET/PUT /api/settings/preferences`.
- `BookingService` now raises the booking-confirmed notification when a booking is
  confirmed.

**Frontend**

- `src/lib/sse.ts` — the resilient `fetch-event-source` wrapper (backoff, jitter, 401 →
  session expiry, abort propagation).
- `RealtimeProvider` — one stream per passenger session; event → cache mapping; queued
  disruption prompts with sessionStorage acknowledgement (no repeat popups after dismiss or
  reload); stream closed on sign-out.
- `DisruptionModalHost` — the global, accessible disruption dialog (`role="alertdialog"`,
  `aria-modal`): severity, train, new arrival, the top recommendation with **Best option**,
  **Dismiss**, **View all options** and **Book this** (links into the recovery page, where the
  chosen option is highlighted).
- `NotificationBell` — unread badge with `99+` cap, dropdown with the latest five, per-item
  mark-as-read, **Mark all as read**, empty state; plain link on admin pages.
- `NotificationsPage` at `/app/notifications` — filters (All / Unread / Disruptions / Seats /
  Bookings), infinite scroll (**Load older notifications**), per-item and mark-all-read.
- `SettingsPage` — the four notification preference switches with Save / Undo and a success
  toast.
- No technical wording anywhere in the UI: the user sees "live updates", "notifications" and
  email, never SSE, SMTP or polling.

## 3. Email setup

SMTP is configured entirely from environment variables (no secrets in the repo):

| Variable | Default | Purpose |
| --- | --- | --- |
| `MAIL_ENABLED` | `true` | Master switch for outbound email |
| `MAIL_HOST` / `MAIL_PORT` | `localhost` / `1025` | SMTP server |
| `MAIL_USER` / `MAIL_PASSWORD` | empty | Credentials (STARTTLS via `MAIL_STARTTLS=true`) |
| `MAIL_FROM` | `no-reply@trainconcierge.local` | From address |
| `MAIL_RETRY_DELAY_MS` / `MAIL_RETRY_INITIAL_DELAY_MS` | `60000` | Retry job cadence |

For local development point `MAIL_HOST`/`MAIL_PORT` at any sink (MailHog, GreenMail, or the
bundled `docs/reports/assets/smtp-sink.js`, a zero-dependency Node capture server). Without a
server listening, email rows land as `FAILED` with *"Email not configured"* and the app stays
fully usable — the in-app notification is unaffected.

## 4. Verification

**Backend — `mvn clean verify`: 107 tests, 0 failures, 0 errors (exit 0).** Phase 09 added
22 tests:

- `SseHubTest` (3) — per-user connections, routing to the right user only, removal of dead
  emitters on send-after-complete, heartbeat keep-alive.
- `MailServiceTest` (7) — SENT records `SENT` and sends; unconfigured SMTP fails gracefully
  with zero attempts and no sender interaction; `MailSendException` → `FAILED` with the safe
  message; SENT/IN_APP rows are skipped; missing recipient message; `isConfigured` truth
  table.
- `SeatAlertNotifierTest` (8) — alerts the lowest class under threshold and writes the log,
  throttles within one hour, refreshes a stale log, caps at three searches per user, ignores
  plenty-of-seats results, no-ops when seat alerts are disabled or delivery fails.
- `NotificationApiTest` (4, ordered end-to-end against H2) — a delay on 11007 creates exactly
  one `IN_APP` + one `EMAIL` row for the impacted passenger with the recovery link, filters
  (UNREAD / DISRUPTIONS / SEATS / BOOKINGS) match, other passengers get nothing; mark-read and
  read-all; an admin update creates `DISRUPTION_UPDATED`; preference switches suppress
  channels and restoring them resumes delivery; resolution creates `DISRUPTION_RESOLVED`
  ("running to schedule") linking to the journey; bogus filter and missing preference fields
  → 400 `VALIDATION_ERROR`; unauthenticated access → 401.
- `BookingApiTest` extended — a confirmed booking now produces a `BOOKING_CONFIRMED`
  notification with the PNR in the title and `/app/journeys` link.

**Frontend — `npm run build`: passes (`tsc -b` + Vite). `npm run test`: 153 tests across 22
files, all pass.** Phase 09 added 24 tests:

- `src/lib/__tests__/sse.test.ts` (5) — bearer header and URL, parsed and raw event delivery,
  401 → `onUnauthorized` with no retry, reconnect with capped backoff + `onReconnect` only
  after a real connection, abort stops the retry loop.
- `RealtimeProvider.test.tsx` (4) — the accessible modal opens with the top recommendation
  and correct recovery/book links; prompts queue one at a time and dismissed ones stay
  dismissed; live `notification`/`disruption` events update the unread cache and enqueue the
  modal; the stream closes on unmount.
- `NotificationBell.test.tsx` (5) — badge label, lazy load of the latest five on open,
  per-item mark-as-read, mark-all-as-read, empty state, admin plain-link mode.
- `NotificationsPage.test.tsx` (7) — listing with unread highlights, filter refetches,
  mark-all and per-item read, navigation without re-marking read items, load-older paging,
  filter-aware empty states.
- `SettingsPage.test.tsx` (3) — current values render, dirty save calls the API with the
  merged payload and toasts, undo reverts without saving.

## 5. Received email

Screenshot placeholder — captured during the local live pass (§6): the rendered disruption
email as delivered to the sink.

![Received disruption email](assets/phase-09-received-email.png)

*(To be attached when the live pass below is run on the local machine.)*

## 6. Live pass — handed over

The sandbox blocked agent-started servers, so the browser pass runs locally with the exact
commands the project already documents:

```bash
# terminal 1 — capture SMTP (or point MAIL_* at MailHog/GreenMail instead)
node docs/reports/assets/smtp-sink.js docs/reports/assets/phase-09-received-email.eml

# terminal 2 — backend (same local-h2 demo database as previous phases)
cd backend
SPRING_PROFILES_ACTIVE=local-h2,demo \
DEMO_PASSWORD='<password-meeting-the-policy>' \
JWT_SECRET='<48-byte base64 secret>' \
MAIL_HOST=localhost MAIL_PORT=1025 \
mvn spring-boot:run -Dspring-boot.run.useTestClasspath=true

# terminal 3 — frontend
cd frontend && npm run dev
```

Then, signed in as **Asha Kulkarni** (`/app/dashboard`), have an admin log a delay on **11007
for the journey date** (Asha holds a confirmed PUNE → CSMT booking, seeded two days out):
the disruption dialog appears within ~2 seconds with the recommended alternative, the bell
count increments, `/app/notifications` lists it, and the sink file receives the HTML email
whose screenshot fills §5. Sign out and the stream closes; a second passenger receives
nothing. `docs/reports/assets/smtp-sink.js` is a 60-line Node server that accepts any SMTP
dialog and appends the raw message to the given file.

## 7. Limitations

- Recovery of missed events is by refetch on reconnect (no `Last-Event-ID` replay); the
  notifications list and unread count are the source of truth after a drop.
- Email delivery is at-least-once with 3 attempts; the retry job is periodic, not immediate.
- The modal's **Book this** deep-links to the recovery page with the option highlighted; the
  actual rebooking action belongs to Phase 11.
- Seat alerts cover seat searches against the configured low-availability threshold; fare or
  route-based watchlists are out of scope.

## 8. Main files

Backend: `db/migration/V7__notifications.sql`, `notification/{SseHub,StreamController,
RealtimeNotifier,NotificationService,MailService,SeatAlertNotifier,Notification,
NotificationRepository,UserPreferences,UserPreferencesRepository,SeatAlertLog,
SeatAlertLogRepository}.java`, `notification/dto/*`, `BookingService` (notification hook).

Frontend: `src/lib/sse.ts`, `src/features/notifications/{types,constants,api,ack,format,
RealtimeProvider}.ts(x)`, `src/layouts/{DisruptionModalHost,NotificationBell,PassengerLayout}.tsx`,
`src/features/passenger/pages/{NotificationsPage,SettingsPage}.tsx`,
`src/components/ui/switch.tsx`, `src/lib/apiClient.ts` (`triggerUnauthorized`).
