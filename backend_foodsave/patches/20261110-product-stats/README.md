# Restore product statistics

Spring Data returns the multi-column aggregate as a single nested Object[] row in production. The previous mapper interpreted that as an incomplete result and returned six zeros. ProductStatsMapping accepts both wrapped and flat rows, handles null sums for an empty catalogue, preserves decimal precision and rejects malformed rows instead of silently returning zero.

The admin refreshes statistics after a successful catalogue reload, including reloads after mutations. Loading/unavailable statistics display a dash instead of a misleading zero. The total-value card accommodates long numbers. Existing aggregate formulas, store access restrictions and global catalogue scope are unchanged; selecting table filters does not narrow these summary cards.

Validation:
- Six backend tests passed: four aggregate mapping tests and two actual Spring Data/H2 PostgreSQL-mode repository tests covering empty sums, store scoping, soft deletion and totals.
- Five admin logic tests passed, including refreshing statistics after catalogue changes and ignoring superseded requests.
- Live Chrome cards matched an independent read-only database query: 12,632 products, 902 active, 3,227 without stock, total value 616,628,230,013.09 KZT at verification time.
- Store filtering remained functional. No production products or orders were modified for verification.
- Nine existing product prices exceed 1,000,000 KZT, including prices in the tens of billions. These values explain the unusually large total and need separate data review; this release does not edit or cap prices.

Production was patched from the deployed images, preserving colleague changes that differ from the checkout. Only ProductService.toProductStats bytecode and the new mapper class changed in the backend JAR; all other methods and JAR entries were verified unchanged. The admin patch modifies only the products page and its asset references, retaining old assets. Equivalent guarded source edits were applied on the server. No database migration.

Backend: foodsave-backend:product-stats-20261110, sha256:d001e5da11bbf5d2ef25cfeeb45952a0897eab4ee9fdfe39a97d4ff07237098a. Rollback container: foodsave-backend-before-product-stats-20261110.

Admin: foodsave-admin:stats-layout-final-20261110, sha256:6c277bac85a48d26629f5a8948f358ee6246fa4eaf8d01bbcf99fe61f573f9d8. Pre-statistics rollback container: foodsave-admin-before-stats-20261110. Immediate layout rollback: foodsave-admin-before-stats-layout-final-20261110.

Release manifests, guarded deployment scripts, source backups and verification records are retained under /home/deploy/foodsave-product-stats-20261110 and /home/deploy/foodsave-stats-layout-final-20261110. Candidate and production runtime hashes and the products/orders/stores routes were checked before and after replacement.
