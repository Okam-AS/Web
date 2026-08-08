# L-THE-TILL-TESTS-ARE-RUN-AND-TRUE — the six rescued suites, run and proved

Branch `preserve/till-money-tests`, rebased off the moved trunk onto **`780d405`**, tip **`7aaee5b`**.
Worktree `/private/tmp/.../scratchpad/till/Web-modules` (basename `Web-modules`, as the coverage
review requires), `core` pinned at `9626a561`, `node_modules` symlinked to the owner checkout.
No `npm ci`, no container, no push.

---

## 0. The one-paragraph answer

**All six suites were already true.** They pass unmodified (149 tests), and 44 of 45 mutations
applied to the shipped POS sources killed the suite that claims to protect them. **No suite was
deleted.** The single survivor is an *equivalent mutant* — a redundant `.sort()` — and it is now
named in the test file rather than left reading as protection. **The till's unmountability
reproduces exactly** and its root cause is a two-line defect in `utils/guid.js` that the killed
lane had found and pointed at a return it never lived to write; that reasoning is re-derived,
verified in three environments, and written into the test file so it cannot be lost a second time.

---

## 1. The lost finding, re-derived

The killed agent's last recorded words were that it had found why the till is unmountable. The
finding was half-written: the header of `test/pos-return-document-amount-and-vat.test.js` names the
symptom, then says *"See this lane's return for the separate latent defect in `utils/guid.js`"* —
and that return was never written. Both halves are now established.

### 1a. The symptom reproduces

Probe: mount `ReturnBuilder` and `RefundModal` with **no** `crypto` polyfill.

```
typeof crypto -> undefined | jsdom window.crypto -> undefined
ReturnBuilder: ReferenceError: crypto is not defined
RefundModal:   ReferenceError: crypto is not defined
[Vue warn]: Error in data(): "ReferenceError: crypto is not defined"  ---> <ReturnBuilder>
```

The throw is out of `data()`, before a single assertion can run. jsdom 16.7 (this repo's jest
environment) defines no `crypto` global at all — not on `global`, not on `window`.

### 1b. The defect itself

```js
utils/guid.js:5   if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
utils/guid.js:6     return crypto.randomUUID()
utils/guid.js:7   }
utils/guid.js:8   const bytes = new Uint8Array(16)
utils/guid.js:9   crypto.getRandomValues(bytes)          // <-- unguarded
```

**The `typeof crypto !== 'undefined'` half of the line-5 guard is dead.** The only way it can be
false is that there is no `crypto` global — and four lines later the "fallback" written to handle
that case dereferences that exact global. So the function has **no fallback for the condition its
own guard tests for**; it has one only for "crypto exists but `randomUUID` does not".

Verified by direct probe in all three environments:

| environment | line-5 guard | result |
|---|---|---|
| A. no `crypto` global (jsdom 16.7, Node < 19) | false | **`ReferenceError: crypto is not defined`** |
| B. `crypto` without `randomUUID` (plain-http browser) | false | `e1624edc-3854-4f40-ac0a-2c9535a38ca0` — a well-formed RFC 4122 v4 |
| C. full `webcrypto` | true | `64194113-11a6-4f2a-8e07-7fe3692be4b2` |

Row B matters: **the generation arithmetic on lines 10–13 is correct** (8-4-4-4-12, version nibble
on byte 6, variant on byte 8). The defect is entirely in the guard, not in the UUID.

The file's own comment claims the fallback *"covers plain-http dev hosts and older WebViews"*. It
covers plain http — `window.crypto` is available on insecure origins, only `randomUUID` is
secure-context-only — and it does **not** cover a missing `crypto`, which is the case it reads as
if it were handling.

### 1c. What it is and is not

**Not a live production defect.** Every browser defines `window.crypto`; `nuxt.config.js` sets
`target: 'static'` and this machine prerenders on Node 24, which defines it too. **It is a live
test-infrastructure defect**, and it is the mechanical reason the till's two money-OUT surfaces
were never under test — `newGuid()` is called from `data()` in `ReturnBuilder` and `RefundModal`,
and from `DayFlow`, `ClockScreen`, `pages/workforce/join.vue`, `pages/meals/join.vue` and
`utils/workforce/api-client.js`.

