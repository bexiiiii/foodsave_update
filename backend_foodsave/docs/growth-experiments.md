# Manual growth experiments: operations and verification

## Safety and scope

This feature ships **OFF**. It adds no scheduler, automatic enrollment, startup send, or customer contact. The console at `/communications/experiments` is read-only and restricted to `SUPER_ADMIN`; mutating operations use the authenticated admin API. Payment wording is cash at pickup, with no online-payment feature.

Treatment delivery requires all of: `notifications.growth.enabled=true`, an explicitly enabled experiment, a treatment assignment younger than 24 hours, current consent/preferences, and every safety check. Ordinary marketing can remain in its existing state. A participant in **either arm** is excluded from legacy marketing for 14 elapsed days after assignment, even if the experiment or growth delivery is paused. Nonparticipants and transactional order messages are unaffected. Overlapping 14-day enrollment in another experiment is rejected.

The immutable allocation is SHA-256 of the documented canonical experiment UUID, seed and user ID (first unsigned 32 bits modulo 10,000). Holdout basis points, seed, baselines, experiment identity and time zones cannot change. Database audit/assignment/status/dispatch records cannot be rewritten or deleted through application operations.

## Before rollout (requires deployment authorization)

1. Back up the database through the established procedure, verify restore capability, and record current server commit/image and configuration. Check actual schema matches the prerequisite columns in users, orders, products, stores, notification preferences/settings/history and frequency states.
2. Audit how historical timestamp-without-time-zone values were written. Defaults are `Asia/Almaty` for order timestamps, legacy notification/GPS timestamps, and measurement calendar dates. They match application `TimeZoneConfig`; do not substitute UTC without evidence. Config names are `notifications.growth.legacy-order-zone`, `notifications.growth.legacy-timestamp-zone`, and `notifications.growth.measurement-zone`. Each experiment freezes its order and measurement zones.
3. Leave `notifications.growth.enabled=false`. Do not change the ordinary `notifications.marketing.enabled` flag just to install growth.
4. Apply **V020 then V021, each in a single transaction**, using the established migration tracking procedure. Example tooling: `psql --single-transaction -v ON_ERROR_STOP=1 -f <migration-file>` with connection settings supplied through the authorized operational channel. Do not use autocommit `psql -f`: V020 locks orders during its initial snapshot and trigger installation. Do not rerun an already applied migration. No production migrations were executed during development.
5. V020 snapshots existing order states and creates indexes. Budget disk/lock time and a maintenance window appropriate to actual order volume. It does not invent history before migration. V021 adds immutable dated pickup attestations and durable dispatch claims. Neither migration creates experiments, participants, or messages.
6. Deploy and check health, authenticated SUPER_ADMIN access, denied ordinary-user access, dry-run API and ordinary transactional behavior. Keep sending OFF until the requested controlled launch is separately approved.

## API workflow

Base path: `/api/admin/growth-experiments`. Use the existing authenticated SUPER_ADMIN session; never put credentials in documentation, URLs, commands checked into Git, or logs. Actor IDs are derived server-side.

