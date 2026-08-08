# Review — tranche one, read before it touches the trunk

Under review: `c65b19c` (canonical mutation runner), `1c607fd` (register), `32518da` (Wolt labels),
`6026d35` (flag census) — off trunk `d4c308e`. Reviewer: agent:L-READ-TRANCHE-ONE · 2026-08-07 ·
read-only; one throwaway worktree (`Web-modules-wt/L-READ-T1`, composed and removed), `core` pinned
`9626a561`. I am the gate for a parallel landing lane, so the verdict line is first.

## Verdict

**Land `1c607fd`, `32518da` and `6026d35` — all three clean (one record correction for the Wolt
lane, no code change). HOLD `c65b19c`: the runner's headline claim is true and proven, but its
verdict logic certifies kills for runs that executed nothing, its own pin blesses that behaviour,
and everything in this program is about to trust its RED lines. The fix is small and named below.**
The three land without it: their merges are clean and their files are disjoint from the runner's
(the composed four-branch tier is 170/4080/0; subtracting the runner's own 1 suite / 13 tests is
arithmetic, not a new seam). Composition in the plan's order is proven green.

## 1. The canonical runner — what it defeats, and the hole it still has

**Defeated, each verified:**
- **`git checkout --` restore.** The restore writes the in-memory buffer (`mutate.js:39-41`),
  nothing in the file invokes git (pinned statically), the byte-compare-after-restore halts the run
  (`:101-105`, pinned by name), and the pin's strongest arm *reproduces the destruction* with the
  historical restore swapped in and asserts the work is gone and the guard halts. A standing sweep
  (`test/mutation-runner-restore.test.js:244`) reds on any future lane runner that restores from
  git — it is the seam-1 guard the landing plan already accounts for.
- **Anchor ambiguity.** Zero-or-many anchors → `NOT-APPLIED`, never a pass (`:72-77`, pinned).
- **Copy-at-any-depth.** Root found by `package.json` walk, pinned at three depths.
- **The argv-collapse false green in its historical form.** One `JSON.stringify`-quoted test path
  per entry; a multi-path string becomes a no-match pattern and jest exits non-zero — so the
  specific 2026-08-07 false-green mechanism cannot recur *in that shape*. But see below: it
  resurfaces as a false red.

**Not defeated — demonstrated live, both directions, on the unmodified runner:**

```
MUTATE_TEST_COMMAND=false  → RED   (0) …  "2/2 mutations reddened the suite"
MUTATE_TEST_COMMAND=true   → GREEN (0) …  "SURVIVED [STILL-GREEN]"
```

The judgment is `failed = /Tests:.*\d+ failed/.test(out) || run.status !== 0` (`:108`) — **any
non-zero exit is a kill, any zero exit is a survivor, and nothing checks that a single test ran.**
A typo'd `test` path ("No tests found", exit 1) certifies every mutation RED — the malformed-anchor
defect's exact signature. A zero-test exit-0 run (jest `--passWithNoTests`, or .NET's own
documented repo-root trap) certifies a survivor. The pin does not cover either; worse, one arm
(*"puts the file back even when the suite command cannot be run at all"*) **asserts `RED` on a
spawn failure** — the false kill is pinned as correct behaviour. The fourth flagged defect (.NET)
is this same hole plus a cosmetic one: the `✕` name counter is jest-only, so `reddened` is 0 for
xunit; verdicts ride exit codes, which for .NET are only trustworthy when tests actually ran.

**The exact change (rule, not edit):** in `test/support/mutate.js`, a run must prove it executed
tests before it can be judged — parse an executed count (jest `Tests: … total`, xunit
`Passed!/Failed! … Total:`), emit a fourth outcome `INVALID-RUN` for spawn failures and zero-test
runs in either exit direction, and never count `INVALID-RUN` as RED or STILL-GREEN. In the pin:
change the spawn-failure arm to expect `INVALID-RUN`, and add two arms driving `MUTATE_TEST_COMMAND
= true` / `false` expecting `INVALID-RUN` for both. Until that lands, the runner's restore is
trustworthy and its kill certificates are not.

Its own lane's claims remain true as written — "can no longer delete the work it is testing" is
proven — the hole is in what the lane did not claim but the estate will assume.

## 2. The register — the kept guard is load-bearing, verified as claimed