**`utils/guid.js` was deliberately NOT changed by this lane.** It is a shared util with eight call
sites across POS, Workforce and Meals; the honest fix (raise a named error instead of a bare
`ReferenceError`) would not unblock anything the per-file polyfill already unblocks, and a jest
`setupFiles` entry — the change that *would* unblock every future test — touches a config shared by
159 suites while the trunk is moving. Recorded for a decision, not taken unilaterally.

---

## 2. The mutation battery

Harness: `mutate.py` (in this directory). Each mutation is an exact string replacement against the
**shipped source**, applied one at a time; only the suite that claims to protect it is run; the file
is restored byte-for-byte in a `finally`. Anchor uniqueness is asserted before each apply.

**45 mutations, 44 killed, 1 equivalent-by-claim confirmed, 0 survivors after analysis.**

| id | source | mutation | verdict |
|---|---|---|---|
| M1.1 | CashPad | øre rounding goes DOWN — a 62,50 part asked for as 62,00, server refuses the tender | KILLED 7 |
| M1.2 | CashPad | floor at zero removed — an under-tender renders as negative change | KILLED 1 |
| M1.3 | CashPad | `>=` → `>` — an exact tender refused, a zero due dead-ends the sale | KILLED 2 |
| M1.4 | CashPad | a fifth preset button appears | KILLED 3 |
| M1.5 | CashPad | watcher stops re-seeding — the reused pad keeps the previous portion's tender | KILLED 1 |
| M2.1 | EodWizard | difference reversed — every shortfall reads as an overage on the signed Z | KILLED 3 |
| M2.2 | EodWizard | tolerance gates the explanation — a small difference closes the day unexplained (§ 5-3-14) | KILLED 5 |
| M2.3 | EodWizard | `>` → `>=` — exactly at the cash-point limit flagged as past it | KILLED 1 |
| M2.4 | EodWizard | **a stale reason rides along on a zero-difference Z** — the one the source guards | KILLED 1 |
| M2.5 | EodWizard | the day closes with an unexplained difference | KILLED 2 |
| M3.1 | PosReceiptView | the gift-card arm of the payer ladder is dropped | KILLED 2 |
| M3.2 | PosReceiptView | off-by-one — a whole 24-character signature marked as truncated | KILLED 1 |
| M3.3 | PosReceiptView | signature truncated from the BACK — unmatchable against the journal | KILLED 3 |
| M3.4 | PosReceiptView | absent `taxLines` breaks the receipt instead of printing no block | KILLED 1 |
| M3.5 | PosReceiptView | one terminal make loses its label while the other keeps it | KILLED 3 |
| M3.6 | PosReceiptView | **THE BLANK PAYER LINE** — an unmapped medium renders an empty payer row | KILLED 1 |
| M4.1 | RefundModal | a split sale refunds the whole gross to a tender that carried part of it | KILLED 1 |
| M4.2 | RefundModal | a tender carrying gross + tip refunds the tip as well | KILLED 1 |
| M4.3 | RefundModal | a card line with no transaction id treated as refundable to the card | KILLED 1 |
| M4.4 | RefundModal | the cap dropped from the button — a refund above what was taken can be pressed | KILLED 1 |
| M4.5 | RefundModal | a second tap fires while the first refund request is in flight | KILLED 1 |
| M4.6 | RefundModal | every modal shares one idempotency key | KILLED 1 |
| M4.7 | SplitBillModal | a guest's bucket shows only the last line, not the sum | KILLED 2 |
| M4.8 | SplitBillModal | an unplaced line is silently charged to guest one | KILLED 1 |
| M4.9 | SplitBillModal | the `.sort()` is deleted | **SURVIVED — equivalent, see §3** |
| M4.9b | SplitBillModal | the comparator is reversed (descending guest order) | KILLED 3 |
| M4.9c | SplitBillModal | sort deleted AND the key walk reversed | KILLED 3 |
| M4.10 | SplitBillModal | one guest holding every line counts as a valid split | KILLED 1 |
| M4.11 | SplitBillModal | the guest chip row capped at eight instead of twenty | KILLED 1 |
| M5.1 | ReturnBuilder | quantity ignored — three burgers paid out as one | KILLED 5 |
| M5.2 | ReturnBuilder | a partially-filled goods-group profile read as authoritative | KILLED 1 |
| M5.3 | ReturnBuilder | **A RETURN COMPUTED FROM A LISTED PRICE** — a legal 12 pct product rate rewritten to 25 | KILLED 1 |
| M5.4 | ReturnBuilder | eat-in context never reaches the rate — a table return at the take-away rate | KILLED 2 |
| M5.5 | ReturnBuilder | a context switch wipes an unprofiled line's operator-chosen rate to null | KILLED 1 |
| M5.6 | ReturnBuilder | an unclassified line no longer blocks the payout | KILLED 1 |
| M5.7 | ReturnBuilder | cash leaves the drawer with no customer signature | KILLED 1 |
| M5.8 | ReturnBuilder | headings and hidden products offered as returnable menu items | KILLED 1 |
| M6.1 | PaymentScreen | round-up uncapped — a 0,99 remainder split two ways asks for more than the bill | KILLED 2 |
| M6.2 | PaymentScreen | shares round DOWN — the settlement closes short by the drift | KILLED 2 |
| M6.3 | PaymentScreen | **THE LAST PAYER's øre rounded away** — the settlement closes short or over | KILLED 2 |
| M6.4 | PaymentScreen | a payer who leaves divides the remainder by zero or a negative | KILLED 1 |
| M6.5 | PaymentScreen | cash remainder rounds up, diverging from the server | KILLED 1 |
| M6.6 | PaymentScreen | the tri-state rollout flag reads as enabled when merely truthy | KILLED 1 |
| M6.7 | PaymentScreen | a custom portion above the outstanding can be charged | KILLED 1 |
| M6.8 | PaymentScreen | a cash-first portion carrying øre is accepted | KILLED 1 |
| M6.9 | PaymentScreen | the quick-amount row repeats identical shares | KILLED 1 |
| M6.E | PaymentScreen | *equivalent by the suite's own claim*: the redundant last-payer early return is deleted | **CONFIRMED equivalent** |

