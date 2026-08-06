# L-OFFERS-PAGE-HUNDREDFOLD — four offer helpers, decided

**Verdict: all four DELETED.** They were unreachable, wrong in two independent ways, and duplicated a
component that the same page already renders correctly.

Baseline taken by me: `feature/restaurant-modules` at **`e34977ac`**. Built on **`35e5cdd`** — see
*Base* below.

---

## 1. The premise, proven rather than inherited

The brief's "all four have zero call sites" came from `L-OFFER-PARTIAL-SUBTOTAL`, a lane working on a
neighbouring file, so it was re-established here before anything was deleted. **Every hit across every
ref in the repository is a definition line — no branch anywhere calls these.**

What was checked, and why each check was needed:

| Check | Result |
|---|---|
| Repo-wide grep of all four names (`.vue/.js/.ts/.json/.html`, excl. `node_modules`, `coverage`) | only the 4 definition lines in `offers.vue` |
| The page's own **template** (lines 1–435) | never calls them; the page renders no totals of its own |
| **Computed properties** on the page | none reference them |
| **String resolution** — `this[...]`, `$options.methods`, `methods[...]` | no dynamic dispatch anywhere in `offers.vue` |
| **Importers** of the page | none; only `AdminPageHeader.vue` (nav entry) and `admin-nav-access.test.js` (path string) |
| **All refs** — `git grep` over every `refs/heads` + `refs/remotes` | 4 definition lines per branch, **zero call sites on any branch** |
| Git history (`log -S`) | introduced in `76be1dc` "Initial commit" and never touched again — born dead |

The **Vue 2 `with(this)` trap** was the specific reason not to trust a plain grep: a sibling lane found
a helper that *looked* unreferenced because a module-scope import is invisible to a template compiled
inside `with(this)`, while eight call sites silently resolved to a mixin method instead. That trap
makes something look **unreferenced when it is reachable** — it cannot make something look reachable
when it is not. Here the direction that matters is covered anyway: a template call would appear as the
literal string `calculateTotalMonthly(` in the same file, and the grep of the template region found
none.

## 2. The magnitude, measured against the shipped formatter

