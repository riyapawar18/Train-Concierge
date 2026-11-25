# Phase 03 — Backend Authentication and RBAC

- **Date:** 2026-10-27
- **Branch:** `master`
- **Status:** Complete. Registration, login, JWT bearer authentication, `/api/auth/me`,
  logout with revocation, PASSENGER/ADMIN authorization, login throttling, admin
  provisioning and audit logging are implemented. `mvn clean verify` passes with 28 tests and
  the executable jar is produced. Nothing was committed or pushed, and the frontend sign-in
  screen remains out of scope (Phase 04).

## 1. What was built

- **Schema** — `V2__users.sql` adds `users`, `revoked_tokens` and `audit_log`, with a unique
  index on `users(email)`, an index on `audit_log(created_at)`, a role check constraint and an
  index for pruning `revoked_tokens(expires_at)`.
- **User domain** — `User`, `Role` (`PASSENGER`, `ADMIN`), `UserRepository` and `UserService`.
  Registration always creates a passenger; role changes go through `UserService.changeRole`
  and are audited.
- **Authentication** — `AuthController`, `AuthService`, `JwtService`, `JwtAuthFilter`,
  `LoginAttemptService`, `RevokedToken` and request/response DTOs.
- **Security configuration** — stateless Spring Security, CSRF disabled, CORS limited to
  `APP_FRONTEND_ORIGIN`, the JWT filter before `UsernamePasswordAuthenticationFilter`,
  method security enabled, and JSON `AuthenticationEntryPoint` / `AccessDeniedHandler`.
- **Shared security primitives** — `PasswordPolicy`, `UserPrincipal`, `CurrentUser` and
  `ApiErrorWriter`.
- **Admin provisioning** — a demo-only seeder and a one-time `provision-admin` runner. No
  public endpoint can create an administrator, and no default password is shipped.
- **Audit logging** — `AuditLog`, `AuditLogRepository` and `AuditService`; registration, admin
  provisioning and role changes write rows.

The frontend was not changed in this phase. `/auth` is still a placeholder with no form, and
the shells remain reachable directly by URL.

## 2. Data model

### `users`

| Column | Type | Rules |
| --- | --- | --- |
| `id` | `BIGINT` | Auto-increment primary key |
| `full_name` | `VARCHAR(120)` | Not null |
| `email` | `VARCHAR(190)` | Not null, unique (`uk_users_email`) |
| `mobile` | `VARCHAR(20)` | Nullable; blank values normalise to `NULL` |
| `password_hash` | `VARCHAR(100)` | Not null; BCrypt only |
| `role` | `VARCHAR(20)` | Not null; `PASSENGER` or `ADMIN` (`chk_users_role`) |
| `enabled` | `BOOLEAN` | Not null, default `TRUE` |
| `email_alerts` | `BOOLEAN` | Not null, default `TRUE` |
| `created_at`, `updated_at` | `TIMESTAMP` | Set by the entity lifecycle callbacks |

Emails are trimmed and lowercased before lookup and insert, so `Asha@Example.com` and
`asha@example.com` are the same account. A duplicate insert is caught both by a pre-check and
by the unique constraint, so a race also returns `409 EMAIL_TAKEN`.

### `revoked_tokens`

`jti VARCHAR(64)` is the primary key and `expires_at` is indexed. Logout stores the presented
token's `jti`; the filter rejects a token whose `jti` is present. Expired revocations are
pruned during logout, so the table does not grow without bound as long as logout continues to
be used.

### `audit_log`

`id`, nullable `actor_user_id`, `action`, nullable `target_type`, nullable `target_id`,
`details` (JSON text) and `created_at`. Current actions:

| Action | Actor | Details |
| --- | --- | --- |
| `USER_REGISTERED` | The new user | `{"role":"PASSENGER"}` |
| `ADMIN_PROVISIONED` | `NULL` (system/CLI) | `{"role":"ADMIN"}` |
| `ROLE_CHANGED` | The acting user | `{"from":"...","to":"..."}` |

## 3. API contract

