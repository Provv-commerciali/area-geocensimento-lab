# Street Complex projection — 2026-09-29

## Paging and semantics

The versioned, security-invoker `street_representation_page_lab` RPC pages visual items (free AddressAccess or Complex), not raw Accesses. It groups before `LIMIT/OFFSET`, anchors each Complex at its primary Access on the Street or its first local Access, and applies search/filter matches from any member Access before pagination. Case Geska's 3 linked Accesses produce 1 visual row; the tested Via Francesca has 164 raw Accesses and 162 visual items. Search `Geska` returns Case Geska as 1 item. No Street-wide Access list is sent to the browser.

The card uses `unit_count` only as **declared units**. The separately displayed **Contacts censused** count is the number of persisted CensusRecords with that Complex ID, including records on other linked Streets. The current schema cannot count distinct property units. Expansion eagerly uses these persisted records and Access links; reopening makes zero requests. A Complex with no CensusRecord is still a visual item and may disclose its real linked Accesses.

## Request count

These are server-side repository/Storage request counts from the code path for a Street page with fewer than 1,000 records; they are not browser network counts. The baseline is the immediately preceding implementation, not a historical timing estimate.

| Path | Before | After |
|---|---:|---:|
| Street records + Zone + Complex metadata | 3 | 3 |
| Zone–Street membership + Street metadata | 2 | 2 |
| Street page RPC | 1 | 1 |
| Visible Complex Accesses + private photo metadata | 0 | 2 when a Complex is visible |
| Signed thumbnail URLs, batched | 0 | 1 when a photo is present |
| Records for all visible Complexes, batched | 0 | 1 when a Complex is visible |
| **Total, Case Geska page** | **6** | **10** |
| **Expand / collapse “Mostra interni”** | n/a | **0** |

The extra four requests are independent of the number of visible Complexes (up to the 40-item page limit); no per-Complex N+1 loop exists. The Access/photo queries and Complex-record query run in parallel where possible. A page without a visible Complex remains at six requests. Record paging may add requests above 1,000 rows, as before; this is not a claim of constant total work for arbitrarily large datasets. Private photo URLs last 600 seconds and are never public.

## Observed local production-build sample

Authenticated Playwright against the production build and dedicated LAB DB: Case Geska search page `page.goto`→card visible **912 ms**, inline expansion **27 ms** in the last run. An earlier same-build sample was 745 ms / 39 ms. These are two single samples, not a statistically comparable before/after median. The previously recorded broad Street navigation sample was 333 ms for a different query and is not a valid baseline for Case Geska search. Browser test screenshots: `test-results/street-case-geska-desktop.png`, `street-case-geska-expanded.png`, `street-case-geska-mobile.png`. No network request is issued by expansion; it only changes local React state.

## Release observations

The LAB SQL check used the `authenticated` role and the real test user claim inside a read-only transaction. It confirmed Case Geska primary 270, 13 declared units, 3 linked Accesses, 2 CensusRecords, 1 stored building photo and exactly one Complex visual row. Production-hosted Vercel verification remains separate from local production-build verification.
