# L-PRICE-SHADOW-GUARD — detail

Baseline `e34977ac` on `feature/restaurant-modules`, measured in the shared checkout
`/Users/svendaneel/okam/Web-modules` (137 dirty paths from ~20 sibling lanes at the time).

## What the guard is

`test/price-gate-shadow.test.js`, 19 tests. The money gate is `priceLabel` on the global mixin in
`plugins/global-mixin.js`. In Vue 2 a component's own `methods` beat a mixin's on a name collision,
silently — so any component declaring that name takes the whole surface off the gate.

### Distinguishing a definition from a call

A grep for `priceLabel` hits 239 places, nearly all legitimate calls (the mixin's own definition and
every template rendering a price). Shadowing is about where a name is **declared**, so the scan:

1. blanks everything outside `<script>` — this removes every template call site structurally, with no
   name-based exceptions (`components/organisms/Product.vue` calls `priceLabel(...)` in a `{{ }}` and
   is correctly not a shadow);
2. masks comment bodies, string interiors, template literals and regex literals, offset-preserving, so
   nothing inside them can steer the brace walk or fake a key;
3. brace-walks each `methods:` / `computed:` / `props:` object literal and keeps only the keys at
   **depth 1**. A call inside a method body is at depth ≥ 2 and can never be a key.

The mixin is excluded by **location**, not by name: only `components/`, `pages/` and `layouts/` are
scanned, and the mixin lives in `plugins/`. Nothing special-cases the definition being protected.

Two views of each file are built at identical offsets: string interiors blanked (drives brace depth,
so a `{` in a string cannot move it) and intact (supplies the key name, so a quoted key is read).

### Anti-vacuity

Three independent mechanisms, because a check that only ever ran clean is indistinguishable from one
that matches nothing:

- the guarded names are asserted to be real members of the shipped mixin, so renaming the seam reds
  rather than silently matching nothing;
- census floors: ≥ 280 `.vue` files opened, ≥ 3500 depth-1 keys parsed, ≥ 250 files contributing keys
  — these stay honest when the shadow count is zero, which is the state the guard aims at;
- the extractor's own positive/negative controls run against fixtures, independent of the corpus.

That third one earned its place immediately: it caught a real hole in the extractor, where a quoted
key (`"priceLabel": fn`) evaded the scan because string interiors were blanked. That was a genuine
evasion path a component could have taken. Fixed by the two-view approach above.

**Re-checked after a later report that the quoted-key bug was still live.** It is not: a probe that
extracts the *shipped* scanner out of the guard file (rather than a retyped copy) and runs 10 quoted
shapes past it — double- and single-quoted, arrow and function values, in `methods`/`computed`/`props`,
after a string-valued property, after a shorthand method, value on the next line, and with a stray
brace inside a neighbouring string — finds **0 missed**. The report predates the fix. All nine
non-trivial shapes are now pinned as `test.each` cases so the answer lives in the suite rather than in
a message, because a quoted shadow renders money exactly like an unquoted one.

### Known limit, recorded not hidden

A shadow declared as a `data` property is **not** caught. There is a named negative test pinning that
gap so it is visible in the file that owns the rule. It is narrow — the template calls `priceLabel(x)`,
so a data-shaped shadow would have to hold a function value — but it is a gap and it is stated.

## The ledger, and why it fails in both directions

`PINNED_SHADOWS` is a ledger, not an allowlist: an entry records a shadow that still exists and names
who owns removing it. Checked both ways —

- an unpinned shadow reds (catches a new one);
- a pinned entry whose shadow is gone reds as **stale** (the direction exemption lists normally
  forget, where an excuse sits in the file waiting to cover the next offender).

## The two existing shadows

**`pages/admin/kravia-invoice.vue` — pinned, then RESOLVED by the sibling; ledger now empty.**

This one moved twice. At `8c6e91fa` that lane fixed the absence defect (the helper coerced with
`|| 0`, printing `kr 0,00` for an unstated amount) and delegated to the shared `nokAmountLabel`, but
left the method **declared** — its own comment said so. The page satisfied the rule while still
standing off the seam, so it was pinned here rather than double-fixed.

Then at `c4a4fa44` the same lane renamed it `priceLabel` → `invoiceAmountLabel` across all 11 sites,
delegation bytes unchanged. The collision is gone rather than documented: the page keeps its own
invoice-shaped formatter under a name that no longer collides with the mixin's.

**The guard reported that transition itself.** The stale-entry arm fired the moment the rename landed
— *"pages/admin/kravia-invoice.vue no longer declares `priceLabel` — delete this ledger entry"* — and
deleting the entry was the entire fix. That was the estate's last shadow, so `PINNED_SHADOWS` is now
`[]`, which is a better end state than the documented exception this file was trying to avoid.