1. `POST /` with `{"name":"Pilot name","seed":"reviewed-fixed-allocation-v1","holdoutBps":2000}` creates a disabled experiment. A 2,000-basis-point holdout means 20%. API requires 1..9999, preserving both arms.
2. `GET /{id}/candidates?cohort=NEVER_CLEAN&limit=100` previews up to 500 IDs plus the complete cohort count. Repeat for `ONE_CLEAN_RECENT`, `ONE_CLEAN_LAPSED`, `REPEAT_LAPSED`. Preview is read-only. Never-clean has no registration-age cutoff; the lapsed boundary is exactly eight elapsed days since last clean order. Recent repeat buyers are outside these cohorts.
3. `POST /{id}/preview` with `{"userId":123}` returns the proposed deterministic arm and baseline, or the existing frozen assignment. This does not enroll.
4. After reviewing the audience, `POST /{id}/assignments` with `{"userId":123}` freezes one assignment. Repeating the same enrollment returns the same record. Enrollment starts its 14-day exclusion from ordinary marketing, whether treatment or holdout, and its measurement clock. Do not enroll broad audiences as a way to test a preview.
5. Independently verify the actual product-specific pickup window with the store, dated and timed; opening hours alone are insufficient. `POST /pickup-windows` with `{"productId":456,"startsAt":"2026-10-01T10:00:00+05:00","endsAt":"2026-10-01T12:00:00+05:00"}` records the authenticated administrator's attestation. The timestamp example must be replaced with a genuinely verified current window. Unknown or stale pickup information blocks delivery. New attestations append; existing evidence is immutable.
6. `POST /{id}/dispatch-preview` with `{"userId":123,"productId":456}` shows all blocking reasons, distance, dated pickup window and message. Both flags may stay OFF while reviewing. Missing permissions/preferences, opt-outs, fresh GPS/location, recipient-local quiet hours, active stock/store, expiry, radius, price preferences, recent frequency, suppression and travel/pickup time are checked. No district-based fallback is used.
7. Only after explicit launch approval, configure global growth delivery on and `PUT /{id}/enabled` with `{"enabled":true}`. This still sends nothing automatically. A manual `POST /{id}/dispatch` with the same user/product payload requests one send. Holdout cannot send. At most one claim per experiment/user is permitted, independent of product choice. Claims and frequency reservations commit before the single transport attempt; failed, unknown or crash-interrupted claims cannot be retried. This intentionally prefers a missed message to a duplicate. `CLAIMED` means an unresolved send, not confirmed delivery.
8. `GET /{id}/measurements` reports all assigned users including holdout, skipped, failed and never-dispatched recipients. D7 means first/second/next clean order according to the frozen cohort baseline; only CANCELLED, CANCELLED_BY_USER and CANCELLED_BY_PARTNER are excluded. Separate pickup measures require explicit pickup evidence. Different-calendar-day repeat is separate from merely another order. D14 rechecks cancellations of D7-clean orders. Late changes after D14 do not rewrite the frozen historical outcome. Rates remain null until the whole cohort/arm has matured; immature counts are shown.

## Limits and safe pause/rollback

- Disable the experiment to stop new claims; disable global growth delivery for a global stop. An already committed/in-flight claim may finish. Neither action releases participant isolation before D14.
- Keep the isolation-capable application version running throughout active follow-up. Rolling back to older code that lacks isolation would contaminate the experiment even with growth sends OFF.
- Roll back application changes only after assessing active assignments. Preserve additive tables, triggers and audit data; do not drop migrations or purge claims. No destructive down migration is provided.
- Measurements are order conversion, not revenue or causal proof of pickup. The agreed cancellation-only clean definition deliberately includes other order statuses. Delivery-conditioned rates are not substituted for ITT.
- Configuration defaults: GPS and pickup verification maximum age 24h, pickup start maximum ahead 24h, minimum remaining pickup 30m plus a distance-derived walking buffer when larger, maximum radius 8km, daily cap min(user preference,2), at least 4h between marketing claims. Five unopened messages reduce cap to one; ten block further delivery. Existing suppression is respected.
- Real production data, actual Telegram transport, deployment and live browser/API end-to-end were not exercised in the local test harness.

## Test commands

Standard: `mvn -Dsentry.skip=true -Dsentry.skipSourceBundle=true test` from backend. PostgreSQL integration is opt-in via `GROWTH_TEST_JDBC_URL=jdbc:postgresql://127.0.0.1:<port>/<disposable-db>` and optional `GROWTH_TEST_DB_USER` (default postgres). It creates and drops a random isolated schema, uses synthetic data and mocked Telegram, and must never point at production. The URL guard only accepts loopback PostgreSQL.

Admin: `node --test tests/growthExperiments.test.cjs`; run ESLint, TypeScript and `npm run build` separately. Existing Next configuration skips lint and TypeScript in builds, so a production build is not evidence of a clean typecheck.

`src/test/support/RunJupiter.java` is an offline fallback when Maven Surefire cannot resolve. It invokes the actual cached JUnit Jupiter engine (including Spring extensions/lifecycle and parameterized cases), accepts test-class names, and exits nonzero on failure or zero executed tests. Compile production/tests first and use the resolved test dependency classpath; an environment that disallows JVM self-attachment needs the installed Byte Buddy agent as an explicit `-javaagent` for Mockito. Prefer the standard Maven runner when dependencies are available.
