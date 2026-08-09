# SUMMARY — every one of the 115 tests is named red by at least one applied-and-restored mutation

Written by `agent:L-FORTY-SEVEN-LANES-NEED-THE-WORK-NOT-THE-CITATION` (batch 2), 2026-08-09.
Reason-shape: **missing write-up.** The measurement was done and is sound; no single file carried the
sentence, and `plan verify` refused the lane directory in terms:

    plan: evidence inadmissible — ../Web/lanes/L-THE-MEALS-TESTS-ARE-PROVEN-FALSIFIABLE is a directory
    — a directory records no run and cannot be read; name the artifact inside it that does

This is that artifact. **Every number below was recomputed from the runner's own JSON by this agent**, not
copied from the RETURN.

**The evidence line as the original agent recorded it, preserved because `plan verify` overwrites it:**

    docs/plan/lanes/L-THE-MEALS-TESTS-ARE-PROVEN-FALSIFIABLE

That path resolves nowhere — the `docs/plan/` prefix is wrong. The runner output is committed at
`lane/meals-tests-proven-falsifiable` **`05c160a9f7f981b8614ce1debf2edee0bca83690`** in the `Web` repo under
`lanes/L-THE-MEALS-TESTS-ARE-PROVEN-FALSIFIABLE/` (confirmed with `git ls-tree -r --name-only 05c160a9`),
and **all 17 files are copied into `runner-output/` beside this summary** so the citation outlives the
worktree it was read from.

## 1. The three zero-counts

The runner records a **per-test kill map** (`killedBy`), not just a per-mutation outcome. "Every mutation was
killed" and "every test can fail" are different claims, and only the map carries the second.

| spec | tests | mutations applied | RED | still-green | `baselineRed` | **`neverReddened`** |
|---|---|---|---|---|---|---|
| `test/meals-statement-lines.component.test.js` | 29 | 26 | 25 | 1 | 0 | **0** |
| `test/offer-code-guest-page.test.js` | 37 | 33 | 33 | 0 | 0 | **0** |
| `test/meals-statements-page.test.js` | 49 | 43 | 43 | 0 | 0 | **0** |
| **total** | **115** | **102** | **101** | **1** | **0** | **0** |

Source: `runner-output/all-lines.results.json`, `all-offer.results.json`, `all-page.results.json`, field
`baseline.<spec>.neverReddened`. Each spec's `killedBy` map has one entry per test — 29, 37 and 49
respectively, matching the totals — and **every entry lists at least one killing mutation** (killers per
test: lines min 1 / max 3, offer min 1 / max 4, page min 1 / max 4).

**The one survivor is a mutation, not a test.** `all-lines.results.json` records exactly one
`outcome: "STILL-GREEN"`:

> `member column falls back to the allocation id (the substitution this surface forbids)`

— the sound equivalence the original audit had already verified, left exactly as found and not
re-litigated. It does not leave any test unproven: all 29 lines tests are killed by other mutations.

**The five `THE DEFECT` pins are inside the 115, not excluded from them.** They live in the offer spec and
each has a killer in `all-offer.results.json`'s map:

- `THE DEFECTS THE DEFECT: a link with no order number also reads as an expired offer`
- `THE DEFECTS THE DEFECT: an offer with no phone number shows the guest a JavaScript TypeError`
- `THE DEFECTS THE DEFECT: an acceptance answered with an empty body blanks the page after the order is placed`
- `THE DEFECTS THE DEFECT: every load failure tells the guest the offer EXPIRED, whatever went wrong`
- `THE DEFECTS THE DEFECT: a failed send shows the guest the raw English exception text`

## 2. The previously-unproven thirty-two, listed by name

Re-derived independently against the **original 71-mutation corpus** before anything was added
(`mut-lines.rederived.results.json`, `mut-offer.rederived.results.json`, `mut-page.rederived.results.json`,
field `baseline.<spec>.neverReddened`). **11 + 3 + 18 = 32**, which reproduces the audit's figure exactly —
now on an instrument that could have known it.

### `test/meals-statement-lines.component.test.js` — 11