| Method | Path | Access | Request | Success |
| --- | --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Public | `fullName`, `email`, `mobile?`, `password`, `confirmPassword` | `201` `{id, fullName, email, role}` |
| `POST` | `/api/auth/login` | Public | `email`, `password` | `200` `{accessToken, tokenType:"Bearer", expiresInSeconds, user:{id, fullName, email, role}}` |
| `GET` | `/api/auth/me` | Bearer | — | `200` `{id, fullName, email, role, mobile, emailAlerts}` |
| `POST` | `/api/auth/logout` | Bearer | — | `204` no body |
| `GET` | `/api/health` | Public | — | `200` `{"status":"UP"}` |
| `GET` | `/actuator/health` | Public | — | `200` health payload |
| Any | `/api/admin/**` | `ADMIN` | — | Route-specific |

`RegisterRequest` has no `role` field. An extra `role` in the JSON body is ignored by Jackson
and the account is still stored as `PASSENGER`; this is covered by a test. Registration never
returns the password hash.

### Error responses

Failures keep the Phase 00 `ApiError` shape (`timestamp`, `status`, `code`, `message`,
`fieldErrors[]`) and never include a stack trace.

| Status | Code | Message | When |
| --- | --- | --- | --- |
| `400` | `VALIDATION_ERROR` | `Request validation failed.` | Missing/invalid fields, weak password, mismatched confirmation |
| `401` | `INVALID_CREDENTIALS` | `Incorrect email or password.` | Wrong password, unknown email or disabled account |
| `401` | `UNAUTHORIZED` | `Authentication required` | Missing token on a protected route |
| `401` | `INVALID_TOKEN` | `Invalid or expired token.` | Malformed, tampered, expired or revoked token |
| `403` | `FORBIDDEN` | `Access denied` | Authenticated user lacks the required role |
| `409` | `EMAIL_TAKEN` | `An account with this email already exists.` | Duplicate email, case-insensitive |
| `429` | `TOO_MANY_ATTEMPTS` | `Too many sign-in attempts. Please try again later.` | Throttle window exhausted |

The login error is identical for every failure cause so the API does not reveal whether an
email exists.

## 4. Password and token rules

### Passwords

- 8–72 characters; 72 is BCrypt's effective input limit.
- At least one letter, one digit and one non-alphanumeric, non-whitespace symbol.
- Stored only as a BCrypt hash (`BCryptPasswordEncoder`); hashes are never serialised.
- Password values are never logged. The login and registration code paths log nothing about
  credentials.

### Tokens

- HS256 JWT signed with a key derived from `JWT_SECRET`.
- Claims: `sub` (user id), `role`, `jti`, `iat`, `exp`.
- `JWT_SECRET` must be at least 32 bytes; the application throws at startup when it is
  missing or too short. `JWT_EXPIRY_MINUTES` defaults to 60.
- Signature, expiry and required claims are verified on every request. Invalid, expired,
  tampered and revoked tokens all produce `401 INVALID_TOKEN`.
- The filter reloads the user and uses the **current database role** and `enabled` flag, so a
  disabled account or a role change takes effect on the next request without waiting for
  expiry.
- Logout revokes the presented token by `jti`; replaying it returns `401`. There is no
  refresh-token flow in this phase.

## 5. Authorization

| Rule | Behaviour |
| --- | --- |
| `POST /api/auth/register`, `POST /api/auth/login` | Public |
| `GET /api/health`, `GET /actuator/health`, `/error` | Public |
| `OPTIONS /**` | Public (CORS preflight) |
| `/api/admin/**` | Requires `ROLE_ADMIN` |
| Every other request | Requires a valid bearer token |

- `401` is returned for a missing/invalid identity; `403` for a valid identity without the
  required role. Both are JSON, not HTML or a redirect.
- Method security is enabled with `@EnableMethodSecurity` for future `@PreAuthorize` use.
- `CurrentUser.id()` exposes the authenticated user id for ownership checks. Phase 03 has no
  passenger-owned resources, so the repository pattern `findByIdAndUserId(...)` and the
  404-on-foreign-resource rule are documented for the first owned entity rather than
  exercised here.