M6.E is the claim the killed agent recorded in `pos-split-payment-shares.test.js` — that the
`splitPersonsLeft === 1` early return changes no answer. It is **true**: deleting it leaves the
suite green, and M6.3 (rounding the last payer's remainder) is the mutation that does bite. The
agent's note is accurate and is left standing.

---

## 3. The one survivor, and what was done about it

**M4.9** — deleting `.sort((a, b) => a.seat - b.seat)` from `SplitBillModal.seatBuckets` leaves the
suite green, including the test that reads *"the buckets are ordered by guest number, not by the
order lines arrived in"*.

The reason is a language guarantee, not a gap in the test's aim. `seatBuckets` accumulates into a
plain object keyed by seat number, and `Object.keys` returns **integer-like keys in ascending
numeric order** regardless of insertion order:

```
numeric keys  : [ '1', '2', '3' ]     // written 3, 1, 2
string keys   : [ '1', '2', '3' ]     // written '3', '1', '2'
non-integer   : [ '1', '1.5' ]
```

Seat numbers are positive integers 1..20, set from `seatChips`, so **the sort is dead code in every
state this component can reach**.

The test is **not vacuous** — a reversed comparator (M4.9b) and a reversed key walk (M4.9c) each
fail it and two neighbours, 3 tests apiece. It cannot detect *deletion*, and that is a fact about
JavaScript. **Kept, with the redundancy named in place**, in the same shape as the killed agent's
own note about the redundant early return. Deleting a test that does catch wrong ordering would
have removed real protection to satisfy a rule aimed at tests that catch nothing.

---

## 4. Genuinely unexercised versus merely uncounted

The brief's counter-signal: 21 of the tier's test files are `readFileSync` source guards that never
execute what they guard, so some of Core/POS is pinned rather than untested. **For these seven
subjects that rescue does not apply.** ES imports and source guards, across the whole tier, before
this branch:

| subject | mounted by | source-guarded by | verdict |
|---|---|---|---|
| CashPad | — | — | genuinely unexercised |
| EodWizard | — | — | genuinely unexercised |
| RefundModal | — | — | genuinely unexercised |
| SplitBillModal | — | — | genuinely unexercised |
| ReturnBuilder | — | — | genuinely unexercised |
| PaymentScreen | — | — (named only in a *comment* in `payment-type-label.test.js`) | genuinely unexercised |
| PosReceiptView | `xz-residual-sites.test.js` | `xz-negated-absence.test.js` | **partly counted, partly real** |

**Six of the seven had nothing of either kind.** Only `PosReceiptView` was genuinely exercised
before — and only with a single `Cash` payment line and no signature, so the card and gift-card arms
of the payer ladder and all of `shortSig` were still at zero. Its one source guard pins a template
class name, not a money computed.

## 5. Coverage moved, measured on the fixed instrument

Trunk `780d405` carries the `vue-coverage-instrument` landing, so indented lines inside `.vue`
files are now counted and these figures are honest. Whole tier, before = the six rescued suites
excluded, after = included.

| component | statements before | statements after | functions before | functions after |
|---|---|---|---|---|
| CashPad.vue | 3/22 | **22/22** | 1/10 | **10/10** |
| EodWizard.vue | 0/35 | **32/35** | 0/11 | **10/11** |
| PosReceiptView.vue | 7/35 | 14/35 | 3/6 | 4/6 |
| RefundModal.vue | 11/87 | 34/87 | 1/19 | 10/19 |
| SplitBillModal.vue | 4/110 | 51/110 | 1/36 | 26/36 |
| ReturnBuilder.vue | 11/148 | 78/148 | 1/41 | 29/41 |
| PaymentScreen.vue | 12/368 | 31/368 | 1/67 | 16/67 |
| **total** | **48/805** | **262/805** | **8/190** | **105/190** |

Branches 12/350 → 160/350.

`PaymentScreen` stays low on statements by design: the suite pins the split-settlement arithmetic
and the rollout gate, not the terminal flow or the payment polling, which remain unexercised.

## 6. Suite accounting

| point | suites | tests | failed |
|---|---|---|---|
| `3ff7f07` (the clerk's recorded trunk) | 152 | 3589 | 0 |
| `780d405` (trunk now — it moved) | 153 | 3594 | 0 |
| `7aaee5b` (this branch) | **159** | **3743** | **0** |

**The trunk moved during this lane.** The sibling coverage-instrument lane landed: `3ff7f07` →
`780d405`, adding one suite (`test/vue-coverage-instrumentation.test.js`, 5 tests). The rescued
branch was cut off `52dd348`, which is now an ancestor of trunk, so it **rebased cleanly** with no
conflict. No POS component and no `utils/guid.js` changed between the two, so every mutation result
above holds unchanged on trunk.

This branch adds exactly six suites and 149 tests: 153 + 6 = 159, 3594 + 149 = 3743.

## 7. Reproduction

```sh
cd <worktree whose basename is Web-modules>          # basename pin: other names red 2 suites
git -c protocol.file.allow=always -C core fetch /Users/svendaneel/okam/Web-modules/core 9626a561bb0442b0aed026be75b7f9419337ac6d
git -C core checkout 9626a561bb0442b0aed026be75b7f9419337ac6d   # else 15 suites fail to RESOLVE while jest exits 0
node node_modules/.bin/jest --ci --coverage=false     # 159 / 3743 / 0
python3 docs/plan/lanes/L-THE-TILL-TESTS-ARE-RUN-AND-TRUE/mutate.py   # 45 mutations
```

## 8. Open, for a decision this lane did not take

1. **`utils/guid.js:9` dereferences `crypto` unguarded** (§1b). Shared util, eight call sites across
   three modules. Not a production defect today; a real test-infrastructure one.
2. **A jest `setupFiles` entry supplying `crypto`** would let `DayFlow`, `ClockScreen` and
   `pages/{workforce,meals}/join.vue` be mounted at all, and would retire the two per-file polyfill
   lines. It touches a config shared by 159 suites — not taken while the trunk is moving.
3. **`SplitBillModal.seatBuckets`' `.sort()` is dead code** (§3). Harmless; named, not removed.
