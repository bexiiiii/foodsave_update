# Preserve withdrawn box status on cancellation

Cancellation releases the reservation but only returns sellable inventory when the box is active, not deleted, and has status AVAILABLE. Booking the last unit does not change that status, so normal cancellation still restores stock. Explicit OUT_OF_STOCK, HIDDEN, DISCONTINUED and EXPIRED statuses stay untouched; quantities of withdrawn offers are not increased. Existing cancellation history, notifications and idempotency remain unchanged.

The checked-in backend has only stockQuantity; the current production backend also tracks availableQuantity and reservedQuantity. The adjacent patch records the equivalent narrowly scoped production change without replacing colleagues' newer service implementation. On production the reserved counter is always released before checking whether stock may be returned.

Production source precondition (SHA-256): 247a35ac041ee130a484936640537d3feedb6b3339e37b83ed4c23f4d825872c.
Production baseline image: sha256:4d02ff5acca7625493d403e97adf153725decd6f66255a43e13ae3ee46cebdd9.

Validation: 43 production regression tests (9 reproduced failures before the fix, all passing after), plus 8 portable stock-restoration tests, all 51 passing against production classes. The 8 portable tests also pass with the checked-in backend. Tests use synthetic objects and mocked repositories/notification transports; no real orders or messages were created.

Release directory on server: /home/deploy/foodsave-cancel-status-20261110.
Candidate image: foodsave-backend:cancel-status-20261110.
Only ReservationStatusService.class is replaced; every other JAR entry is byte-identical to the deployed baseline. Deployment guards the source and runtime hashes and retains the previous container for rollback. No database migration or historical data rewrite.