- The admin route test uses a test-only `GET /api/admin/stub` controller; no production admin
  endpoint exists yet.

## 6. Login throttling

`LoginAttemptService` keeps a per-process map keyed by `email|clientIp`, where the client IP
comes from `HttpServletRequest.getRemoteAddr()`.

- Five failures inside a rolling ten-minute window block the key.
- The next attempt returns `429 TOO_MANY_ATTEMPTS`; this is the sixth attempt.
- A successful login clears the key.
- Entries are pruned lazily as attempts age out.
- The store is in memory: it resets on restart and is not shared between instances. Behind a
  reverse proxy that does not preserve the client address, all users would share one IP key.

## 7. Admin provisioning

The public registration endpoint can only create `PASSENGER`. Two out-of-band paths exist:

1. **Demo profile** — `SPRING_PROFILES_ACTIVE=dev,demo` plus a valid `DEMO_PASSWORD` creates
   `admin@trainconcierge.local` if it does not exist. A blank or weak `DEMO_PASSWORD` logs a
   warning and skips creation; the app still starts.
2. **One-time provisioning** — `SPRING_PROFILES_ACTIVE=dev,provision-admin` with
   `ADMIN_EMAIL`, `ADMIN_PASSWORD` and optional `ADMIN_NAME`. The runner fails startup when
   the email/password are missing or the password breaks the policy. It creates the admin
   once, logs the email only, and leaves an existing account untouched. The profile should be
   removed after the run.

No default admin password exists in the repository. `.env.example` leaves `DEMO_PASSWORD`,
`ADMIN_PASSWORD` and `JWT_SECRET` empty, and `.env` is Git-ignored. The README documents the
commands and the security caveats.

## 8. Tests and verification

`mvn clean verify` from `backend/`:

| Test class | Tests | Coverage |
| --- | ---: | --- |
| `AuthControllerTest` | 9 | Register + BCrypt hash, duplicate email ignoring case, weak password, role-escalation field ignored, login token + summary, generic 401 for wrong password and unknown email, `/me` auth and profile, sixth attempt throttled, successful login resets the counter |
| `JwtServiceTest` | 6 | Required claims and lifetime, expired, tampered, malformed, missing `role`, short secret |
| `SecurityRulesTest` | 7 | Public health, missing token JSON 401, malformed/tampered 401, expired 401, passenger 403 on admin route, admin 200, logout revokes the token |
| `UserServiceTest` | 1 | Role change updates the user and writes an audit row |
| `DemoAdminSeederTest` | 1 | Demo profile creates one enabled admin with a BCrypt hash |
| `GlobalExceptionHandlerTest` | 3 | Uniform error shape, validation details, malformed body (pre-existing) |
| `HealthControllerTest` | 1 | Health endpoint (pre-existing) |
| **Total** | **28** | **0 failures, 0 errors** |

Result: `BUILD SUCCESS`, `target/trainconcierge-backend-0.0.1-SNAPSHOT.jar` produced.

Tests run on H2 in MySQL compatibility mode (`MODE=MySQL`) with Flyway disabled and
`ddl-auto: create-drop`, in the `test` profile. The test secret is a fixed non-production
value. Tests cover behaviour through MockMvc and the service layer, not a real MySQL server.

### Verification finding

The first verification run failed two tamper tests intermittently. Both changed the **last**
character of the JWT signature. An HS256 signature is 32 bytes, which base64url-encodes to 43
characters; the final character carries two unused bits, so `A` and `B` can decode to the same
signature bytes and the "tampered" token is byte-identical after decoding. The tests now change
the **first** signature character, which always changes the decoded bytes. This was a test
defect, not an authentication defect: the API still rejects genuinely modified signatures.
After the correction, all 28 tests pass deterministically.

## 9. Acceptance checklist

