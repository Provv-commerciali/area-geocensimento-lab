# Complex workflow and navigation profiling — 2026-09-29

## Measurement gate

The approved audit captured one production-local authenticated browser trace before this corrective milestone. It is not a multi-sample baseline and its 5,474 ms Complex outlier is not a median. A comparable multi-sample before/after RSC/browser table cannot yet be completed because the configured LAB Auth test credentials currently return `Invalid login credentials`. No navigation-time or payload improvement is claimed from the loading UI or from the static request count below. The original production build is no longer available for a clean rerun, so its single sample must not be promoted into a before median.

The user explicitly authorized an interim push to `main` while this authentication/performance gate remains open and will perform the visual check. Publication is not a claim that the corrective milestone or its performance acceptance criteria are complete.

| Page | Audit click→visible (single, ms) | After median / range | Audit RSC (single, ms) | After RSC median / range | Audit payload (single) | After payload | Data calls before → after (code paths) |
|---|---:|---|---:|---|---:|---|---|
| Dashboard | 1,356 | pending authenticated run | 1,087 | pending | 11.5 KB | pending | 4 → 3 |
| Contatti | 1,354 | pending authenticated run | 885 | pending | 32.6 KB | pending | 8 → 6 |
| Zone | 338 | pending authenticated run | 221 | pending | 9.2 KB | pending | 3 → 2 |
| Complessi | 5,474 outlier | pending authenticated run | 5,268 outlier | pending | 3.2 KB | pending | 8 → 3 |
| Nuovo Contatto | 828 | pending authenticated run | 607 | pending | 30.7 KB | pending | 10 → 4 |

The call counts above are traced from repository code, not browser network measurements. Supabase requests execute server-side and therefore are not visible as individual browser responses. The original audit's `Complessi` call count included the 2-ID/Access/location Civic chain; the new route does not request Civics, and it reads Contact counts through one aggregate RPC without fetching full Contact rows. `Zone`, `Street`, and `Complex` relationship reads have been folded into RLS-aware PostgREST embeds. Zone overview is parallel with Zone metadata. The main Contact route still loads its operational dataset, but removes one Zone and one Street/Complex follow-up round trip. Nuovo Contatto loads Accesses only after a Street is selected.

Row-specific Zone, Street, Civic, Contact and Complex links now use `prefetch={false}`. Static/main navigation and pager links were not globally disabled. The route-level loading cards were subsequently removed after operator feedback because they replaced the current page with an almost empty panel during navigation. This UI correction is not counted as a reduction in real server cost.

## Required follow-up measurement

After restoring a valid LAB Auth test login, run at least five warm client-side navigations per page on the production-local build, recording click→title-visible, primary RSC body completion, RSC bytes and background RSC count. Record a separate first/cold navigation, and publish medians and min–max ranges for each metric. If the original build cannot be reconstructed under equivalent conditions, label its values historical single samples and do not calculate percentages. Authenticated A-flow Playwright and the Zone→Street→Access→Contact regression must pass before release.
