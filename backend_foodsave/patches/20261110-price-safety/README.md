# Prevent phone numbers becoming prices; quarantine implausible report amounts

The WhatsApp parser interpreted numeric mentions such as `@77074403678` in conversational messages as prices. Imported prices could then distort catalogue value and historical order reports.

The shared parser guard removes Kazakhstan phone numbers, numeric mentions, full dates and time tokens before item parsing. Contact-only lines are ignored; genuine prices elsewhere in a line remain available. Both parsed items and final cards (including bundles and catalogue-derived prices) reject non-finite, nonpositive or above-1,000,000-KZT amounts. Both publication paths validate again even with force enabled. ProductDTO validation rejects price/originalPrice above the same limit on API creation and editing.

Existing records are not rewritten, deleted or assigned guessed prices. Reports exclude order amounts outside 0–1,000,000 KZT from monetary totals and rankings; order counts/status history remain intact. Average order value excludes these orders from both numerator and denominator. Catalogue monetary aggregates exclude products with price or originalPrice outside the range, while retaining product counts. UI captions explicitly disclose the threshold. Detailed history/export retains original amounts; these are not corrected transaction records. The threshold is a conservative review boundary, not proof that every large amount is invalid. Legitimate unusually large prices/orders require separate review.

At verification time, two stored order totals exceeded the limit: an old 16,837,215.60 KZT order with no remaining items and a cancelled test order with 77,074,403,678.40 KZT. Nine nondeleted products had suspect prices. No original price was confidently recoverable from the available evidence. Existing order/item checksums for the cancelled test order remained identical before and after deployment.

Validation:
- Six backend tests passed: money guard, unchanged historical amounts, null/negative/boundary values, actual Spring Data/H2 monetary aggregation, store scope, soft deletion and preserved counts.
- Seven admin tests passed, including two tests of the actual average expression with anomalous/null/empty inputs and five existing product-filter tests.
- Six new parser tests passed against the current production parser, including preservation of valid prices next to a contact and force-publication blocking.
- Existing deployed parser suite: 26/27 passed. The remaining assertion expects `royalty/жаннур.jpg` but current photo selection returns `royalty/archive/zhannur.jpg`. The identical assertion fails on the unmodified baseline; this release does not change photo selection.
- Patched production Java classes were exercised directly for totals, ranking exclusion and DTO constraints. Every unrelated method/JAR entry was verified unchanged. Both deployed analytics bundles' average expressions were independently exercised.
- Live Chrome analytics: total 9,512,199.81 KZT (display rounded to 9,512,200), average 2,273 KZT for the selected period; category/month charts no longer contain the phone-sized spike. Independent SQL confirmed total and catalogue value 31,959,573.29 KZT. Values are point-in-time, not fixed fixtures.

Production release: `/home/deploy/foodsave-price-guard-20261110`. Backend image `foodsave-backend:price-guard-20261110`, digest `sha256:2f66a0708ce35e1fd4f5851ab25fcb23d66fd60c804d85332f44672ccf151a17`; admin image `foodsave-admin:price-guard-20261110`, digest `sha256:c5d19ec2c4a0ea706939e7488a159c6e6dcd3a1229fbd311305eda30c8fa9949`. Previous containers end in `before-price-guard-20261110`. Parser source backups are in `parser-before`; guarded candidate, tests and rollback script are retained in the release directory. Three parser files received narrow edits plus one new helper; unrelated Python files were hash-checked unchanged. No database migration or data mutation.

Local and server source trees differ in unrelated colleague changes; deployment used guarded edits against the running versions, not a wholesale rebuild from this checkout.