The corroboration rule (`utils/workforce/pos-clock-state.js:71-89`) is read and right: declared
`AttendanceException` first; **no folded id → EXCEPTION whatever the label claims** (`:81`); a
definite Open/Closed needs a folded session *and* the server's word; anything else UNKNOWN with
both buttons live. The author's argument for keeping the no-id guard the corrected wire no longer
needs — independent deploys, a till meeting a pre-`4d103ca8a` server — checks out empirically:
**removing `:81` reds exactly 2 of 25 tests**, and the screen arm (*"clocking out with nothing open
never reads as clocked in"*) exists at `d4c308e` with the old server's body verbatim
(`{clockSessionId: null, sessionState: 'Open', …}`, `d4c308e:test/workforce-pos-clock.test.js:277`).
The second red is the pre-existing unit arm in its renamed form. Restored byte-equal. **Clean.**

## 3. The Wolt labels — the screen is exactly right; the record miscounts the backend

I verified the allowlist against the backend myself, as instructed, and **the lane's account of the
backend is wrong in three details** — while the shipped screen is nonetheless exactly correct:

- `statusesToSave` (`Services/WoltService.cs:502-514` at backend trunk `057c390ad`) has **ten**
  members, not nine — **`DropoffCompleted` is IN it** (`:511`), and has been since `6454f3c71`
  (PR #23); the backend did not move under the lane. The commit message's "DropoffCompleted is
  declared but absent from the allowlist" and the code comment at `plugins/global-mixin.js:215`
  ("declared by the enum, absent from `statusesToSave`") are false.
- Therefore **eleven of fifteen** `WoltStatus` members can reach the column (`NotSet` at row
  creation, `OrderService.cs:419`, plus the ten), and **four** get no word — `PickupEtaUpdated`,
  `LocationUpdated`, `DropoffEtaUpdated`, `HandshakeDelivery` — not "ten reach, five wordless".
- The four truly cannot write the column: the gate at `WoltService.cs:515` ignores any status
  outside the list regardless of event handling. Verified.

**Neither failure direction the brief feared occurs.** The eleven keys cover the reachable set
precisely — because the label the lane thought was a carried courtesy (`DropoffCompleted`) is in
fact load-bearing. No raw enum can render (`hasOwnProperty` fallback to the waiting key,
`global-mixin.js:305-308`); the four unreachable members have no state-specific invented German
(the fallback is the generic waiting word). Wire continuity holds: the old switch keyed on the same
string names. **The exact change: correct the comment at `plugins/global-mixin.js:215` and the lane
record's nine/ten/five counts. No code change; behaviour lands as is.**

## 4. The census — the three calibration verdicts are right, and nothing overclaims

Re-verified independently: `F-CLOCKOUT-ANSWERS-OPEN` fixed (`SessionStateOf` at backend
`057c390ad` switches on `result.Outcome`, not `closedUtc`); `F-FISCAL-RECEIPT-PRINTS-AN-ENGLISH-ENUM`
fixed (`PaymentTenderLabels` carries `CompanyAccount`, routed at `EscPosReceiptBuilder.cs:156` and
the XZ builder); `F-MIXIN-LABELS-CANNOT-TRANSLATE` fixed **for exactly what the flag names** — the
flag's body names `paymentTypeLabel:82`, `deliveryTypeLabel:97`, `orderStatusLabel:134`, all three
resolving keys at `d4c308e`; the still-literal `woltDeliveryStatusLabel` at that commit is a
different surface (OrderCard, not the receipt the clears_when scopes) and is fixed by this very
tranche's `32518da` — a coherence worth noting, not a census error. The one `reproduces` row
spot-verified (`utils/meals/admin-client.js:181` is a GET; no enrolment POST caller). Counts are
honest everywhere — 7 measured, 377 named as the blocked remainder; the scripted-sweep negative
finding is itself measured (0/3, 1/3, non-discriminating) rather than asserted. One cosmetic
staleness: it cites `.gitignore:119` for the `artifacts/` rule, which sits at `:111` at the tip.
**Clean.**

## 5. Composition

Merged in the plan's order in the throwaway worktree: `c65b19c` (ff) → `1c607fd` → `32518da` →
`6026d35`. **All merges clean; composed tier 170 suites / 4080 / 0**, agreeing with the landing
plan's recorded steps (4007 → 4020 → 4024 → 4080 → docs-only). My brief quoted the step tiers as
"4007 → 4020 → 4024" — that transcription stops before `32518da`'s +56; **the brief was short, the
branches and the artifact agree**, and 4080 is the number a landing should expect at T1's end. If the runner is held per §1, the
other three compose identically — their file sets are disjoint from the runner's — with the tier
arithmetic 169 / 4067 / 0 (not separately run; stated as arithmetic).

## Hygiene

Probes: two command-stub runner invocations on a scratch file (removed), one guard-removal mutation
on `pos-clock-state.js` (restored byte-equal, asserted). Worktree removed with `rm -rf` +
`git worktree prune`; no commit to any trunk, no push, no branch moved; `web-livewalk`, containers,
ports untouched; load gated separately before the tier (4.67).
