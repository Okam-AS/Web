# L-WF-DEMO-PRESENCE — the instrument is gone, and re-making it needs a slot this lane does not have

**Exit:** *after the workforce demo seed, the personnel-list read for the seeded week returns the four
seeded windows rather than an empty sheet.*

**Reason shape hit: (1) no artifact exists — the run happened and the write-up was destroyed.** Batch 1 of
`instrumentless-exits.md` measured it: the evidence line quotes
`…/scratchpad/final-run.txt` printing `2026-07-20: Jonas Lie 08:02-16:04, Nora Berg 13:58-20:04`, and
*"That file exists and contains none of that"* — opened today it is twenty `PASS` lines about a Jest
collection sweep, written by a **sibling lane to the same shared scratch path**. This is the boundary rule
*never a shared scratch path* costing a lane its evidence.

**The `evidence:` line as it stands** (preserved here before anything overwrites it):

```
OkamAPI worktree /Users/svendaneel/okam/wt-wfdemopres, branch lane/wf-demo-presence @ 8a9080c8
(local, not pushed; off feature/restaurant-modules de1e5c5e) · six full `Scripts/demo/demo-up.sh` runs
from an EMPTY database against my own container, final green run captured at
/private/.../scratchpad/final-run.txt · step 13b prints
`2026-07-20: Jonas Lie 08:02-16:04, Nora Berg 13:58-20:04` /
`2026-07-21: Jonas Lie 07:58-16:12, Nora Berg 16:01-00:19`
```

## Recorded unrecoverable, with the reason

`final-run.txt` is **outside any repository and its contents are gone** — overwritten in place, not
deleted, so there is no dangling object and nothing to recover: no reflog, no worktree copy, no stash.
`/Users/svendaneel/okam/wt-wfdemopres` is **clean** (`git status --porcelain` empty), and
`lane/wf-demo-presence` commits only two files —
`Scripts/demo/seed-workforce-demo.sh` (+208/−49) and `Scripts/demo/RUNBOOK.md` (+43) — so no run log was
ever committed anywhere. This row is the one entry in
`docs/plan/evidence/L-THE-EVIDENCE-A-STRANGER-CANNOT-REACH-IS-COMMITTED/evidence.md`'s five that can be
discharged as *unrecoverable with the reason*, and this is that record.

## What can still be established without a database, and what cannot

Verifiable statically at `lane/wf-demo-presence` (all read out of the committed script):

- the punches go over **HTTP to the product's own ingest** — `pos()` POSTs to
  `$API_BASE/workforce/pos/clock-events` on a genuine operator session, and `work_window()` asserts
  `.accepted == true` on the clock-in and `.sessionState == "Closed"` on the clock-out, recording the
  returned `openedUtc`/`closedUtc` into `PUNCHED_WINDOWS`;
- **no raw insert into the projection survives.** The six `INSERT INTO` statements left in the script are
  `Stores`, `StoreAdmins`, `WorkforceLegalEmployers`, `WorkforcePersons`, `WorkforceStaffMembers` and
  `StoreFeatureFlags`; there is no `INSERT` against the personnel-list entries table on either the branch
  or its base `de1e5c5e`;
- **step 13b is the guard, and it is designed against the impersonation.** It reads
  `GET $WF/personnel-list?businessDate=$day` for each seeded day and refuses unless: exactly 2 rows;
  both closed **by a superseding entry** (`onSiteEndUtc != null and supersedesEntryId != null`);
  `presentCount == 0`; every `category` is `Employee` — the one category the corrected § 8-5-6 caveat
  allows a clock to produce; and finally `diff` of the sorted punched window instants against the sorted
  sheet window instants, so *"the register must show the punched windows, not merely four windows."*

**What cannot be established:** whether that read returns anything. Every clause above is a property of a
script; the exit is a property of a **running world**. `demo-up.sh` needs a SQL Server container, a
migrated database seeded from empty and the API up. **This lane's brief grants class `node`, one point,
and no SQL slot**, and its boundary says never to start a container the brief did not grant and never to
touch one it did not create — three are running on this host, all owned by others.

## What it would take, stated so the next agent does not re-derive it

One SQL slot; `git worktree` at `lane/wf-demo-presence @ 8a9080c8` (or the branch's own worktree
`/Users/svendaneel/okam/wt-wfdemopres`, currently clean); `Scripts/demo/demo-up.sh` run from an **empty**
database against a container of its own; and the whole of step 13b's output written to
**`docs/plan/evidence/L-WF-DEMO-PRESENCE/`** — never to a shared scratch path, which is the only reason
this lane is being written up twice.

**Verdict: not closable in this batch.** The work looks sound and the guard is unusually well built
against the exact trap the exit exists to catch; there is simply nothing openable that shows it ran, and
producing one is work outside this lane's grant.
