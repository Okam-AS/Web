# Walk — L-WF-BLIND-BIND-NAME

**For Sven. C5 says acceptance is a person completing the journey, never a suite reporting green.**
Nobody has walked this. The suite is green and that is not the gate.

Script written by the Fable reviewer that approved the lane, not by its author.

## What this is
Importing a POS operator decides whose pay every punch at that register becomes — and the screen
could not say who. An operator with a login binds to the EXISTING person that login belongs to,
and the review showed a blank where that name should be. The bind was also permanent: no endpoint
could undo it. Your ruling was *name the person, and allow correction*. This lane is that ruling.

## Setup
Backend from `~/okam/wt-wfblindbind` (branch `lane/wf-blind-bind-name`), frontend from
`~/okam/web-blindbind` (branch `lane/fe-wf-blind-bind-name`), world via
`Scripts/workforce-demo/demo-up.sh`.

**One seed the demo world may not have:** an operator whose login belongs to an existing person.
If step 3 shows no such row, give one POS operator the login of an already-rostered person (the
operator editor, or one UPDATE on `Operators.ApplicationUserId`), reopen the panel, and continue.
Without this row you have not seen the ruling — do not accept on the new-person rows alone.

## The walk
Open the admin web, select the store, go to **Workforce -> roster** (`/admin/workforce-roster`),
click **Koble kasseoperatorer**.

1. **Every operator names a person, or says why not.** No login: the operator's own name (a new
   person will be created with it). Login mapped to a person: THAT person's name — a different
   name than the register's. StoreAdmin: blank, and the blank must read as "nothing will be
   bound", never as "unknown".
2. **Select the login-carrying operator.** The review line must name the existing person and say
   the engagement attaches to *them* — not "who it is cannot be shown here". Read both sides of
   the arrow. That sentence is the ruling.
3. **Confirm the import**, then find the person on the roster. The permanence copy must now say
   the link *can* be removed and is logged — not "cannot be removed or moved afterwards".
4. **The undo, wrongly named first.** (Optional but telling: correct via the API with a wrong
   `expectedStaffMemberId` — expect 409 naming the true holder, and nothing changed.)
5. **The undo, for real.** On the linked row press **Fjern koblinga**. It must NOT act in one
   click: a sentence naming the person about to be unbound, then **Ja, fjern**. Expect the toast
   naming them, the row importable again, and the person STILL on the roster with roles and terms
   intact — a correction withdraws a register binding, not a job.
6. **Import the operator again.** It must succeed onto a fresh engagement — the undo was real.

## What would make you reject it
- A login-carrying operator shows the operator's own name as the person. That substitution IS the
  original defect wearing a fix.
- The review answers nothing (kill the backend, reopen the panel) and the screen fills the blank
  with anything at all instead of saying it does not know.
- The withdrawal fires in one click, or the confirmation does not name the person.
- After a withdrawal the person is gone from the roster, or their roles/terms are.
- A blank person on the StoreAdmin row reads as "unknown" rather than "nobody".

## Known, and not part of this walk
- No one-step re-link exists; the path is withdraw, then import, and the copy says so.
- A link stranded on an ENDED engagement can be neither withdrawn nor re-imported (pre-existing;
  finding 6a of the review names the exact change, and `L-WF-LINK-DEADEND` carries it).
- The e2e fixture world cannot reach the existing-person branch, deliberately — which is why the
  seed in Setup is mandatory, not optional.
