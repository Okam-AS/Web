# L-THREE-RETURNS-THE-TOOL-REFUSED — the three refused returns, traced and ruled

actor: agent:L-THREE-RETURNS-THE-TOOL-REFUSED · brief 5a3356fc · 2026-08-06
Method: every ancestry claim below is `git merge-base --is-ancestor`, every patch-equivalence claim is
`git cherry`, every file claim is `git ls-tree` at the named revision — never a branch name taken on
trust, never a `git grep` at a revision standing in for object content. Read-only throughout: no ref
was created, moved or deleted; no worktree was touched beyond `git status`/`git diff`.

Landing refs used: frontend `wip/session-2026-08-06-all-work` @ 0c1e4f9 and trunk
`feature/restaurant-modules` @ ff497c0 (the trunk has in fact moved — the 2026-08-06 landing is on it);
backend `lane/backend-patches-composed` and `integration/mig-stack-merge`.

---

## 1. L-MODAL-SEVEN-1.md — traced to a ref, and the ref is already landed. Discardable, or simply re-offerable.

**Trace.** The return claims `lane/modal-seven @ 839d377` off `lane/modal-scrolllock` (178c895).
Both objects exist; 839d377 is the branch tip. Both are **ancestors of the wip landing branch
(0c1e4f9) AND of the trunk itself (ff497c0)** — `git cherry` against wip is empty, and 839d377 sits in
108 local branches. All three evidence artifacts the return names are present in the trunk tree,
verified by `ls-tree` at ff497c0:
`artifacts/journeys/modal-estate-scroll-lock.playwright.json`,
`lanes/L-MODAL-SEVEN/red-probe-before-fix.playwright.json`, `test/modal-scroll-lock-estate.test.js`.

**How it landed.** Lane `L-MODAL-LAND` (state: verified) had exactly this exit — both modal journey
artifacts on `feature/restaurant-modules` with the suite green at that tip — and delivered it.
`L-MODAL-SCROLLLOCK` is now **verified** (plan.md:1500).

**Why the refusal has lapsed.** The tool refused this return because `L-MODAL-SEVEN` carries
`needs: L-MODAL-SCROLLLOCK` and scrolllock was then only built-unverified. Scrolllock is verified now,
so the recorded refusal cause no longer exists. First choice: **re-offer the return to the tool
unchanged** — it is well-formed (brief ee77fe83, compliant log) and its lane is `open`, which is a
state a return can normally land in.

**If the clerk prefers to discard instead, it is safe, and here is the written reason.** Every claim
the return certifies is ancestry-proven on the trunk; its evidence files are on the trunk; and both
defects it carried as findings are already harvested into open lanes — `L-MODAL-BROKEN-TWO`
(plan.md:1896, covering both the `ChangeDeliveryTypeModal` missing-helper throw and the doubled
login prompt) and `L-LOGINMODAL-MOUNTED-ONCE` (plan.md:16201). The stricter guards and the 29-modal
tripwire the return flags travelled inside 839d377 and are therefore landed too. Nothing this return
knows exists nowhere else. The only bookkeeping residue either way: the lane's own `state: open`
(plan.md:1749) is stale against a trunk that already contains its exit — the clerk's to close.

## 2. L-FE-WF-INVITE-LIST-REVOKE-1.md — traced to two refs, reachable from nothing that will land. Needs a successor lane.

**Trace, frontend.** `e8d69fc` exists, is the tip of `lane/fe-wf-invite-list-revoke`, and that branch
is the **sole ref containing it** (`git branch --contains`). One commit off e34977a, 23 files,
+1684/−71, including the full evidence pack **committed in the tree**:
`lanes/L-FE-WF-INVITE-LIST-REVOKE/{evidence.md, RESULTS.md, journey-artifacts/…}` — two playwright
journeys with PNGs and run logs. It is **not** an ancestor of wip (0c1e4f9) or the trunk, and
`git cherry wip… lane/fe-wf-invite-list-revoke` prints `+ e8d69fc`: **no patch-equivalent commit
exists on anything that will land.**

