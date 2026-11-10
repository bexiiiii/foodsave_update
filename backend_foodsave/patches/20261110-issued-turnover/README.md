# Report issued turnover for the selected period and current inventory

The prior price guard removed phone-sized amounts, but general analytics still summed all order statuses over a different period from the visible date selector. Catalogue value included old, expired and discontinued stock. Neither number represented FoodSave earnings.

`GET /api/analytics/issued-period` reports valid orders in PICKED_UP, DELIVERED or COMPLETED status. It uses picked_up_at, then completed_at, then created_at for legacy records without an issue timestamp. The end date is inclusive. Turnover, issued count, average, daily chart, rankings, status distribution and payment methods share the same period and store scope. Owners/managers cannot bypass store ownership by supplying a store ID. Anonymous/customer access is denied. Null, negative and above-1,000,000-KZT totals are excluded, with an excludedOrders count returned. This does not repair uncertain historical prices or prove all remaining amounts are correct.

The admin keeps general user/store metadata separate from period money. Stale requests cannot overwrite a later selection. Empty periods remain zero, without falling back to lifetime values. Existing detailed order history/export remains available, including all statuses; its amounts are labelled as sums of bookings rather than income. Detailed history uses creation dates, whereas the top report uses issue dates. Turnover is merchant order value, not FoodSave commission, profit or proof of payment.

Product active count and stock value now follow the current customer availability query: active AVAILABLE products with positive stock, valid expiry, and active/open stores. Value also requires sane price/originalPrice. Total product and out-of-stock history counts remain available. No price, order, payment, stock or history records were modified by this release.

Validation:
- 11 backend tests: issued/cancelled/pending/anomalous totals, date boundaries, store scope, empty periods, distributions, real Spring Data aggregation, expired stock and closed stores.
- 8 admin tests: same-period average, out-of-order report responses, lifetime metadata isolation, existing product-filter/race/refresh cases.
- Both deployed analytics bundles' callbacks exercised independently, including stale responses and empty-period averages.
- Live Chrome products and read-only SQL initially matched: 46 available products, value 107,813.20 KZT. Later, after live catalogue activity, Chrome showed 71 available products / 278,046 KZT; this metric is intentionally dynamic.
- Live Chrome analytics and independent read-only SQL: 12 Oct–10 Nov 2026, 433 issued orders, turnover 886,934.48 KZT; 4–10 Nov, 79 orders, 190,203.20 KZT. UI rounds currency to whole tenge. These are point-in-time observations.
- Health UP; anonymous scoped-report request returns 401. No test purchases or cancellations. Empty periods were verified in automated tests; the additional browser check was inconclusive because the browser tab repeatedly moved back to Products during inspection.

Deployment was applied to the exact running images with guarded source edits, because server/local trees contain different colleague work. Unrelated JAR entries and runtime files were verified unchanged; old browser assets and previous containers remain for rollback. Shared API changes only add the scoped endpoint. Updated asset references account for the manifest changes.

Release directories: `/home/deploy/foodsave-issued-report-20261110` and `/home/deploy/foodsave-issued-report-final-20261110` (final distribution completion). Backend image `foodsave-backend:issued-report-final-20261110`, digest `sha256:e5c42d2572eb48b09fc6b1b04ca2cf7949eb835ca613657401ee91ea9199ff7b`. Admin image `foodsave-admin:issued-report-20261110`, digest `sha256:585873c07f36fec386e0265ea3b32b461a2d6219c86fc4bf14f795a553764565`. Previous containers have `before-issued-report-20261110` / `before-issued-report-final-20261110` suffixes. Mini App, landing page, parser, database and Redis containers were not replaced.
