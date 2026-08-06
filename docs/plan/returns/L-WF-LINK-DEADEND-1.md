```
RETURN: L-WF-LINK-DEADEND
brief: 5be04962
verdict: built
evidence: backend OkamAPI lane/wf-link-deadend @ a3a526ae, worktree ~/okam/wt-wflinkdead, based on lane/wf-blind-bind-name @ 3b593fef, NOT pushed - container-free tier (--filter "Database!=SqlServer") 4397/0/12 vs the parent's recorded 4392/0/12, delta +5 = the new tests, 0 regressions - WebApi.Tests/Workforce/WorkforceOperatorLinkDeadEndTests.cs (3), WebApi.Tests/Wire/WorkforceOperatorLinkWireTests.cs (+2) | frontend Web lane/fe-wf-link-deadend @ bed932e, worktree ~/okam/web-linkdeadend, based on lane/fe-wf-blind-bind-name @ c67df92, NOT pushed - jest 99 suites/2296 vs a 2292 baseline I measured myself at c67df92 in a throwaway worktree, delta +4 | runs: lanes/L-WF-LINK-DEADEND/{backend-containerfree.txt,frontend-jest.txt,frontend-jest-baseline.txt} | detail: lanes/L-WF-LINK-DEADEND/detail.md
log:
BASE, recorded: tip 35696d6b does NOT carry CorrectLinkAsync at all - it exists
only on the unmerged lane/wf-blind-bind-name (merge-base 3579bbbc). Built there;
all four legs of the dead end re-verified at 3b593fef first. Not stale.
Holder query mirrors the candidates read (materialise, OrderByDescending
IsActive, First). The tracked re-read guard also dropped its IsActive check: it
guards the link MOVING, and a row that ended in between still holds the id.
Import pre-check deliberately UNCHANGED - letting an ended link stop counting as
AlreadyImported would create the second live link L-WF-OPERATOR-UNIQUE forbids.
Pin: import -> PATCH deactivate -> withdraw -> re-import, both doors asserted
shut first, at service tier AND over HTTP. 5 mutations each applied, watched
red, restored, watched green (table in detail). Withdrawal never revives.
Lever landed: the panel's withdraw control now gates on correctableLink (active
first, the server's rule), with its own ended-case confirmation; wfoi_linked_to
_ended claimed "a new link is not possible" - corrected in no/en/de.
NOT DONE: nobody has walked it in a browser. C5 is Sven's, not the suite's.
END RETURN
```