1. `the month statement a venue hands to a buyer the operator can read the period, the run and the line count off the document`
2. `the member reference on a line, which is read and never derived the reference the company supplied is what an accountant reads on the bill`
3. `the member reference on a line, which is read and never derived a bare membership id supplied as the reference is printed as supplied`
4. `a line as a bookkeeping row a kind the client has no word for is shown as the server sent it`
5. `a line as a bookkeeping row a figure the server did not state is a dash and can never be misread as zero`
6. `a line as a bookkeeping row a receipt number the statement never carried leaves a dash, not a blank cell`
7. `a line as a bookkeeping row every line the server sent gets a row`
8. `money the venue did not price in its own currency an admin whose own currency is unknown is not told the figure is foreign`
9. `the status the operator is looking at a status the client has no word for is shown verbatim rather than guessed at`
10. `the status the operator is looking at a run that arrived with no status at all reads as unknown, not as a blank badge`
11. `the status the operator is looking at a line that arrived with no kind reads as unknown, not as a blank cell`

### `test/offer-code-guest-page.test.js` — 3

12. `a guest opening the link in their offer the guest waits on a spinner rather than an empty page while the offer is fetched`
13. `a guest opening the link in their offer an offer that loaded is still readable when the read receipt fails`
14. `code on this page that nothing can reach the document is rendered by OfferDocument, not by figures this page derives`

### `test/meals-statements-page.test.js` — 18

15. `opening a month statement by its run id the venue reads the document's totals, its signature and every line`
16. `opening a month statement by its run id the run asked for is the run fetched`
17. `opening a month statement by its run id an operator who has typed nothing cannot fire a read`
18. `opening a month statement by its run id a run id padded with spaces is sent trimmed, not rejected`
19. `opening a month statement by its run id re-reading asks for the run on screen again`
20. `opening a month statement by its run id a run that is not there is refused in words, and puts no document on screen`
21. `opening a month statement by its run id a session that has expired says so rather than reading as an empty month`
22. `opening a month statement by its run id a refusal with no code on the problem document is admitted as unknown`
23. `opening a month statement by its run id a read that succeeds clears the refusal the previous one left`
24. `the deep link the month-close screen will hand over no run on the URL opens nothing on its own`
25. `the CSV the buyer receives the file is fetched, held, and shown before it is saved`
26. `the CSV the buyer receives the server's signature on the file is shown beside it`
27. `the CSV the buyer receives a file the browser was not allowed to read a hash for shows none`
28. `the CSV the buyer receives a server-named file is not marked as named here`
29. `who the page reads for an admin with no store selected triggers no read at all`
30. `who the page reads for a session whose user has not hydrated yet reads nothing rather than throwing`
31. `what this screen deliberately cannot do every figure on screen came off the wire; the page sums nothing`
32. `what this screen deliberately cannot do a line the server sent no member reference for is never given one here`

**All 32 are killed in the final run and none was deleted or rewritten**: the three specs' totals are
unchanged at 29 / 37 / 49 between the re-derivation and the final run, and the final `neverReddened` lists
are empty. The audit's prediction held — they were reachable by mutating what the original 71 never touched,
most of them in `statement-view.js` (the period's zero padding, the read-not-derived member reference,
`intOrNull`, the refusal branches, the server's own totals and signature).

The extra mutation rounds that closed them are also in `runner-output/`, and each is all-RED:
`mut-lines-extra` 11/11, `mut-page-extra` 17/17, `mut-offer-extra` 3/3.

## 3. The correction the original agent owed, kept in the record

Three mutations aimed at `statement-client.js` killed nothing and were first read as a coverage gap. They
were a **mis-aimed spec**, not a gap: the page suite mocks the service. Re-aimed at
`test/meals-statement-client.test.js` (21 tests, real service over a stubbed fetch) all three go red —
`mut-client-reaimed.results.json`, 3 mutations, 3 RED. That file's own `neverReddened` reads 16 of 21,
which is correct and not a defect: three mutations cannot be expected to kill a whole 21-test spec, and
that spec is **not** one of the three the exit is about.

## 4. What this summary does not claim

- **Scope of "every test on `lane/meals-events-screens-tested`".** What was measured is the **115 tests in
  the three specs that lane authored**, not the branch's whole tier (172 suites / 4135 tests at the lane
  tip, 0 failures; trunk `d4c308e` was 168 / 4007). If the exit's "every test" is read as the whole tier,
  it is **not** met and never was; read as the lane's own corpus, it is met with three zero-counts. This
  ambiguity is recorded rather than resolved by rewording — **an owner reading may want to settle it.**
- This is a falsifiability measurement of a test corpus. It is not C5 acceptance of any capability, and no
  operator walked any of these screens for it.
