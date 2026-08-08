# L-READ-THE-TEST-WRITING-LANES — the sixty-five mutation claims, checked by re-application

Reviewer: `agent:L-READ-THE-TEST-WRITING-LANES`, brief `1e008b13`. Method: fresh worktrees, a fresh
harness (not the lanes' own), mutations re-applied one at a time and restored byte-for-byte, failing
test **names** captured so every red could be matched against the claimed reason. Nothing was
committed, merged, rebased, pushed or moved; both owner checkouts and both sibling lane worktrees
untouched.

## Verdict

**The mutation evidence of both lanes is genuine.** Sixteen mutations re-applied across the two
lanes (twelve frontend, one shared-parser probe, three backend runs); every one behaved exactly as
its ledger claims, with failure counts and failing-test names matching row for row. Both reported
survivors are honest. **No sampled mutation reds for a wrong reason, and no surviving vacuity was
found.** Three *claims about* the evidence are corrected below — none changes a verdict, but one was
falsified by experiment and should not be quoted onward.

---

## 1. The till lane — `preserve/till-money-tests` @ `7aaee5b` — CLEAN

Fresh worktree, core pinned `9626a561`, baseline **6 suites / 149 / 0** (matches). Ten of the 45
mutations re-applied from the lane's published `mutate.py` strings (the harness itself ships in the
lane directory, so every row is reproducible verbatim — note this for §2.4):

| id | claim | got | ledger | failing test = claimed reason? |
|---|---|---|---|---|
| M3.6 | blank payer line | RED 1/18 | 1 | yes — five unmapped media, `label.trim()` non-empty |
| M5.3 | return priced off a listed price | RED 1/33 | 1 | yes — tax 12 pinned; neighbour pins 7→25 fallback |
| M2.4 | stale reason on a zero-difference Z | RED 1/23 | 1 | yes — counted=expected, reason still selected, asserts `'None'` |
| M6.3 | last split payer's øre | RED 2/25 | 2 | yes — 3203 øre exact + three shares sum to 10003 |
| M1.3 | exact tender refused | RED 2/20 | 2 | yes |
| M2.2 | tolerance gates the explanation | RED 5/23 | 5 | yes — incl. "one øre short still needs an explanation" |
| M4.4 | refund cap dropped from the button | RED 1/30 | 1 | yes |
| M4.9 | sort deleted (claimed survivor) | **GREEN** | survived | — |
| M4.9b | comparator reversed | RED 3/30 | 3 | yes — incl. the ordering test itself |
| M6.E | redundant early return deleted (claimed equivalent) | **GREEN** | equivalent | — |

### The `seatBuckets` survivor — both halves of the argument verified

**Half 1 (language guarantee): true.** Probed on the node jest runs under (v24.15.0): integer-like
keys come out of `Object.keys` ascending regardless of insertion order, written as numbers or as
strings; `'1.5'` and `'02'` do **not** get that ordering. **Half 2 (the test is not vacuous): true.**
A reversed comparator reds 3 tests including the ordering test, whose fixture arrives seats 3, 1, 2
and asserts `[1, 2, 3]` — under any future structure that leaks insertion order (a `Map`, an array
push) it bites. Keeping the test with the redundancy named in-file (lines 200–205) is the right
treatment.

**One footnote the lane's argument omits**: the equivalence premise says seats are "positive
integers 1..20, set from `seatChips`", but `SplitBillModal.vue:270` seeds `seatAssign` from the
**wire's** `line.seatNumber` verbatim. Every integer seat — any size — still gets the ascending
guarantee, so the mutant stays equivalent for everything the POS domain can produce; only a
non-integer or leading-zero-string `seatNumber` off the wire would make the deleted sort observable.
Footnote, not refutation; no change required.

The per-file `global.crypto` polyfills in the till suites are expected residue of
`lane/the-guard-stops-crashing-on-the-case-it-guards` @ `1e48b95` and are not a finding here.

---

## 2. The documents lane — frontend `c53e344`, backend `8c692457c` — GENUINE, three claims corrected

The brief cites `4541e98` / `6859bdaa6`; those are the **writer's** commits. The mutation ledger
belongs to the finishing lane, whose repairs are the later commits `dd5a99b` + `c53e344` (frontend)
and `8c692457c` (backend). Reviewed at the tips, where the repairs live. Baselines: frontend
**4 suites / 117 / 0**, backend `CartValidateGateTests` **19/19** (both match).

Re-applied: M11 → **GREEN** as the ledger itself reports (the one honest non-red of the 20);
M11b → RED 1/42 on the retitled arm; M1 → RED 1/32; M2 (reconstructed, see §2.4) → RED 2/32;
M13 → RED 2/21; MB6 → RED 1/18/19 on exactly `A_blocked_customer_is_refused_whatever_else_is_in_order`;
plus the two probes below. All for the claimed reasons.

### 2.1 The `parseInt` retitle — the replacement pins something real

