# Walk — L-WF-CORRECTION-PATH

**For Sven. C5 says acceptance is a person completing the journey, never a suite reporting green.**
Nobody has walked this. The suite is green and that is not the gate.

Script written by the Fable reviewer that approved the lane, not by its author.

## What this is
bokføringsforskriften § 8-5-6: *"Dersom det foretas rettelser i personallisten, skal det fremgå hvem
som har foretatt rettelsen og tidspunkt for når det er gjort."* The sheet has named that paragraph on
screen since the register lane landed — while both entry writes passed a literal null correction
actor, the controller had no write action, and the only corrected row in the estate was a committed
fixture no code path could produce. This lane is the correction path: a **Rett** control per row that
POSTs an appended, superseding entry carrying the correcting manager and the instant. The corrected
row is retained untouched. This walk is what makes the on-screen § 8-5-6 claim honest.

## Setup
Backend from `~/okam/OkamAPI-wfcorrect` (branch `lane/wf-correction-path`), frontend from
`~/okam/web-wfcorrect` (branch `lane/fe-wf-correction-path`), world via `Scripts/demo/demo-up.sh`.

**The demo world has no personalliste rows.** The workforce seed writes raw clock punches and folded
sessions, but the register projection (`WorkforcePersonnelListParticipants` /
`WorkforcePersonnelListEntries`) is only written by a live punch through the API, and the clock UI
lives in the other admin. So seed one worked window by hand, in the shape the fold produces (mirror
`WebApi.Tests/Wire/WireHostFixture.SeedPersonnelList`): one participant row (Employee, the staff
member id of a rostered worker — NOT the manager you will sign in as, or step 5 proves nothing) and
one closed entry for the venue's TODAY, `SupersedesEntryId` and both correction columns NULL.
INSERT is permitted; the retention trigger only refuses UPDATE/DELETE.

## The walk
Open the admin web, select the store, go to **Workforce -> personalliste**
(`/admin/workforce-personnel-list`). The seeded window is on the sheet; the law line under the title
reads `bokføringsforskriften § 8-5-6` — and nothing else. It must still read exactly that at the end.

1. **Print preview first, before touching anything.** The **Rett** column and button must NOT be on
   the paper. The printed page is the register; the control is chrome.
2. **Press Rett on the row.** The form opens above the sheet (not over it — the row stays readable),
   prefilled with the SAME wall-clock times the row shows. If the prefill disagrees with the row by
   any amount, stop: two conversions of one instant are on screen.
3. **Type a departure before the arrival.** Refused before anything is sent, and your typed values
   stay in the boxes.
4. **Correct the departure to 23:30 and save.** The success toast points you at the note column. The
   row now shows **23:30 exactly as typed** — an hour's shift here means zone arithmetic touched a
   statutory register — and the note column reads *"Rettet av {reference} {date} {time}"* with
   today's date and the current time. The footer counts the correction.
5. **Read the reference in that note.** It is the MANAGER's engagement reference, not the worker's
   — and it is an opaque id, not a name. Decide whether an id that can only be resolved through the
   roster satisfies *"skal det fremgå hvem"* on a printed sheet handed to an inspector. The review
   flags this (finding on rendering the corrector's name); your ruling here decides its priority.
6. **The refusal, from a stale screen.** Open the same day in a second tab. In tab one, correct the
   row again (any minute). In tab two — still showing the now-superseded row — press Rett and save.
   Expect the error toast carrying the server's own wording, and the form still open with your typed
   values. Reload tab two: ONE current row for the window, not two.
7. **Correct back to open.** Rett again, tick **«Ingen sluttid ført»**, save. The row must render as
   an open window (present at the workplace) — the absence of a departure is a recorded fact, not a
   validation gap.
8. **Print again.** The *Rettet av* lines ARE on the paper — the correction record is part of the
   register — and the buttons and form still are not.

## What would make you reject it
- The Rett button or the correction form appears anywhere on the printed sheet.
- After a correction the note column is empty or reads *"ukjent"* — then who/when is not on the
  document the statute claim is printed on, and the claim is unbacked again.
- 23:30 renders as any other hour. That is the false-statement-in-an-immutable-row failure the whole
  wall-clock design exists to prevent.
- Step 6 APPENDS instead of refusing — two rows for one window. That is the missing unique index on
  `SupersedesEntryId` surfacing (review condition C2); it is exactly the self-contradicting register
  the refusal claims cannot exist.
- Your typed values are discarded on a server refusal.
- Any second statute reference has appeared on the page (C6: § 8-5-6, and only § 8-5-6).

## Known, and not part of this walk
- **What the corrected row USED to say is not on any screen.** The original survives unchanged in
  the database (append-only in two layers) and the superseding row names it by id, but no endpoint
  can produce its content. The review names the change (a lineage read / superseded rows in the
  manager response); ruling open on whether DB-only retention passes an inspection.
- The SQL tier has not run anywhere in this pass (Docker down), so the retention-lock trigger and
  the concurrency behaviour of step 6's refusal under truly simultaneous writers are unproven; the
  refusal you saw is the sequential path, which is provider-independent.
- If every Workforce screen answers 403 in the live walk, that is the pre-existing
  `ModuleCallerIdentityWireTests` nameid pin, not this lane.
