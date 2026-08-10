# Review — whether the two-hundred-odd new tests can actually fail

Under review: `lane/growth-poweruser-tested` @ `fddb06c`, `lane/workforce-screens-tested` @
`aff616d`, `lane/meals-events-screens-tested` @ `5ed9664` — all off `7a378e4`, none on a trunk.
Reviewer: agent:L-READ-WHETHER-THE-NEW-TESTS-CAN-ACTUALLY-FAIL · 2026-08-07 · read-only; one
detached worktree (`Web-modules-wt/L-READ-CANFAIL`) checked out per branch in turn, `core` pinned
to `9626a561` (each tip's own gitlink) via the file-protocol fetch; removed after the run.

## Verdict

**Growth: APPROVE — the strongest of the three; every number re-derived and identical; but the
"equivalent mutant" label is the wrong category, and two new survivors exist (§2).**
**Workforce: APPROVE — kill counts re-derived clean, per-title falsifiability complete; but two of
the three "defended twice" survivors are provably separable, one by an executable probe each (§3).**
**Meals/Events: APPROVE WITH TWO CAVEATS — the committed instrument could not have supported its
own claim (no baseline, a crashed run counts as a kill, red test names never captured), so my
independent re-derivation is what now carries the counts; and the per-test half of the claim
("every test was checked against a mutation") is false on the committed evidence for 32 of 115
tests, which no lane instrument ever measured (§4).**

On the exit criterion "every test that survives every mutation a second reader can devise": at the
committed mutation sets, **zero growth arms, zero workforce titles and 32 named meals/events tests**
red under no mutation; my own devised mutations then added **two new growth survivors** (§2) and
**killed two workforce survivors the lane had classed equivalent** (§3). The one devised mutation I
aimed at the meals util was killed by the suite (§4).

Because a defect was found this evening in a sibling `mutate.js` (a multi-path argv collapse that
runs zero tests and certifies everything), **no kill count below is taken from any lane's own
output**. Every count was re-derived with my own instrument (`review-mutate.js`), which runs the
baseline first and aborts on a zero-test baseline, flags any mutation run that executed fewer tests
than the baseline, treats a crashed or empty run as INVALID rather than red, requires a *newly*
failed named test for RED, and restores from an in-memory byte copy asserted byte-equal in a
`finally`. No INVALID and no SHORT-RUN occurred anywhere across the three branches.

## 1. What "reproduces" means here

For each branch: the suite baseline was measured first (its total must be non-zero and its reds
must be exactly the recorded deliberate ones), then every committed mutation spec was re-applied
and re-run, then my own devised mutations — ones no lane tried — were applied and run, then
everything was byte-restored and `git status` checked clean.

## 2. Growth — reproduced exactly; the equivalence is mislabelled; two new survivors

**Baseline**: 41 arms — 38 green, 3 red, and the reds are exactly the three recorded
`THE DEFECT` arms. **Re-run of `mutate.py` (all 44 mutations)**: receipt regenerated
**semantically identical** to the committed `mutation-receipt.json` — `killed_by`, `survivors`
(empty) and `baseline_red` all equal — 38/38 green arms red under ≥1 mutation, 0 survivors, exit 0.
The runner itself is sound: single test path, in-memory restore with a post-run assert, no-op and
missing-anchor mutations abort the run.

**The `??` → `||` "equivalent mutant" is not equivalent — it is separable.** The recorded argument
is that the chain ends in `0` so both spellings agree "for every payload a backend actually sends
(one casing, not both)". The parenthesis is the entire load-bearing content. On the payload
`{ orderCount: 0, OrderCount: 7 }` — expressible in one line by the suite's own fetch fake —
`point[key] ?? point[pascalKey] ?? 0` answers **0** and `point[key] || point[pascalKey] || 0`
answers **7** (demonstrated in plain node). Nothing in the page, the wire client or the suite
enforces single-casing. The correct classification is **survivor excused by an unenforced
wire-shape assumption**, not equivalent mutant. Risk: negligible today (serializers emit one casing
per field); the label, not the code, is what should change — or one arm pinning mixed-casing
precedence closes it outright.

**Two survivors the lane did not find, both measured against the full 41-arm suite and restored:**

| devised mutation | result |
|---|---|
| `Math.abs(draft.currentX - draft.startX) < 24` → `<= 24` (the click/drag boundary itself) | **SURVIVED** — 0 newly red, 41 tests run |
| `point[key] ?? point[pascalKey] ?? 0` → `point[pascalKey] ?? point[key] ?? 0` (casing precedence swapped) | **SURVIVED** — 0 newly red, 41 tests run |

The first: the drag tests sit at 20px and 40px, so the 24px boundary — the very rule the lane once
caught itself testing unreachably — is still unpinned at its exact value. The second proves the
`getPointValue` blind spot is an equivalence *class*, not one mutant: any reordering
consistent with the single-casing assumption survives, separable by the same payload
(camel-first answers 0, Pascal-first answers 7). Neither is grave; both belong in the receipt.

## 3. Workforce — clean counts, complete falsifiability; two of the three "defended twice" are separable

**Re-derived across all ten committed spec files** (95 mutation entries — the return's "71" is an
undercount of its own committed evidence; nothing worse): baselines 21+17+15+25+18 = **96 tests,
exactly one red — the deliberately failing DEFECT test** on the timesheets page; **90/95 RED, 5
SURVIVED, 0 invalid, 0 short runs, 0 unappliable anchors**. The survivors are exactly the five the
lane's own account predicts: M01, P17, D06 ("defended twice") and D10, D16 (the mis-aimed originals,
kept in the spec, superseded by D10b/D16b which red). All pairs and re-aims red: M19 1/1, P17b+P18
2/2, D10b+D16b 2/2, C22 1/1, shell 6/6. **Per-title kill coverage is complete**: every one of the
83 distinct green test titles reds under at least one committed mutation (the shell suite is 6
titles × 3 pages; its six mutations edit all three pages together, which is the honest way to kill
a rule defended per-page). Two nits: P18-v1 reds via a test title its `expect` string no longer
matches (a stale expect, not a stale kill), and jest title-matching means a same-titled arm on two
pages is killed as one — immaterial here because the shell mutations edit every page at once.