Worth carrying: a **partial** rename of that kind would not have thrown. A missed call site falls
through to the mixin and renders `kr 206,80` where an invoice prints `206,80 kr` — it fails as a
silent restyle, which is the same class this guard exists to catch, one step along.

**`components/molecules/CustomerInfoModal.vue` — RESOLVED.** The sibling's comment calls this one
"already correct"; it was not. It guarded absence, but with an **ASCII hyphen** `-` rather than the
estate's em dash, and it formatted via a local `Intl` as `"206,80 kr"` where this admin's declared
format is the `kr ` prefix (`setCurrencyFormat({ prefix: 'kr ', suffix: '' })`). So it deviated twice.

Resolved by **deleting the local method** so the mixin's gated label runs. Kept the **em dash**
(`UNKNOWN_AMOUNT`, U+2014) — the mark already used by `utils/margin/money.js` and the Workforce, Meals,
Growth and Events panels for an absent hour, count or author. Two absence marks mean a reader cannot
tell "no amount" from "a dash somebody typed"; one mark, estate-wide, is the point.

Four mounted-DOM tests pin the result on the real component: absent → `—`, zero → `kr 0,00`,
20680 → `kr 206,80`, and the three are three different strings.

### LAND-TIME HAZARD on this file: it needs a real three-way merge

`components/molecules/CustomerInfoModal.vue` is edited by **two lanes**, in two non-overlapping places,
and neither commit contains the other's change:

| commit | change to this file | still present |
|--------|--------------------|---------------|
| this lane | deletes `priceLabel` (HEAD lines 329–340) + note | `calculateTotalRewards` |
| `c4a4fa44` (`L-PRICE-BYPASS-FIVE`) | deletes dead `calculateTotalRewards` (HEAD lines 302–312) | `priceLabel` |

That lane built its blob from `HEAD` plus only its own 11-line deletion and deliberately left the
working tree alone rather than sweeping an uncommitted change it did not own — the right call. The
consequence is that **an `ours`/`theirs` pick at land time silently loses one of the two deletions**.
Picking `theirs` puts the shadow back and reds this guard; picking `ours` resurrects the dead helper.
Both hunks are far apart, so a real three-way merge against the common base `e34977ac` combines them
without a conflict. Merge, do not pick.

## Planting proof — `plant-proof.sh`, five states

Re-run in full at 18:27–18:28, after the 16:57 kill, against the sibling's landed state. The script
cleans up on every exit path (`trap`).

| state | what | verdict |
|-------|------|---------|
| A | clean tree | GREEN |
| B | a planted component declaring `priceLabel` | **RED** |
| C | plant removed | GREEN |
| D | a ledger entry whose shadow is not there | **RED** |
| E | ledger restored | GREEN |

Both reds were checked for the **right reason**, not an incidental one:

- **B** failed on `every component that redeclares a gated money member…`, naming
  `components/molecules/ShadowPlantProbe.vue:13` and the remedy.
- **D** pinned `components/organisms/Product.vue`, which only *calls* `priceLabel` in its template.
  It failed **only** on the staleness assertion — so the call site was correctly never counted as a
  definition. That is the definition-vs-call distinction demonstrated on the real corpus rather than
  only in a fixture.

## Out of scope, but found

`formatDate` is shadowed by **9 components** (`CustomerInfoModal`, `OfferDocument`,
`SlideBusiestDay`, `dinehome`, `orders`, `settlements`, `surfboard`, `tripletex`, `offer/_code`). Same
class of defect — a component silently overriding a mixin member — but not money, and pinning nine
files in a money guard would bury the rule in noise. `GUARDED` is the mixin's money members only
(`priceLabel`, `wholeAmount`, `fractionAmount`; the latter two have zero shadows today).

## Suite

Full jest: **2754 passed, 0 test failures**, 117/118 suites. The single failing *suite* is
`lanes/L-JOURNEY-PORT-HARDCODED/portproof/port-resolution.spec.js` — another lane's Playwright spec
that Jest discovers because `lanes/` is not in `testPathIgnorePatterns`. It fails to load, not to
assert, and is not mine.

### Correction to the brief

I was told `test/journey-artifact-store.test.js` is a known red in every lane worktree. **It passed
here.** I ran in the shared checkout `/Users/svendaneel/okam/Web-modules`, whose basename is
`Web-modules`, and line 295 of that test asserts:

```js
expect(build.id).toMatch(/^Web-modules@[0-9a-f]{40}(\+dirty)?$/);
```

The literal `Web-modules` is hard-coded, so the test passes wherever the checkout *directory* is named
`Web-modules` and reds wherever it is not. The failure therefore depends on the checkout's **basename**,
not on being a worktree — a worktree named `Web-modules` would pass, and a non-worktree clone named
anything else would fail.
