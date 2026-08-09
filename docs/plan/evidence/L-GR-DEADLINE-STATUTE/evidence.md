# L-GR-DEADLINE-STATUTE — the doc, extracted to somewhere a stranger can open it

**Exit:** *the working-day extension and the end-of-day expiry are either implemented or named in the
obligation's own doc, and the timezone reading is recorded.*

**Reason shape hit: (1) no artifact exists — the work happened and nobody wrote it down where it could be
read.** `instrumentless-exits.md` (Batch 3) declined this lane on exactly that: *"A `.trx` cannot show that
a doc comment names a rule, and cannot record a timezone reading… This lane needs its doc extracted to an
artefact, not an exit amended."* This is that extraction. **No exit clause was softened and nothing was
built toward the exit** — the doc already said all three things; it just lived where nobody could reach it.

**The `evidence:` line as it stood before `plan verify` overwrote it:**

```
lane/gr-deadline-statute f7abfd8e (wt /Users/svendaneel/okam/wt-gr-statute, off 3b42da1d) ·
lanes/L-GR-DEADLINE-STATUTE/growth-scoped.trx
```

## What was extracted, and how a reader checks it is the real thing

`GrowthPrivacyObligation.cs.txt` beside this file is a **byte copy** of
`Services/Growth/GrowthPrivacyObligation.cs` at `lane/gr-deadline-statute` (commit `f7abfd8e9`, blob
`66794cf13e41bd0d70e29c23b6f17255eb89f319`, 115 lines). Both the copy and
`git show lane/gr-deadline-statute:Services/Growth/GrowthPrivacyObligation.cs` hash to

```
2ffefcaa2c1c2e57be97d7dc47e7b2fb195af8ddd3a6ee2d867477049c82f748
```

so the transcript is checkable rather than trusted, for as long as the branch resolves. The plan-repo copy
outlives the branch.

## Clause by clause, against the extracted text

**Neither rule is implemented. Both are named — in the obligation's own doc, on `DueAt`, under a heading
that says the list is of gaps and not of a complete arithmetic:** *"Citing art. 3(2)(c) as the counting
rule and then not applying art. 3(4) is not a defensible position — they are one article of one
regulation — so what follows is a list of known gaps, not a reading under which the arithmetic is
complete."*

| clause | implemented? | named where |
|---|---|---|
| the working-day extension (Reg. 1182/71 **art. 3(4)**) | **no** | `(1) ART. 3(4), THE WORKING-DAY EXTENSION — NOT IMPLEMENTED`, with its direction (conservative — *"the venue is pressed early, never shown headroom it does not have"*), its worst case (*"up to two days earlier"*), its blocker (art. 2(1) makes public holidays per-Member-State data *"the product holds none in any market"*), and the fact that it is not a corner case: *"three of the six clamp cases … land on a day art. 3(4) would move (Sat 28 Feb 2026, Sun 15 Feb 2026, Sun 31 Jan 2027)"* |
| the end-of-day expiry (**art. 3(2)(c)**, *"the expiry of the last hour"*) | **no** | `(2) ART. 3(2)(c), EXPIRY AT THE END OF THE LAST DAY — NOT IMPLEMENTED`, naming the consumer that trips early (`utils/growth/privacy-queue.js`'s `isOverdue`), the size (*"up to a full day early"*), and why it is deliberately not fixed alone — rounding to the last tick of the **UTC** day *"would move the date the queue PRINTS forward by one for every row rendered east of UTC"* |

**The timezone reading is recorded**, as `(3) WHICH CALENDAR THE DAY-NUMBER IS READ ON — OPEN, AND THE ONLY
GAP THAT BREAKS THE DANGEROUS WAY`: the clamp runs on the UTC day-number while the admin queue formats with
`Intl.DateTimeFormat` and **no `timeZone`**, i.e. in the viewer's zone. The worked example is in the doc —
a request filed **31 March 2026 at 01:30 Oslo** is 30 March in UTC, so `DueAt` returns 30 April 23:30Z, an
Oslo screen prints **Fri 1 May**, and the venue's own calendar gives **Thu 30 April**. The doc states the
window it bites in (a one-to-two-hour window on a handful of days a year) and refuses to rule it: *"WHICH
READING IS OPERATIVE IS A QUESTION OF LAW AND NOTHING HERE RULES IT."* It closes with a recommendation
(carry a venue-local **date**, not an instant) marked *"RECOMMENDATION, NOT A CHANGE."*

Each of the three is additionally held by a named test on the same branch
(`WebApi.Tests/Growth/GrowthPrivacyDeadlineTests.cs`), which is why the doc cannot drift silently:

- `A_deadline_that_lands_on_a_Saturday_is_returned_unextended` — asserts `DayOfWeek.Saturday` **and** the
  unextended date, so an edited seed cannot turn it into a case where both rules agree;
- `A_deadline_that_lands_on_a_Norwegian_public_holiday_is_returned_unextended` — 1 May 2026 is a **Friday**,
  so a weekend-only implementation would not catch it and the holiday half is ruled out on its own;
- `The_clamp_runs_on_the_UTC_day_number_and_reads_a_day_later_than_the_venue_local_one` — asserts the
  **difference** (`Assert.Equal(TimeSpan.FromDays(1), whatAnOsloScreenPrints - whatTheVenueCalendarGives)`),
  both sides derived from the receipt so neither can be edited into agreement by moving a literal.

## The landing status, stated rather than buried

**None of this is on the backend trunk.** At `6d5328004` the same file is blob
`0dd3801f5379808b9a66e1eed1f42af6de123be9`: `DueAt`'s doc carries the art. 3(2)(c) month-clamp paragraph
and the UTC-normalization paragraph and **nothing about (1), (2) or (3)** — the three paragraphs above do
not exist there. `f7abfd8e9` is not an ancestor of `6d5328004`. So what this file establishes is that the
obligation's doc names the two omitted counting rules and records the timezone reading **on
`lane/gr-deadline-statute`**, an unpushed local branch off `3b42da1d`. A reader who wants that sentence to
be true of the estate needs the branch landed; that is a different lane's job and is not claimed here.
