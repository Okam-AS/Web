```
RETURN: L-THE-EVIDENCE-INSIDE-A-WORKTREE-IS-MOVED-BEFORE-IT-IS-PRUNED
brief: f8907cff
verdict: built
evidence: docs/plan/artifacts/evidence-off-the-worktrees.md @ e1b2314; the 21 copies at docs/plan/evidence/ @ fe85d27, force-added and confirmed tracked
log:
21 FILES COPIED OUT OF EPHEMERAL WORKTREES, 0 lost, 0 held. Copies only: no source touched, no worktree pruned, and each source asserted still present after its own copy.
THE CONVENTION: docs/plan/evidence/<LANE-ID>/<filename>. In the plan repo beside plan.md, so an evidence line can name it relative to the plan repo - the rule the sibling census recommended.
Why not the alternatives: a worktree path is the defect itself; an absolute path opens on one machine and its leading slash mis-sorted 104 lines; the code repo loses evidence when the branch does.
I CORRECTED MY OWN 53-AND-48. Re-derived at copy time it is 48 references, of which 21 are files and 27 name a worktree DIRECTORY rather than a file.
The earlier figure counted lines mentioning a worktree, not files to rescue. Both are right about different things; this one is the actionable one.
THE 27 ARE NOT A RESCUE JOB and should not be counted as one. They read like "OkamAPI worktree /okam/wt-x, branch lane/y @ sha" - the evidence is the BRANCH, which git holds durably.
Copying a directory reference would manufacture a file nobody wrote, so I did not. That is the same refusal as not re-manufacturing destroyed evidence, one step earlier.
NOTHING HELD. Every file read for credentials and eleven-digit identifiers: no credential, and no value passing a DATE-AWARE MOD-11 check.
The date test is new and it matters: my previous version accepted 00000000000, which satisfies the arithmetic but encodes no birth date. Adding it removed a false positive, not the real test.
The two trx files still held on the fodselsnummer ruling live in the backend repo and were not in scope here; they stay where they are.
WHAT THIS DOES NOT FIX, stated because the number will look repaired and is not: the evidence LINES still cite the worktree paths.
A sweep run tomorrow still reads 48 worktree references and still calls a vanished one destroyed. The files are safe; the citations are not. Rewriting them is editing a RETURN to suit a parser.
So this makes the loss survivable rather than invisible, and the citation question stays open for whoever holds that authority.
One honesty note on provenance: these are the bytes in those worktrees today, not provably the bytes a lane first produced. An edited worktree preserves the edited file.
Exits untouched, no trunk moved, backend 6d5328004 and 0 dirty, nothing pushed. Shell variables named src and dst, never path.
END RETURN
```