- [x] `users`, optional `revoked_tokens` and `audit_log` added by Flyway `V2__users.sql`.
- [x] Unique index on `users(email)`; index on `audit_log(created_at)`.
- [x] `POST /api/auth/register` is public and creates PASSENGER only.
- [x] `POST /api/auth/login` is public and returns token, `Bearer`, `expiresInSeconds`, user.
- [x] `GET /api/auth/me` requires authentication.
- [x] `POST /api/auth/logout` requires authentication and revokes the token.
- [x] `/api/health` stays public; `/api/admin/**` is ADMIN-only; other `/api/**` needs a token.
- [x] Generic `401 "Incorrect email or password."` for all login failures.
- [x] Duplicate email returns `409 EMAIL_TAKEN`, case-insensitively.
- [x] Password policy: 8+, letter, digit, symbol; email trimmed/lowercased.
- [x] HS256 JWT with `sub`, `role`, `jti`, `iat`, `exp`; secret >= 32 bytes from env.
- [x] Expired, malformed and tampered tokens return 401.
- [x] Stateless security, CSRF off, CORS from `APP_FRONTEND_ORIGIN`, JWT filter order,
      method security enabled.
- [x] JSON 401 and 403 via custom entry point and denied handler.
- [x] `CurrentUser.id()` ownership helper; foreign-resource 404 rule documented for the first
      owned entity.
- [x] Admin accounts cannot be created through the public API.
- [x] Demo seeder and one-time provisioning; no default admin password.
- [x] Login throttling: five failures in ten minutes, sixth returns 429, success resets.
- [x] Passwords and tokens never logged; hashes never returned.
- [x] Role changes write `audit_log`.
- [x] MockMvc and unit tests written; `mvn clean verify` passes.
- [x] Phase report written.
- [x] No secrets added to the repository; nothing committed or pushed.

## 10. Known limits and hand-off

- **Live MySQL was not exercised in this session.** No local `.env`/database credentials were
  available, so `V2__users.sql` has not been run against MySQL 8.0 here and Hibernate
  `ddl-auto: validate` has not been checked against a real schema. Before relying on a local
  database, run the backend with `DB_URL`, `DB_USER`, `DB_PASSWORD` and `JWT_SECRET` set, and
  confirm `flyway_schema_history` contains V1 and V2 and startup reaches "Started
  TrainConciergeApplication" without a validation error.
- The throttle is per-instance and in memory; a multi-instance deployment needs a shared
  store or gateway-level rate limiting.
- No refresh tokens, password reset, email verification, account suspension endpoint or admin
  user-management endpoint yet. `UserService.changeRole` is ready for the latter.
- The frontend has no sign-in, token storage or auth header interceptor; Phase 04 owns that.
  Until then the shells are not route-guarded.
- Logout accepts any valid token and revokes only that token, not every session for the user.
- JWT secret rotation invalidates all issued tokens; there is no key-id based rotation.
- `audit_log` is append-only by convention with no retention job or read API.

## 11. Files changed (Phase 03)

**Backend — production**

- `db/migration/V2__users.sql`
- `auth/`: `AuthController`, `AuthService`, `JwtService`, `JwtAuthFilter`,
  `LoginAttemptService`, `RevokedToken`, `RevokedTokenRepository`, `dto/*`
- `user/`: `Role`, `User`, `UserRepository`, `UserService`, `DemoAdminSeeder`,
  `AdminProvisioningRunner`
- `common/security/`: `SecurityConfig`, `PasswordPolicy`, `UserPrincipal`, `CurrentUser`,
  `RestAuthenticationEntryPoint`, `RestAccessDeniedHandler`
- `common/audit/`: `AuditLog`, `AuditLogRepository`, `AuditService`
- `common/error/`: `ApiException`, `ApiErrorWriter`, `GlobalExceptionHandler`
- `pom.xml` (test-scoped H2)

**Backend — tests**

- `auth/AuthControllerTest`, `auth/JwtServiceTest`, `auth/SecurityRulesTest`
- `user/UserServiceTest`, `user/DemoAdminSeederTest`
- `src/test/resources/application-test.yml`

**Documents and configuration**

- `README.md` (auth API, provisioning, environment variables)
- `.env.example` (empty secret/admin placeholders)
- `docs/reports/phase-03-backend-auth-rbac.md` (this report)
