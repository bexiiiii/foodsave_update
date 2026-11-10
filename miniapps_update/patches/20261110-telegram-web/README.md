# Allow the Mini App inside Telegram Web

The deployed middleware returned `X-Frame-Options: SAMEORIGIN`, blocking Telegram Web's cross-origin iframe with "refused to connect". Replace it with `Content-Security-Policy: frame-ancestors 'self' https://web.telegram.org`. This allows the official Web A and Web K origin while retaining an explicit embedding allowlist. Authentication, signed Telegram data validation, other security headers and unrelated middleware rules are unchanged.

Validation: three middleware regression tests (page routes, fixed allowlist against untrusted referrers, remaining headers/path restrictions); exact runtime/header checks on five routes; live authenticated Chrome Telegram Web launch, orders screen and return to the catalogue. Firefox was not separately exercised in this session.

Production release: `/home/deploy/foodsave-telegram-web-frame-20261110`, image `foodsave-miniapp:telegram-web-frame-20261110`. A guarded patch changes only the header setter in the current runtime's `server/middleware.js` and the equivalent source line. Every other runtime file is preserved. Backend/admin/other services are not restarted. Previous container retained for rollback.