**Trace, backend twin.** The return and plan.md:10434 bind this branch to backend
`lane/wf-invite-list-revoke @ 68f2472c` ("Workforce: a manager can see live invitations and withdraw
one"). That commit exists in OkamAPI-modules, is the branch tip, and is additionally preserved on
`wip/rescue-2026-08-06-wt-wfinvlist` (whose tip c089649eb also rescues that worktree's uncommitted
dirt). It is **not** reachable from `lane/backend-patches-composed`, from
`integration/mig-stack-merge`, or from the backend trunk. So **both halves of the pair are outside
every landing composition.**

**Not superseded — checked, not assumed.** The wip branch still ships the falsehood this lane
removed: `wfr_access_no_list` is defined in all three locales (translations/en.ts:3143, no.ts:3199,
de.ts:3147 — "the API has no such routes") and rendered at
`components/admin/workforce/WorkforceEngagementPanel.vue:134`. `L-WFR-ACCESS-STRING-TRUTH` verified
by reading routes at the tips that the copy is true only because **neither** half landed, and ruled
the two must land together: backend alone makes the shipped sentence false, frontend alone binds 404s.

**The worktree-only find, and it is exactly the case the brief said to look for.** The worktree
`/Users/svendaneel/okam/web-fe-invlist` carries **4 dirty files committed nowhere**: the 2026-08-04
re-run of the onboarding journey (`artifacts/journeys/workforce-invitation-onboarding.playwright.json`
+ 3 PNGs, ports 3311/4311 against e34977a) — the very run the return cites, which **drops the
standing "wanted: list+revoke routes" finding** and replaces it with "the panel no longer claims it
cannot list or revoke". `e8d69fc` touches nothing under `artifacts/journeys/`, so this evidence exists
only in that worktree; remove the worktree and the branch keeps only the stale 2026-08-03 run.

**Ruling: successor lane.** The lane is `retracted`, the return is permanently unmergeable
(refused on a `needs: -` placeholder, author unresumable — F-NEEDS-PLACEHOLDER-REFUSES-A-GOOD-RETURN),
and the work is real, verified by a sibling lane, and reachable from nothing. Name for the clerk to
author: **`L-WF-INVITE-PAIR-LANDS`**. Its exit, as I would write it: *backend 68f2472c is reachable
from the backend landing ref and frontend e8d69fc — rebased over the moved frontend tip — is
reachable from the frontend landing ref, in the same landing window with backend first or together;
at the merged tips a manager lists live invitations and withdraws one through the roster panel, and
no locale any longer defines `wfr_access_no_list`; its first act commits or explicitly rejects the 4
dirty files in web-fe-invlist.* It should carry the original return's own named residuals:
fixture-divergence never run against wt-wfinvlist, and revoke-conflict walked at SQL only, never in a
browser. Known rebase risk to state in the brief: `translations/{en,no,de}.ts` and
`WorkforceEngagementPanel.vue` are modified on both sides of the merge-base.

## 3. L-GUARD-DEMO-1.md — traced to committed content on the landing refs. Nothing to rescue; the return itself is Sven's, not discardable by us.

**Trace.** The return names no branch and no commit — it was traced by object content, per the
measured `git grep`-at-a-revision trap. Everything it claims exists and is tracked:
`scripts/drift-demo/demo.sh` (181 lines, the five ACT blocks at lines 59/87/127/142/157) and
`scripts/worldstamp` are committed on wip (be3e6b1, ancestor of 0c1e4f9) **and are already on the
trunk** via 11be859 ("The 2026-08-06 session's frontend code, separated from its evidence", ancestor
of ff497c0). The evidence transcript `lanes/L-GUARD-DEMO/demo-run.txt` (55 lines) is committed on wip
and matches the return's claims line for line — its closing summary reads
`caught+falsified: 8  shown-uncatchable: 2  failures: 0`, which is the return's "8 catches each
falsified, 2 misses shown. 0 failures". The bench it ran on was a scratchpad checkout and is
expendable by the return's own words ("the real estate is never the bench"); nothing of it is needed.

**Why it was refused, precisely.** Two independent gates: the lane is `open` with
`needs: L-GUARD-W0` and W0 is only built-unverified; and the return's `log:` body is 16 physical
lines against the cap of 15 (recorded on F-NEEDS-PLACEHOLDER-REFUSES-A-GOOD-RETURN as the fifth
instance, "unrecoverable" — the author has been gone since 2026-08-02, and the clerk rightly will not
hand-edit a witnessed return). Note the loop: **L-GUARD-W0's own evidence field points at this very
`demo-run.txt`** (plan.md:5564), so verifying W0 is the gate on any recording path for this verdict.

**Ruling: no successor lane is needed for the work, and the return file must be held, not
discarded.** The mechanism has landed on the trunk, the transcript rides the wip landing branch, so
this is the one of the three where the bookkeeping lost only the verdict, not the work. The return is
the sole witnessed verdict of a gone author and is cited by an open flag owned by @sven whose
`clears_when` is not yet met — discarding it would decide, from a lane, a question the plan has
explicitly routed to the owner (the missing tool verb for a witnessed return whose author is gone).
Hold it in returns/ until that ruling. **If** the clerk needs the lane closed under today's tool
rules without waiting: name **`L-GUARD-DEMO-REWITNESS`** — exit: *the committed
`scripts/drift-demo/demo.sh` is re-run by a live author on a fresh bench, and a compliant return
records the same two-sided result — every catch falsified by removing its guard and re-injecting,
both uncatchable classes stated with their reasons — superseding the orphaned verdict without editing
a word of it.*

---

## Summary table

| Return | Object | Sole/landing refs | Reachable from what will land | Ruling |
|---|---|---|---|---|
| L-MODAL-SEVEN-1 | 839d377 (tip lane/modal-seven) | trunk + wip + 108 branches | **yes — on the trunk itself** | re-offer to the tool (refusal cause lapsed); else discard, reason written above |
| L-FE-WF-INVITE-LIST-REVOKE-1 | e8d69fc (sole ref lane/fe-wf-invite-list-revoke) + backend 68f2472c (lane/wf-invite-list-revoke, rescue branch) | lane branches only | **no — neither half, plus 4 files only in a worktree** | successor lane **L-WF-INVITE-PAIR-LANDS** (clerk authors) |
| L-GUARD-DEMO-1 | content: be3e6b1 (wip) / 11be859 (trunk) | wip + trunk | **yes — code on trunk, transcript on wip** | hold the return for @sven's flag ruling; optional successor **L-GUARD-DEMO-REWITNESS** |