`parseInt(selectedAdminStore, 10)` with the radix dropped: **green**, confirming ES5 made the octal
claim inert — the lane's survivor report is honest. The replacement arm is **not** equally free:
mutating the line to keep localStorage's string reds it (`'08'` → asserts `8`, `typeof 'number'`,
`not.toBe('08')`), and string-vs-number is load-bearing because `selectedAdminStore` is compared
against numeric `store.id`. **Residue, rule**: the *describe* title at
`test/store-cart-state.test.js:436` still reads "…and the base-10 that stops 08 becoming 0" — the
exact claim the lane's own repair debunks two lines into the arm. Exact change: retitle the describe
to drop the base-10 clause (e.g. "Load — three separate localStorage keys, and the number the admin
surface compares"). Cosmetic; no assertion depends on it.

### 2.2 Defect C — the deleted duplicate parser: dedup real, one justification falsified

**The shared parser is genuinely on the path**: `statement-client.js:56` imports `fileNameFrom` from
`api-client.js`, `:107` calls it on the product path; breaking the shared extended-form branch at
the tip reds the meals suite 2/21. **The two reds are not new tests dressed as recovered coverage**:
both failing arms ("READ off Content-Disposition — plain and RFC 5987 forms", "malformed extended
filename falls back") exist verbatim at pre-dedup `bf3e553`; the new stub arm is *not* among the
failures (correct — it stubs the parser to prove routing, and its `Object.defineProperty` interception
does distinguish "routes through the export" from "re-forked a copy").

**Corrected claim 1 — "character-identical" is false by one comment line.** At `4541e98` and
`bf3e553` the exported copy carries `// RFC 6266: filename*=UTF-8''… wins over the plain…` inside
the function body; the private copy does not. Every executable line is byte-identical, so the
deletion is behaviour-safe — but the safety proof is the identical executable text plus the
behaviour arms, not the literal wording of the commit and ledger.

**Corrected claim 2 — falsified by experiment.** The ledger: breaking the shared parser "could not
have reddened the meals suite at all" pre-dedup. Applied at `bf3e553`: **1 failed / 21** — the old
drift-tripwire arm called the shared export directly and caught it. What genuinely could not red
before are the two ExportCsv *behaviour* arms (both passed under the same mutation pre-dedup); the
recovered coverage is real, the "at all" is not. Do not quote the ledger sentence onward.

**Bookkeeping**: ledger row M5's file column ("plain `filename=` beats RFC 5987" in
`statement-client.js`) is stale at the tip — that code now lives only in `api-client.js`, so the row
cannot be re-applied as written. The protection survives: a plain-first precedence mutation in the
shared parser at the tip reds 1/21 through the both-forms-present world (`test:189`).

### 2.3 Defect B — the `if (id != null)` vacuity repair: proven in both directions

At `8c692457c`, `Assert.NotEmpty(BlockedUsers.Ids)` precedes an unconditional refusal drive.
Emptying `BlockedUsers.Ids`: repaired shape **RED 1/18/19**; the inherited `6859bdaa6` test shape
under the same emptied list **GREEN 19/19** — the negative control disappears in silence, exactly
the defect claimed. MB6 (dropping `isUserBlocked ||` from `StoreIsClosed`) reds precisely the
blocked-customer arm. The repair is real, not cosmetic.

### 2.4 Corrected claim 3 — the documents ledger is reproducible only by reconstruction

The till lane ships `mutate.py` with every exact mutation string; the documents lane's
`mutate.sh`/`mutate-be.sh` lived in a session scratchpad that no longer exists, and the ledger
records meanings and counts, not strings. My M2 reconstruction reds 2/32 against the ledger's 3/29 —
almost certainly a different-but-adjacent mutation, and the two reds are the two arms that matter
(absent document ≠ clean bill, including the component's exact call shape), so the claim stands.
**Rule for future ledgers**: a mutation row without its exact string is a claim the next reader must
re-derive; publish the harness beside the ledger as the till lane did. No change to this lane's
verdict.

---

## 3. Exit-criteria summary

- **Mutations that would not actually red**: none found in the sample of sixteen. The two non-reds
  (M4.9, M6.E, M11) are exactly the ones the lanes themselves declared, and all three verified.
- **Tests passing for a reason other than the one claimed**: none found; every sampled red failed in
  the arm whose title names the defect. One *title* claims what nothing measures
  (`store-cart-state.test.js:436` describe, §2.1) — prose residue, not a passing-for-wrong-reason.
- **Surviving vacuity**: none. The two vacuity repairs both proven live (§2.2, §2.3); the stub arm
  and the retitled arm both bite under mutation.
- **Claims corrected**: "character-identical" (one comment line), "could not have reddened at all"
  (falsified at `bf3e553`), M5's stale file column, the unpublished documents harness, the
  `seatBuckets` premise footnote.

Worktrees created and removed: `scratchpad/revcheck/Web-modules` (@`7aaee5b`),
`scratchpad/revcheck-docs/Web-modules` (@`c53e344`, briefly `bf3e553`, restored),
`scratchpad/revcheck-be/OkamAPI-modules` (@`8c692457c`). All three verified clean before removal.
Harness + raw results: `scratchpad/revcheck/mutcheck.py`, `mutcheck-results.json`,
`scratchpad/revcheck-docs/mutdocs.py`, `mutdocs-results.json`. No container, no `pkill`, no
`npm ci`/`npm install`, `:3971`/`:5971` never bound, `okam-lwtwo-*` never touched.
