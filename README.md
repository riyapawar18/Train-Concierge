# TrainConcierge

A full-stack passenger-disruption management platform for Indian Railways.
Passengers search for trains, book journeys, receive live disruption alerts,
get ranked recovery recommendations, and manage hotel stays.
Admins manage disruptions, passengers, notifications and system settings.

## Architecture

```
Browser (React + Vite)
  │
  │  REST / SSE
  ▼
Spring Boot 3 (Java 17)
  │
  ├── H2 (demo / test)  ─── MySQL (production)
  └── Flyway migrations V1–V12
```

See `docs/architecture.md` for the full component diagram.

## Quick start

### Prerequisites
- Java 17, Maven 3.9+
- Node.js 20+, npm 10+
- (Production) MySQL 8 or compatible

### Backend

```bash
cd cf59d207/backend

# Demo mode (H2 in-memory, seeds demo data)
mvn spring-boot:run -Dspring-boot.run.profiles=demo

# Run tests
mvn clean verify
```

### Frontend

```bash
cd cf59d207/frontend
npm install
npm run dev      # dev server on :5173
npm run build    # production build
npm run test     # unit tests
```

## Environment variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `JWT_SECRET` | yes (prod) | — | HS256 key, min 32 bytes |
| `JWT_EXPIRY_MINUTES` | no | `60` | Token lifetime |
| `DEMO_PASSWORD` | yes (demo) | — | Shared password for all demo accounts |
| `MAIL_HOST` | no | `smtp.gmail.com` | SMTP relay |
| `MAIL_PORT` | no | `587` | SMTP port (STARTTLS) |
| `MAIL_USERNAME` | for real delivery | — | Sign-in address for the SMTP account (`MAIL_USER` is an alias) |
| `MAIL_PASSWORD` | for real delivery | — | Gmail **App Password** (16 characters, no spaces) — never the account password |
| `MAIL_FROM` | no | blank | Blank sends from `MAIL_USERNAME`; Gmail rejects a `From` it does not own |
| `MAIL_ENABLED` | no | `true` | Set `false` to disable email delivery |
| `RESET_TOKEN_TTL_MINUTES` | no | `30` | How long a forgot-password link stays usable |
| `APP_FRONTEND_ORIGIN` | no | `http://localhost:5173` | CORS allowed origin |
| `PAYMENT_MODE` | no | `SIMULATED` | `SIMULATED`, `RAZORPAY_TEST` or `UPI_INTENT_DEMO` |
| `DB_URL` | for MySQL | `jdbc:mysql://localhost:3306/trainconcierge` | Only read by the `dev` profile |
| `DB_USER` | for MySQL | `trainconcierge` | The account must already exist in MySQL |
| `DB_PASSWORD` | for MySQL | — | No default is shipped; set it in `backend/.env` |

## Database and migrations

Every migration in `backend/src/main/resources/db/migration` is written in MySQL dialect and
applies in this order: `V1` baseline → `V2` users → `V3` catalog → `V4` seat holds → `V5`
bookings → `V6` disruptions → `V7` payments → `V7.1` notifications → `V8` recovery → `V9`
hotel bookings → `V10` indexes → `V11` password resets → `V12` the `journeys.flagged` column. Flyway supports dotted versions, and
notifications sits at `7.1` because `V7` itself is taken by payments, which `V8` foreign-keys
to; the notifications tables only need to land before the `V10` index that reads them.

The `local-h2` and `test` profiles leave Flyway switched off and let Hibernate build the
schema, which is how the app runs day to day. Point it at MySQL with the `dev` profile and
the three `DB_*` variables above — `spring.flyway.enabled` is already `true` there.

Honest scope of the verification: the whole chain has been executed end to end against a
throwaway H2 database in MySQL compatibility mode (13 migrations applied, `validate` clean),
which proves the version numbering, the dependency order and that every statement parses. It
has not been run against a real MySQL server, because no MySQL login for this project exists
locally.

## Email notifications

Booking, disruption and seat-alert emails are delivered asynchronously through the
same notification rows that feed the in-app inbox, so the frontend never has to be
open. Delivery runs on the `mailExecutor` pool; a failed send keeps its `FAILED`
status and the scheduled retry job re-attempts it up to three times.

The recipient is always the signed-in user's registered address — it is read from the
account, never typed at send time. Booking confirmations and disruption alerts follow
the account's notification preferences and are on by default; **seat alerts are
explicit opt-in**, switchable on the train search page and in Settings.

*Forgot password* follows the same rule: the link is mailed to the address on the
account, carries a single-use token that is stored only as a SHA-256 hash, and opens
`/auth/reset-password` on `APP_FRONTEND_ORIGIN`. A reset is reported as sent only when
the SMTP server accepts the message.

### Gmail setup

1. Turn on 2-Step Verification on the Gmail account, then open
   **Google account → Security → App passwords** and create one for *Mail*.
2. Copy the 16-character password and remove the spaces.
3. Put the credentials in `backend/.env` (copy `.env.example`) or export them — the
   repository never stores real secrets and `.env` files are git-ignored:

```bash
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=rails@example.com     # the Gmail address
MAIL_PASSWORD=abcdefghijklmnop     # the App Password, not the account password
MAIL_STARTTLS=true
MAIL_ENABLED=true
```

   The backend imports `backend/.env` (and the repository-root `.env`) at startup, so no
   `source` step or IDE run configuration is needed. Variables you export in the shell
   still take precedence over the file, which is what the test commands below use.

4. Restart the backend. The startup line
   `Email delivery: host=… configured=true` confirms the account is usable, and each
   accepted message logs `Mail server smtp.gmail.com:587 accepted notification 42 for …`.
   The password is never logged.

Missing or blank credentials are not fatal: the app boots, emails are recorded as
`FAILED` with "Email not configured", and the in-app notification still arrives. An
authentication rejection and a transport failure are reported as separate statuses in
`notifications.delivery_error`. The `local-h2` profile turns email off unless you set
`MAIL_ENABLED=true`, so local runs do not attempt SMTP by default.

### Verifying a real send

```bash
cd cf59d207/backend
# Proof over a real SMTP socket against an in-process server (no credentials needed):
mvn -B test -Dtest=SmtpDeliveryTest
# Proof against Gmail — runs only when MAIL_USERNAME is exported, otherwise skipped:
mvn -B test -Dtest=GmailLiveSendTest
```

`GmailLiveSendTest` sends through the production `MailService`, prints the mailbox the
message went to and fails if the server did not accept it. Send a booking or hotel
confirmation from the app to see the same path end to end.

## Demo accounts

| Role | Email |
|---|---|
| Admin | `admin@trainconcierge.demo` |
| Passenger – Asha | `asha.kulkarni@trainconcierge.demo` |
| Passenger – Fatima | `fatima.sheikh@trainconcierge.demo` |
| Passenger – Karan | `karan.mehta@trainconcierge.demo` |

All demo accounts share the password set by `DEMO_PASSWORD`.

## Demo reset

```bash
curl -X POST http://localhost:8080/api/admin/demo/reset \
     -H "Authorization: Bearer <admin-jwt>"
```

This endpoint exists **only** when the `demo` Spring profile is active.
It clears disruptions, impacts, notifications, rebookings and hotel changes,
then reseeds journeys relative to today.

## Run demo script

See `docs/demo-script.md` for the 5-minute click path.
