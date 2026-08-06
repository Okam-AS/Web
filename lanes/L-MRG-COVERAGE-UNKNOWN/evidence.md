# L-MRG-COVERAGE-UNKNOWN — evidence

brief: 17019a53 · actor: agent:L-MRG-COVERAGE-UNKNOWN · verdict: built

## 0. The brief's claims, checked before building

| claim in brief | observed | verdict |
| --- | --- | --- |
| frontend integration is `3cd2570` | `git rev-parse HEAD` = `3cd25709ec6af4806e4683e666f44814ff8e441a` | CORRECT |
| `statement-view.js` reads an absent waste block as "nothing recorded" | `utils/margin/statement-view.js:318-332` at HEAD: `const block = waste && typeof waste === 'object' ? waste : {}` then `longOrNull(block.entryCount) \|\| 0`, with a doc comment stating "An absent block reads as 'nothing recorded' ... never as unknown: the server always sends it" | CORRECT |
| the panel affirmatively claims zero waste | `MarginCoveragePanel.vue:132` at HEAD: `v-if="!coverage.waste.entryCount"` -> `mrgs_waste_coverage_none` = "Ingenting er registrert som svinn i dette vinduet." | CORRECT |
| `readWasteEntries` thirty lines below returns null for an absent response | same file, line 342: `if (!response \|\| !Array.isArray(response.entries)) { return null; }` — 24 lines below, not 30, but the substance holds: one file decided absent-vs-empty in two opposite directions | CORRECT (line count off by 6) |
| "the backend half does not exist on this branch" | NOT CHECKABLE FROM HERE — this is the frontend repo; there is no server source in it. Recorded as unverified rather than confirmed. It does not change the fix: web and API deploy independently, so the absent-block case is permanent regardless of whether the backend has landed. | UNVERIFIED, MOOT |

Existing test `test/margin-waste.test.js` line 85 **asserted the defect** —
`'an absent summary block reads as nothing recorded rather than as unknown'`. It was rewritten, not deleted.

## 1. What changed

| file | change |
| --- | --- |
| `utils/margin/statement-view.js` | `readWasteSummary` returns `null` for an absent or non-object block; every `\|\| 0` removed |
| `components/admin/margin/MarginCoveragePanel.vue` | three render branches instead of two, new `wasteUnknown` computed, null-guarded per-reason count |
| `translations/no.ts`, `en.ts`, `de.ts` | one new key each: `mrgs_waste_coverage_unknown` |
| `test/margin-waste.test.js` | the defect-asserting pin rewritten; 3 tests added |
| `test/margin-statements-page.test.js` | `mountPageWithCoverage` (real coverage panel, not a stub) + the three-world block |

## 2. The distinction, in the words a venue reads

| world | wire | rendered (`no`) |
| --- | --- | --- |
| waste recorded with a value | `waste: { valuedMinor: 3000, entryCount: 2, ... }` | `Registrert svinn: kr 3000.` |
| waste recorded AS NONE | `waste: { valuedMinor: 0, entryCount: 0, byReason: [] }` | `Ingenting er registrert som svinn i dette vinduet.` |
| **no waste block at all** | the `waste` key is never set | `Vi fikk ingen svinntall for dette vinduet. Det er ukjent — det betyr ikke at ingenting ble kastet.` |

The **middle world is the non-vacuity control**: a surface that answered "unknown" to everything
would fail `WORLD 2`, and `the three worlds are three different sentences, not two` asserts
`new Set(said).size === 3` over the three rendered strings.

Assertions are **by rendered value**, not by element existence, and the page-level block resolves the
**real Norwegian dictionary** rather than the key-echoing `$i` mock the rest of that file uses — two
states that echo two different keys can still be one sentence once the dictionary resolves them.

## 3. Driven through the page, not through a formatter

The three worlds live in `test/margin-statements-page.test.js`, mounted with
`mountPageWithCoverage`, which uses `mount` (not `shallowMount`) with `MarginCoveragePanel` left
**unstubbed** and the other three panels stubbed. The wire response is delivered through the page's
own `GetCoverage` client call, so the path under test is
`fake wire response -> page.loadCoverage() -> readCoverage() -> readWasteSummary() -> panel render -> DOM text`.
`readWasteSummary` is never called directly in that block. `shallowMount` would have asserted against
a stub's props — the shape a sibling found asserting nothing.

## 4. Coercion, stated field by field

`readWasteSummary` **coerces nothing**. The removed expression was `longOrNull(x) || 0`, which is
`Number(null)` wearing a hat: `longOrNull(null)` is `null` and `null || 0` is `0`, so a total the
server withheld printed as a confident `kr 0`.

| input | old | new |
| --- | --- | --- |
| block absent (`undefined`) | `{0, 0, 0, []}` | `null` (unknown) |
| block `null` | `{0, 0, 0, []}` | `null` (unknown) |
| block not an object (`'none'`, `0`, `false`) | `{0, 0, 0, []}` | `null` (unknown) |
| field `null` | `0` | `null`, rendered `—` |
| field `undefined` / key missing | `0` | `null`, rendered `—` |
| field `''` | `0` | `null`, rendered `—` |
| field `0` (a real zero) | `0` | `0` — unchanged, still a zero |

Pinned in `test/margin-waste.test.js`:
`a withheld FIELD inside a present block stays null and is not coerced to zero` checks `null`,
`undefined`/missing and `''` **separately**.

