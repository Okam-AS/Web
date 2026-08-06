# Walk — L-WF-CONTACT-IMPORTED

**For Sven. C5 says acceptance is a person completing the journey, never a suite reporting green.**
Nobody has walked this. The suite is green and that is not the gate.

Script written by the Fable reviewer that approved the lane, not by its author.

## What this is
An operator-imported workforce engagement had no way to carry a contact email or phone. The import
copies the operator's display name and nothing else, and `POST /staff` silently ignores contact
whenever an existing person id is supplied — so contact could only ever be set at a person's birth,
never corrected.

**A person is not store-scoped.** Correcting contact here corrects it everywhere that person works.
That is intended, and the screen says so.

## Setup
`Scripts/workforce-demo/demo-up.sh` stands up a world with imported people.

## The walk
Open the admin web, select the store, go to **Workforce -> roster** (`/admin/workforce-roster`).
Click an **imported** person — one whose facts line reads `— · —`.

In the panel's **Kontaktopplysninger** section:

1. **The scope sentence is visible.** It should tell you that correcting here corrects everywhere.
2. **Type an email and a phone.** Save enables only after a change. Save. Expect the success toast,
   and the facts line to fill in after the automatic re-read.
3. **Empty the email box.** The red warning — *"Et tomt felt fjerner opplysningen…"* — must appear
   before you save. Save. Confirm the email is gone.
4. **Type `kari.fjell.example.test`** (no `@`). Expect an error toast naming email, **and the typed
   value must stay in the box** so it can be corrected.
5. **On a deployment that returns no revision:** the engagement edits (numbers, capabilities) are
   disabled while the contact block still saves.

## What would make you reject it
- The boxes sit blank over a stored value. That is the unpinned watcher regression — one Save from
  there clears the person's contact chain-wide. `L-WF-CONTACT-PINS` exists to pin it; if you see it
  on screen, that lane is not optional.
- Your typed value is discarded on a validation error.
- The scope sentence is missing — then a chain-wide write is happening without saying so.

## Known, and not part of this walk
The cross-store tenancy line has no test (`L-WF-CONTACT-PINS`, item 1). The 409 stale-revision path
has never executed anywhere, because it needs SQL Server and only the container-free tier has run.
