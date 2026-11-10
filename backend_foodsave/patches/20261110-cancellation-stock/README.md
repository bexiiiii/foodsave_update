# Preserve withdrawn box status on cancellation

A normal reservation of the last unit sets OUT_OF_STOCK while keeping the offer active. Cancelling that reservation must restore inventory and AVAILABLE. An explicit staff withdrawal (OUT_OF_STOCK, DISCONTINUED, HIDDEN or EXPIRED) disables the offer, so cancellation releases the reservation without increasing sellable stock or changing the selected status. Inactive and deleted offers also stay unavailable. Existing order history, cancellation idempotency and notifications are preserved.

Browser testing exposed two gaps in the initial fix: booking does automatically change the last unit's status, and the admin form replaced any selected status with OUT_OF_STOCK at zero stock. The form now submits the selected status verbatim. Changing quantity only derives availability for AVAILABLE/OUT_OF_STOCK; other explicit statuses are retained. Both product update paths enforce manual withdrawal on the server.

The checked-in backend has stockQuantity; production also tracks availableQuantity and reservedQuantity. The production correction uses the current deployed sources and releases reservedQuantity before deciding whether sellable stock can be restored. No database migration or historical data rewrite is needed. No bulk reinterpretation of legacy statuses is performed.

Validation: 57 tests against the exact production classes, including 14 portable inventory tests, order-state regressions and notification failures/idempotency. The 14 portable tests also pass against the checked-in backend. These tests use synthetic objects and mocked repositories/transports. Separate browser testing uses only an explicitly authorised temporary test product and test orders.

Production releases:
- Backend: /home/deploy/foodsave-cancel-status-e2e-20261110, image foodsave-backend:cancel-status-runtime-20261110.
- Admin: /home/deploy/foodsave-admin-status-20261110, image foodsave-admin:status-20261110.

The source-compiled backend candidate exposed a production source/runtime mismatch (a newer getAllProducts overload was absent from the server source) and was rolled back immediately after the browser check. The final backend patch uses the original runtime classes: PatchRuntime.java injects policy calls into exactly three methods, keeps every existing method/field, and verifies all untouched method encodings. CancellationStockPolicy.java supplies the added policy. Every other JAR entry remains byte-identical. Admin deployment changes the two product-page implementations and their asset references, retains previous assets, and applies equivalent source edits. Both deployments guard live source/runtime hashes and retain rollback containers. Other services are not redeployed.

The adjacent production.patch records the stock-counter adaptation; production-followup.py records the guarded correction discovered by end-to-end testing. Do not deploy the older local checkout wholesale over newer production code.

Browser verification on production (10 November 2026): one authorised test product, ID 14257, was booked through the authenticated Mini App. Customer cancellation after manual DISCONTINUED kept status DISCONTINUED and stock 0. Normal last-unit cancellation restored AVAILABLE and stock 1. Admin cancellation after explicit OUT_OF_STOCK kept stock 0 and the product inactive, and the customer cancellation notification appeared in the Mini App. The temporary product was deleted through the admin bulk action with exactly one selected row. It disappeared after reload; its detail page reports unavailable. All four test orders (including the initial reproduction) remain CANCELLED in history, with no active test order. Real customer orders were not changed.