Not read off the source — executed. `lanes/L-OFFERS-PAGE-HUNDREDFOLD/magnitude-proof.source.js` sliced
the four **shipped** method bodies out of `pages/admin/offers.vue` verbatim and called them through the
**real** `priceLabel` (`plugins/global-mixin.js`, whose module body installs this admin's `kr` currency
format into core's singleton), alongside the real `OfferDocument` computeds. 7/7 passed;
`magnitude-proof.txt` is the captured run.

```
MONTHLY  49900 øre -> helper: kr 4,99   | document: kr 499,00
ONETIME 125000 øre -> helper: kr 12,50  | document: kr 1 250,00
VALUES  monthly: 499 (document: 49900)  onetime: 1250 (document: 125000)
ABSENT  monthly: kr 0,00  onetime: kr 0,00  (should be the dash)
COLLAPSE stated-zero: kr 0,00  absent: kr 0,00  identical: true
NO-LIST monthly: kr 0,00  value: 0
```

The bodies were sliced rather than imported because `pages/admin/offers.vue` **cannot be component-
tested in this repo at all**: its template uses optional chaining (`proposalToDelete?.clientName`,
lines 384 and 413) and `vue-template-es2015-compiler` (buble) fails to parse it. Pre-existing, unrelated
to this lane, and noted below rather than chased. Slicing keeps the thing under test the shipped source
instead of a retyped copy — the brief's warning that *a test written from the same misunderstanding will
happily confirm the wrong magnitude* is exactly the failure mode this avoids.

**Two independent bugs, confirmed separately:**

1. **Magnitude (100×).** Each helper divides by 100 and then calls `priceLabel`, which takes **minor**
   units. `kr 4,99` where `kr 499,00` was meant. The two `…Value` helpers return kroner (`499`) to
   callers that every sibling in this codebase reads as øre (`49900`).
2. **Absence.** `if (item.monthlyFee)` is a falsiness test, so it skips an unstated fee **and** a
   genuine zero alike; the `reduce` seed of `0` then survives and `priceLabel` is handed a
   genuine-looking zero. The figure is manufactured *before* the gate can refuse it — which is precisely
   why `statedSum` exists as a **sum** helper and not a second gate. The `COLLAPSE` line above is the
   proof that the three worlds (stated / zero / absent) had collapsed to one answer.

## 3. Decision, per helper

Repair was considered and rejected for all four on the same ground, so the reason is recorded once and
the per-helper specifics beneath it. **Repairing unreachable code would have created a second
implementation of "what does this offer total"** — and the first one is 200 lines up in the same file's
template, already correct: `<OfferDocument :offer-proposal="viewingProposal" />` (line 336) renders this
page's only offer totals from its own `totalMonthlyFee` / `totalOnetimeFee`, in minor units all the way
to `priceLabel`, and is where the absence rule is applied to them. Two answers to one question is a
place for them to drift apart. Nothing user-visible depended on the four, so deletion costs nothing.

| Helper | Line | Decision | Reason |
|---|---|---|---|
| `calculateTotalMonthly` | 816 | **Delete** | Unreachable; 100× low (`kr 4,99` for `kr 499,00`); absent fee prints `kr 0,00`. Superseded by `OfferDocument.totalMonthlyFee`, which is rendered by this page and is correct on both counts. |
| `calculateTotalOnetime` | 830 | **Delete** | Identical defect on the one-time column (`kr 12,50` for `kr 1 250,00`). Superseded by `OfferDocument.totalOnetimeFee`. |
| `calculateTotalMonthlyValue` | 844 | **Delete** | Unreachable; returns a **raw number in kroner** (`499`) where every sibling treats a bare money value as øre (`49900`) — a unit mismatch with no formatter in front of it to catch it. No caller exists to want it, and no feature asks for a numeric monthly total. |
| `calculateTotalOnetimeValue` | 858 | **Delete** | Same, one-time column (`1250` vs `125000`). |

`statedSum` (`~/utils/price`, from `L-PRICE-BYPASS-FIVE`) was **not** used: it is the right tool for a
total that must be *rendered*, and after deletion this page renders no total. Writing a second fold here
was the thing to avoid.

A comment now stands where the helpers were, following the sibling's precedent of replacing dead code
with a note naming **what actually resolves** — it says the totals are `OfferDocument`'s, and records
both bugs, so the next reader does not re-derive the wrong conclusion and reinstate them.

## 4. Base, and why

`e34977ac` is the merge-base of both siblings and `offers.vue` is **byte-identical** at `e34977ac` and
`35e5cdd`, so the deletion applies cleanly to either. Built on **`35e5cdd`** (`lane/offer-partial-subtotal`,
which contains `8c6e91fa` `L-PRICE-BYPASS-FIVE`) because the *reason recorded above* — that
`OfferDocument` computes these totals correctly and absence-honestly — is only true of that tree. At
`e34977ac` the document still folds with `|| 0`. Basing there keeps my justification true of the commit
it sits in, and puts this deletion on top of the siblings rather than beside them.

## 5. Observations for others — not acted on

- **The shared working tree does not contain `35e5cdd`.** Worktree `components/shared/OfferDocument.vue`
  is the *pre-fix* version: the `|| 0` fold, no `statedColumnTotal`, no `statedSum` import, no
  `hasUnstatedTotal` note. The sibling's fix is committed on `lane/offer-partial-subtotal` but is not
  reflected in the checkout. Left exactly as found — reverting or restoring a file this lane did not
  dirty is not mine to do — but whoever merges should know the checkout is behind that lane, not ahead
  of it. (My magnitude figures are unaffected: both versions total a fully-stated fixture to `49900`.)
- **`pages/admin/offers.vue` cannot be component-tested** until the template's optional chaining is
  handled by the Vue 2 template compiler. Pre-existing, and the reason no test file covers this page.
- The full frontend suite was deliberately **not** run: the host was at load 59.8 against a ceiling of
  21. Verification here is targeted and is listed below.

## 6. Verification run

- `npx jest lanes/.../magnitude-proof.source.js` (as `.test.js`, before deletion) — **7/7 passed**, output in `magnitude-proof.txt`.
- Post-deletion parse: `vue-template-compiler.parseComponent` + `@babel/core.parseSync` on the script —
  **SFC parsed OK, script parsed OK**, 24 methods remain, **0** `calculateTotal*` defined.
- `git diff --stat pages/admin/offers.vue` — 1 file, **one hunk**, 22 insertions / 55 deletions; nothing
  else in the shared checkout touched.
- `npx jest --listTests | grep L-OFFERS-PAGE-HUNDREDFOLD` — **empty**: this lane adds no suite member,
  so the spent proof cannot go red.
