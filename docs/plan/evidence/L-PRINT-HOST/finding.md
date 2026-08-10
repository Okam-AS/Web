# L-PRINT-HOST — "every admin document" against the documents that were rendered

**Exit:** *the personalliste and **every admin document** print without the sidebar gutter, verified by a
rendered PDF committed under `artifacts/journeys/`.*

**Reason shape hit: (3) the evidence proves LESS than the exit claims.** The brief offers two answers for
that shape — measure the missing case, or decline again and say the exit overclaims. **The missing case
cannot be measured from a checkout** (it needs a browser rendering a running app), so this is the second,
and the brief is explicit that the second is a finding rather than a failure. **Nothing was amended and no
PDF was manufactured.**

**The `evidence:` line, preserved:**
`lane/print-host @ 6e6acd0 · artifacts/journeys/admin-print-host/ (5 PDFs, read) ·
artifacts/journeys/admin-print-host.playwright.json`

## What is actually committed, counted rather than characterised

At `6e6acd0` (which **is** an ancestor of `feature/restaurant-modules` — the work landed; it is not on the
current `wip/session-2026-08-06-all-work` HEAD), `git ls-tree -r` under `artifacts/journeys/` holds:

| file | what it is |
|---|---|
| `00-before-personalliste-a4-portrait.pdf` | before |
| `00-before-vaktplan-a4-landscape.pdf` | before |
| `01-personalliste-a4-portrait.pdf` | after |
| `02-personalliste-a4-landscape.pdf` | after |
| `03-vaktplan-a4-landscape.pdf` | after |
| `01-the-register-on-screen.png`, `02-the-week-on-screen.png` | screen, not paper |

**Three after-PDFs, covering two documents** — the personalliste in two orientations, and the vaktplan.
Committing the two `00-before-*` sheets is good practice and makes the personalliste claim falsifiable;
neither adds a document to the set.

## The population the word "every" ranges over

At the same commit:

- **61** files under `pages/admin/`;
- **47** pages inherit the shell whose gutter was the defect — the number is the lane's own, written into
  `AdminPage.vue`'s doc: *"the gutter … survived onto the paper of **all 47 pages** that use this shell"*;
- **2** admin pages carry a print stylesheet of their own: `pages/admin/workforce-personnel-list.vue` and
  **`pages/admin/brev.vue`**.

**`brev.vue` has no PDF, and it is the least excusable omission in the set** — not because it is obscure
but because the fix's own doc names it: *"the two documents that had already shipped (`/admin/brev`, the
personalliste) had not [repeated the fix]"*. It lays A4 `SalesLetter` pages out and hides its own header
and footer for print (`@media print` at `brev.vue:80`), and it renders inside `AdminPage` (`<AdminPage
class="print">` at line 2), so the central change does reach it — **which is exactly why a rendered sheet
would have been cheap and is exactly what "verified by a rendered PDF" asks for.**

So the universal is carried by **a central change plus a blast-radius argument** (the RETURN's *"only 4
files in the repo carry `@media print` and none depends on the gutter"*), not by the instrument the exit
names. Amending the exit here would quietly reduce *every admin document* to *the two we rendered*, which
is the rewrite this program exists to prevent.

## Two facts a reader should carry with the decline

- **The lane's own RETURN records a document that still prints wrong**: *"`/admin/workforce-schedule` still
  clips its TIMER total column on A4 landscape — its own grid width; it has no print stylesheet at all."*
  That is the vaktplan page, i.e. one of the two documents that **were** rendered. The gutter clause is met
  for it; *prints without the gutter* and *prints correctly* are different sentences, and only the first is
  claimed.
- **The work itself is not in doubt.** Three defects were reproduced in a browser before the change and
  re-measured after; four named § 8-5-6 fields were being lost off the right edge of the personalliste;
  the 300 ms transition against a synchronous `window.print()` is fixed centrally without `!important`.
  This decline is about the scope of the sentence, not the quality of the lane.

## What closing it would take

One rendered A4 PDF of `/admin/brev` committed beside the existing three, produced the same way the others
were (`admin-print-host.playwright.json`, the fixture backend, a dev server) — plus, if *every* is to be
read strictly, a stated sampling rule for the other 45 shell pages, since 47 rendered PDFs is not a
proportionate reading of the exit. **That needs the app running and is outside a checkout-only batch; the
demo APIs on :5091 and :5941 are the owner's and were not touched.**