Second coercion found and closed in the same shape: the panel rendered `{{ number(line.entryCount) }}`,
and `Intl.NumberFormat().format(null)` is the string `"0"` — a per-reason count the server withheld
would have printed as a counted zero. Now guarded `=== null`, matching the two guards already on the
panel (lines 70 and 117 at HEAD). Pinned by
`a per-reason line with no count shows the unknown mark rather than a counted zero`.

Falsiness is deliberately NOT used for the unknown branch: `!0` is `true`, and a genuine count of zero
is the one case that must not be swallowed. The computed reads
`this.coverage.waste === null || this.coverage.waste.entryCount === null`.

## 5. Mutation proof — `mutation-proof.py` / `mutation-proof.txt`

Two mutants, because MUTANT-A alone would not show whether the **rendered** distinction is pinned or
only the read model's return value. The script holds both originals in memory and rewrites them in a
`finally` block, so the tree is restored even on an abort.

```
BASELINE   (tree as built)                                  -> GREEN   64 passed / 64
MUTANT-A   (read model: absent block becomes zeros)         -> RED      5 failed / 64
RESTORE-A  (tree as built)                                  -> GREEN   64 passed / 64
MUTANT-B   (panel: absent block falls into the zero branch) -> RED      3 failed / 64
RESTORE-B  (tree as built)                                  -> GREEN   64 passed / 64
MUTATION PROOF: PASS
```

MUTANT-A is the **exact code that shipped before this lane** (`const block = ... : {}` with the three
`|| 0`). It reds:

- `... WORLD 3 — NO waste block at all: the page says it could not tell, and claims no zero`
- `... the three worlds are three different sentences, not two`
- `readWasteSummary › an absent summary block is UNKNOWN, never an empty summary`
- `readWasteSummary › a withheld FIELD inside a present block stays null and is not coerced to zero`
- `MarginCoveragePanel — the waste bucket › a response with NO waste block says unknown, ...`

MUTANT-B leaves the read model correct and only collapses the panel branch
(`v-if="false"` on the unknown paragraph, `!coverage.waste || !coverage.waste.entryCount` on the zero
one). It reds the three rendered-text assertions and leaves the two read-model unit pins green — which
is the point: the render is pinned independently of the reader.

Full transcript: `lanes/L-MRG-COVERAGE-UNKNOWN/mutation-proof.txt`.
Rerun: `python3 lanes/L-MRG-COVERAGE-UNKNOWN/mutation-proof.py` (exit 0 = PASS).

## 6. Suites run (jest only; no container, no journey suite)

| command | result |
| --- | --- |
| `npx jest test/margin-waste.test.js --coverage=false` | 26/26 pass |
| `npx jest test/margin-statements-page.test.js --coverage=false` | 38/38 pass |
| `npx jest test/margin-statement-view.test.js test/margin-statement-components.test.js` | 46/46 pass |
| `npx jest test/margin- --coverage=false --runInBand` (21 suites, the whole module) | **443/443 pass, 21/21 suites** |
| `npx eslint` on the 7 touched files | 0 errors, 3 warnings |

The 3 eslint warnings are `indent` on `nav_group_modules` at `no.ts:715` / `en.ts:698` / `de.ts:698` —
**pre-existing at HEAD**, outside both diff hunks in those files (`git diff -U0` shows my line at
`+3633` and a sibling's block at `+3711`; line 715 appears in neither). Not touched.

No unexplained failure occurred, so there is nothing to report under the
"failure that does not reproduce" rule. `test/journey-artifact-store.test.js` was not run (this is the
main checkout, not a worktree, and it is outside the blast radius).

No container was started. The playwright journey suite was not run. No ref was moved, nothing was
pushed, no migration was authored. `grep` confirms no `test/e2e/**` spec references
`waste-none`, `waste-total`, `coverage.waste` or `readWasteSummary`, so no browser journey depends on
the hooks that changed.

## 7. Hook-collision hazard found and avoided

`MarginWastePanel.vue:18` already owns `data-test="waste-unknown"` for its own failed read, and **both
panels render on `pages/admin/margin-statements.vue` at once**. Naming the new paragraph
`waste-unknown` would have put two nodes behind one hook — the exact mistake `MarginCoveragePanel`
already documents at lines 22-27 (`coverage-window-percent`, NOT `coverage-percent`, because "sharing
one hook made a probe resolve whichever the DOM ordered first"). The new hook is therefore
**`coverage-waste-unknown`**, with the reason written at the call site.

**Pre-existing, NOT fixed, flagged only:** `data-test="waste-row"` is *already* shared by
`MarginWastePanel.vue` and `MarginCoveragePanel.vue`, so on the live page a `waste-row` probe is
ambiguous today. Both suites mount the panels in isolation, so neither can see it. Out of this lane's
scope and in files siblings may hold; recorded here rather than changed.

## 8. Files touched by this lane

Mine, clean before I started:

- `utils/margin/statement-view.js`
- `components/admin/margin/MarginCoveragePanel.vue`
- `test/margin-waste.test.js`
- `test/margin-statements-page.test.js`
- `lanes/L-MRG-COVERAGE-UNKNOWN/` (`evidence.md`, `mutation-proof.py`, `mutation-proof.txt`)

Already dirty from a sibling when I arrived — **one hand-edited line added to each, no bulk edit, no
regex over the file, nothing else in them read or changed**:

- `translations/no.ts` (+1 at line 3633)
- `translations/en.ts` (+1)
- `translations/de.ts` (+1)

Nothing was committed. Nothing was cleaned that I did not dirty. No shared ref moved.
