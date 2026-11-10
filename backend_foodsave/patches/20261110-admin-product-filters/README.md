# Product filters before pagination

The admin products screen previously fetched one unfiltered page and applied store/category/status filters to those rows only. Searching used a separate endpoint, and changing filters retained the previous page index. This hid matching products on other pages and left the page count unrelated to the selection.

`GET /api/products/admin-filter` applies query, store, category and status together before counting and paginating. It excludes soft-deleted products, supports inactive/withdrawn products for administration, and orders by creation date then ID. Search is trimmed, case-insensitive and treats SQL wildcard characters literally. Page size is bounded to 100. Super admins see the full catalogue; owners and managers are restricted to their owned/managed stores even when specifying a different store ID. Customers and anonymous requests are rejected. DTO conversion continues to use the existing product service.

The admin now sends all filters in one request, resets the page on filter changes, debounces text searches and ignores superseded responses/errors. Server-side pagination supplies the matching page count. An emptied last page moves back to the last valid page. The previous client-side second filtering pass is removed. Statistics are fetched separately on initial load; their existing zero-valued cards are a separate issue, not part of this fix.

Validation:
- Five database tests (H2 in PostgreSQL mode): filtering before pagination, combined filters, inactive/deleted products, owner/manager isolation, literal wildcards, invalid requests and stable page boundaries.
- Four UI logic tests: URL encoding/combined filters, stale responses, stale errors and recovery from an emptied page.
- Both patched production page functions exercised with concurrent simulated responses.
- Live Chrome: store filter across the full catalogue; next page; filter change resets pagination; store + category + status + padded text query; empty results; clearing filters restores page 1. No orders or products were created or modified.
- New endpoint returns 403 anonymously; public featured products and Mini App continue returning 200.

Production release is retained in `/home/deploy/foodsave-admin-filters-20261110`. Backend image `foodsave-backend:admin-filters-20261110` (`sha256:fb8d4587e01ab34d9e067597e5e81ee4d850084de12ea2b616dcc46e9fb19d92`) adds only the two new filter classes to the current JAR; every existing class/resource remains byte-identical. No migration. Admin image `foodsave-admin:filters-20261110` (`sha256:cef5df8275b21daea4489be75610e945e216298c9d60e467f06041919c81c98a`) patches the existing products page bundles and asset references, preserving unrelated code and old assets. Equivalent targeted source changes are retained on the server. Previous containers remain available for rollback as `foodsave-backend-before-admin-filters-20261110` and `foodsave-admin-before-filters-20261110`.
