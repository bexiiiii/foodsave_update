# Laptop layout — 2026-11-10

Only layout classes and desktop CSS change. Below 768px the added rules do not apply.

- Catalog width capped at 1120px, three columns from 768px and four from 1100px.
- Profile, orders, notifications and product details capped at 720px.
- Home search aligned with logo; compact map preview and centered navigation.
- Product details retain enough bottom spacing for the reservation panel.
- No changes to authentication, reservations, prices, parser, API calls or data.

## Production preservation

Production source differs from this checkout, notably on home, orders and product details.
Do not deploy this checkout wholesale over production. The prepared release applies the
same class additions to the current server source and running build, preserving all
other code and old assets. Reverse replacement verifies that each of the 16 modified
client/server page implementations is otherwise byte-identical. Asset references receive
new content hashes. Runtime and source hashes must still match immediately before switch.

Server release: `/home/deploy/foodsave-laptop-layout-20261110`.
Source snapshots, `replacement-proof.json`, manifest, candidate and rollback container
are retained there/on the server. The production build stays on the server.

## Validation

- Syntax checked for all eight modified TSX pages; `git diff --check` passes.
- Isolated candidate: exact expected runtime hashes and HTTP 200/security headers on
  home, markets, boxes, product details, profile, orders, notifications and map.
- Actual candidate rendered with local synthetic data: catalog at 1366, 1024 and 390px
  has respectively four, three and two columns with no horizontal overflow.
- Local preview also checked profile and reservation panel alignment.
- No real orders created, cancelled or edited; parser and backend are outside the release.

This is a presentation check, not a new end-to-end test of booking/payment flows.