**The three "defended twice" claims, attacked as instructed:**

- **M01 (payroll gate removed from init) — genuinely equivalent, verified.** `load()` has exactly
  one caller (init, `workforce-timesheets.vue:233`) and its own first-line gate re-tests the same
  `canApprovePayroll` (`:237`). Removing init's copy composes to the identical observable behaviour
  on every path. M19 removes both copies while preserving `!this.storeId` — a clean full removal of
  precisely that defence, and it reds. This pairing is what the pattern should look like.
- **P17 (a vanished week keeps its roster) — NOT equivalent; separable, and I proved it
  executable.** The second defence (`selectedPublication`'s find-miss → null, `:131`, plus the
  recipients panel's idle gate) covers only the reload on which the week vanished. The removed
  block also cleared `recipients` and `selectedId`; without it they survive the vanish, and **a
  later reload that brings the same id back renders the stale roster as current, with no fresh
  `GetRecipients` read**. My probe (vanish → return sequence, written against the lane's own
  harness) **passes on the unmutated page and reds with P17 applied**. P17b ("invented back into
  the list") is, as the brief suspected, *another way to break it* — it fabricates a row rather
  than removing the second defence. Severity: low (needs vanish-then-return across two reloads),
  but the equivalence claim is false and the honest kill exists.
- **D06 (refresh keeps the previous answer up in flight) — NOT equivalent; separable, proven the
  same way.** The end-state really is defended twice (the catch also nulls `rows`,
  `workforce-delivery.vue:136`) — but the in-flight half of the rule, which is the sentence the
  mutated comment itself states, is not: `WorkforceDeliveryPanel` renders the previous answer fully
  while `loading` merely relabels the refresh button. My probe (a hanging `GetNotificationFailures`,
  asserting the page stands down to UNKNOWN mid-flight) **passes unmutated and reds under D06**.
  The lane's "alternative mutation" defence covers the failure end-state only.

Both probes are single-file temp tests reusing the lanes' own mocks; both were removed with the
worktree, and both sources restored byte-equal after each application.

## 4. Meals/Events — the claim outran its instrument; re-derived counts now carry it

**The committed evidence could not support "70 of 71 red" on its own.** The lane's `mutate.js`
(the same file already flagged today for its `git checkout --` restore, though at a committed tip
that restore is byte-asserted and safe): **runs no baseline at all**; decides RED by
`/Tests:.*\d+ failed/.test(out) || run.status !== 0` — so **a crashed jest, a config error or a
zero-matching pattern (jest exits 1 on "no tests found") counts as a kill**; and captures red test
names with a `✕` regex that can never match under `--silent`, which is why every committed
`*.results.json` entry reads `"reddened": 0, "first": []` — **internally inconsistent as
committed**, RED verdicts with no named red test anywhere.

**Re-derived with my instrument** (baselines first, named newly-red tests required, crashes
INVALID):

| spec | claimed | re-derived | baseline |
|---|---|---|---|
| `mut-lines` (component) | 14/15 red | **14 RED, 1 SURVIVED** — the claimed survivor exactly | 29 tests, 0 red |
| `mut-page` (statements page) | 26/26 red | **26/26 RED** | 49 tests, 0 red |
| `mut-offer` (guest offer page) | 30/30 red | **30/30 RED** | 37 tests, 0 red |

**70/71 red reproduces exactly** — no INVALID runs, no short runs, every RED carries named newly-red
tests. The counts were right; the instrument could not have known.

**But the commit's own sentence "every test was checked against a mutation applied to the source
and reverted" does not reproduce on the committed evidence.** My kill map shows **32 of the 115
tests never red under any committed mutation** — 11 of 29 on the component suite, 18 of 49 on the
statements page, 3 of 37 on the offer page (named in `review-meals-rerun` and reproducible from the
kill map; among them: *"a figure the server did not state is a dash and can never be misread as
zero"*, *"every figure on screen came off the wire; the page sums nothing"*, *"a line the server
sent no member reference for is never given one here"*). Unlike Growth (which committed a per-arm
kill map) and Workforce (whose committed set kills all 83 distinct titles), the Meals/Events lane
measured per-mutation kills only; per-test falsifiability was asserted but never measured, and on
the committed mutation set it is false for those 32. Many are likely killable by mutations to
`statement-view.js` or to the fetch wiring that nobody wrote — that is the follow-up this finding
names, not a claim the tests are vacuous.

**The survivor ("member column falls back to the allocation id") is the one claimed equivalence of
the three that fully holds.** The fallback `{{ line.memberDisplayRef || line.allocationId }}` sits
inside `v-if="line.hasMemberRef"`; `hasMemberRef` is `memberDisplayRef !== null` computed in
`utils/meals/statement-view.js:79` from `text()` (`:42-46`), which maps null, undefined, empty and
whitespace-only to `null` — so inside the branch the value is always a non-empty string and
`x || y` is `x`. Provenance holds on every product path: the component's only consumer is
`pages/admin/meals-statements.vue:90`, whose statement is built by `readStatement` (`:269`), and
the component suite's fixtures also pass through the real `readStatement`. Equivalent — with the
caveat that the equivalence rests on a single-consumer invariant a second consumer could silently
break; the component prop is not self-defending.

**Scoping note, plus one devised mutation none of the lanes tried:** all 71 mutations target the
three `.vue` files; `statement-view.js` — the module that holds "the one rule this file exists to
hold" — was never mutated. I mutated it (`text()` loses its `.trim()`, so a whitespace-only member
reference becomes a stated one) and **the suite killed it**: *"a reference that arrived as blank
space is unknown, not an empty column"* reds, 1 newly red on the full 29-test component run,
restored byte-equal. My prediction was that it would survive; it did not — evidence for the suite's
teeth, and it softens the scoping note: the util's rules are genuinely exercised through the
component fixtures that pass through the real `readStatement`.

## 5. `D-HOW-A-KNOWN-DEFECT-IS-PINNED` — keep the Meals/Events convention

**Keep green pins (Meals/Events); convert Growth's three standing reds.** Both conventions were
executed well, but this estate's own machinery decides it:

- **A standing red destroys exit-code gating estate-wide.** Every landing lane this week gated on
  "`npx jest --ci`, exit 0, no FAIL line" — the growth branch cannot pass its own tier, and every
  future instrument must carve out the expected reds. I paid this cost twice tonight in my own
  audit: `mutate.py` needs a `killable` set to exclude the three reds from every kill decision, and
  my workforce sweep had to subtract the one deliberate baseline red from every one of 95 runs. An
  expected-red baseline is exactly the acclimatization that lets a real regression hide among the
  expected.
- **A green pin reds at the only moment somebody should look at it** — when the behaviour changes
  (fix or drift) — and it forces the fixer to rewrite it into the true assertion, because their fix
  reds it. The Meals/Events pins are exemplary: `THE DEFECT:` prefix, the wrong sentence asserted,
  *and* the unreached correct diagnosis asserted beside it, so the pin documents both halves.
- **What green pins lose — undeniability — the plan already supplies.** A green suite says nothing
  is owed, so the convention must be: every `THE DEFECT` pin carries a Flag in the plan ledger, and
  the pin comment names the flag. Debt lives in the ledger; the tier stays a gate.

Ruling for the decision: green pins asserting today's behaviour, `THE DEFECT:` prefix, a paired
plan Flag, and the both-halves assertion style from `offer-code-guest-page.test.js:413-474` as the
house pattern. Growth's three red arms should be rewritten to that pattern when the decision lands.

## 6. Constraints and hygiene

C1-C4, C6, C7: test-only branches, no migrations, no money writes, no statutes, no logging — not in
play beyond noting the pins assert redaction-safe strings. C5: nothing here is acceptance; these
suites prove behaviour, not capability. Worktree `Web-modules-wt/L-READ-CANFAIL` (one, reused per
branch by detached checkout): every mutation and probe applied was restored byte-equal and
`git status` verified clean before each branch switch; temp files (`review-mutate.js`, two
separation probes, three rerun logs) lived only in the worktree and left with it; `rm -rf` +
`git worktree prune`; no commit, push, rebase or branch move; `web-livewalk`, containers and ports
untouched.
