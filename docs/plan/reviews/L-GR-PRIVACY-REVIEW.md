# Fable review — L-GR-PRIVACY-VENUE + L-GR-DEADLINE-ONWIRE (2026-08-02)

Read-only. No file edited, no suite run. Mutation-shape claims verified arithmetically.

## 1. Verdict — sound-with-conditions

**Both lanes' accounts are accurate.** Every load-bearing claim in both commit messages checks out against
the code. The clamp port is exact for what it claims, the ordering is total, the three refusals are real,
the no-gate ruling is correct, and the suites are **unusually mutation-resistant.**

Four conditions, and the first is the urgent one.

## 2. Defects, most severe first

**D1 — the two halves landed in the wrong order, and the integration branch is deadline-blind today.** The
backend commit exists only on its lane branch; the frontend deletion is on `feature/restaurant-modules`. Net
effect **right now**: every open row prints the unknown-deadline sentence, **the overdue banner can never
fire**, and the open queue renders newest-first — the request about to run out of month at the bottom — with
the client **forbidden by design to re-sort.**

**The e2e journey stays green** because the fixture serves the field: the suite pins a contract the
integration backend does not honour. That is the green-suite-over-missing-wire hazard this estate has already
been burned by, arriving from a new direction — a *sequencing* gap rather than a missing implementation.

The fail-to-unknown design makes this an **honest degradation rather than a silently wrong date**, which is a
real virtue. The condition is hard: **merge the backend before this frontend deploys**, and run the journey
once against a real backend.

**D2 — the unknown-deadline sentence misdiagnoses, in three languages.** It says the receipt time cannot be
read. After the deletion the null case means *the response carried no deadline* — the receipt time is
typically perfectly readable, and the page no longer works anything out. **On the integration branch today
that false sentence prints on every open row.**

**D3 — a stale template comment asserts the inverse architecture**: that the deadline is derived on the page
and printing it as the server's would be inventing authority. Exactly wrong since the deletion, which updated
the script-side comment and missed this one.

**D4 — a doc comment states the exact inverse of its code's behaviour.** It claims the predicate's form
prevents a new state from being silently treated as settled; **the form has the opposite property** — a new
member sorts into the settled log, rendered under Closed with no controls while its clock runs, which is
precisely the outcome the comment says it avoids. No live defect, the enum is closed — and the frontend made
the same behavioural choice with an honest rationale, so both sides agree. **Fix the comment or flip the
predicate; do not leave a comment documenting a property the code lacks.**

**D5 — the port omits article 3(4), unnamed.** The Regulation extends a period ending on a weekend or public
holiday to the next working day. The obligation does not, and neither commit mentions it, while the doc
implies a completeness it does not have. **Direction is conservative** — the venue is never shown false
headroom — so it is shippable, but the overdue sentence **can be legally false for up to two days** on a
weekend-due request. Same family: the period ends at the expiry of the last hour of the due day, and the
computed instant carries the receipt's time of day, so the overdue flag trips up to a day early. Conservative;
the printed date is unaffected. **Name both.**

**D6 — the timezone answer is yes, and it breaks in the dangerous direction.** The clamp runs on the **UTC**
day-number while the page renders in the **viewer's** zone. A request filed at 01:30 local on the 31st of
March is the 30th in UTC; the arithmetic gives a due instant the venue's screen renders as **1 May**, while
the venue-local reading puts the deadline at **30 April**. **One day of headroom that may not exist** — in
exactly the direction both commits rail against. The window is roughly one to two hours on a handful of days
a year. The UTC reading is legally defensible and was documented as deliberate; **what creates the mismatch
is computing on one calendar and rendering on another.** Needs a ruling or a doc note; a venue-local
date-only value would dissolve it.

**D7 — minor.** A test's doc says every row is a date where the two rules disagree; two of six agree — the
commit message is honest about it, the comment overclaims. The e2e fixture **re-derives** the clamp
independently, so the cross-repo contract is held by two implementations agreeing rather than a shared
fixture, and the wire field's casing is pinned nowhere on the backend side. A locale guard greps only one
language.

## 3. The deadline equivalence — exact, with three named limits

Eight cases checked and **all exact**, including both leap-year paths, the year boundary, and the time-of-day
carry. Under the accepted reading of the Regulation, the platform's month arithmetic **is** the rule for the
calendar-date mapping — **the port is exact, not re-derived resemblance.**

Where it is not the whole statute: end-of-day expiry (early, conservative), the working-day extension
(omitted, conservative), and the UTC-versus-local question — **the only break in the dangerous direction.**

**The near-miss is confirmed arithmetically**, and it corrects the brief: the two rules do **not** only part
at the end of January — they part at most dates. **End of January is where they part by two days and land in
different months.** The compression in my brief overstated it.

## 4. Assertions that could pass against broken code

- **The journey's deadline step proves wire-dependence but not the rule.** It seeds relative dates, so on
  most run dates a fixture drifted to a thirty-day rule would produce the same sentence. **The journey proves
  reachability; the rule is pinned only by the backend's fixed discriminating dates.** Honestly handled — but
  the journey alone is not evidence of the clamp.
- Two clamp rows cannot fail under the thirty-day mutation. Known and compensated; their per-row comments
  should not be read as discriminating pins.
- The destruction-claim scan passes against an English phrasing, or Norwegian ones outside its regex.
- The deadline tests **drive the controller method directly, not the HTTP pipeline** — so the authorize
  attribute, route binding and JSON casing the frontend depends on are unexercised. *Pinned on the wire*
  slightly overstates.
- The rest are genuinely strong: the not-recomputed tests feed dates **no derivation could produce**, the
  order tests feed an order **no client rule reproduces**, and the truncation seeds and negative-zero pin are
  exactly discriminating.

## 5. Rulings on the remaining questions

**The three refusals are right and no fourth slipped through.** Four further candidate claims were checked
individually and cleared, each against the contract that backs it.

**The gate correction is correct** — and better instrumented than expected: the ungated state is *asserted* by
a journey step that reads the flag as off on the flags page and then walks the full queue, **so a gate quietly
added later reds it.**

**The order is total and the client does not re-sort.** One benign note: same-due-day rows tie-break on
receipt time, so a later-received request can rank above an earlier one — statutorily the same day.

**The deletion and the two kept fixes check out as claimed** — no fallback anywhere, and both fixes genuinely
consume the wire's value and the viewer's clock without deriving anything. Cosmetic residue: fixed
twenty-four-hour days, so daylight saving can shift a boundary by an hour.

## 6. What could not be determined

Whether any suite ran at the claimed counts — read rather than run; the journey artifact exists and its
timestamp is consistent, but it was not replayed. **The legally operative timezone for the article 12 period**
— a legal question the code cannot answer. And the wire field's JSON casing, inferred from existing traffic
rather than traced to the serializer.
