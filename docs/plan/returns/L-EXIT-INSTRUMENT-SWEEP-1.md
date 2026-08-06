```
RETURN: L-EXIT-INSTRUMENT-SWEEP
brief: c9effc33
verdict: built
evidence: lanes/L-EXIT-INSTRUMENT-SWEEP/map.md
log:
88 CONFIRMED EXACTLY, by importing the plan tool and calling its own exit_tokens() on all 122 built-unverified exits: 14 name a fact, 20 a path, 88 neither. My hand pass said 89; the extra was L-WF-BOOTSTRAP, which names Scripts/demo/... - a real instrument in the WRONG REPO, unreachable from this repo root. All 88 placed: 14 case-1, 65 case-2, 9 case-3. Zero unmeasured.
YOUR 27 WAS MEASURING os.path.exists, NOT GIT. Only 8 of 88 have evidence in git ls-files; 21 more are on disk but UNTRACKED, 1 points into a session scratchpad, 40 name a worktree, 18 resolve to nothing.
docs/plan/ IS NOT IN GIT AT ALL - 0 tracked files, not ignored, never committed. The plan, 152 returns and all 22 review docs exist only in this working tree, so this evening's 22 "durable" fixes are one git clean from gone.
artifacts/ is gitignored BY DESIGN (.gitignore:98), so 19 of the 20 already-instrumented exits point into a directory git discards. Naming a journey capture is NOT a durability upgrade over naming a worktree file.
fact:journeys.browser CAN NEVER VERIFY ANYTHING - exists-extractor, refused by _evidence_kind_ok. Same for acct.uidx, wf.idreg, train.checklists; be.tests and fe.tests are suite-kind. 7 of 34 probes are structurally inadmissible as verification.
THE MERGE IS THE BLOCKER, NOT THE SENTENCE. 13 of the 14 files these lanes call their own deliverable are ABSENT on feature/restaurant-modules, and ../OkamAPI-modules is standing on lane/meals-grace-pins, so every backend probe reads a lane branch today. Writing those 65 exits now buys a queue of probes that all say unconf.
4 NEW STALE EXITS. L-PDF-NULLDEREF says six call sites, its own return measured EIGHT. L-CLIENT-TRAILING-SLASH says one route, measured THIRTEEN. L-FE-JOURNEYS-MERGE says four, measured six ("matched by coincidence"). L-EV-REFUND-FAKE-ARG says "at the branch tip" and is unmerged.
DUPLICATE CLAIM: L-COMPROOT-PIN-OVERDETERMINED and L-CONFIRM-POSTMERGE-PIN are the same commit 02c077cb, same worktree, same one file - verifying both counts one piece of work twice. Counter-example worth copying: L-MEALS-REACHABLE had its exit REWRITTEN when its ruling landed.
9 CANNOT BE INSTRUMENTED and six of them are one decision, not six: no probe executes, so "on a chain-built database" and "the full tier passes" have no admissible instrument - guard 1 is deliberate about that. The rest need a live Vipps approval, a deployment that answers 404, or a plan-check rule rather than a probe.
CHEAPEST WINS FIRST: 9 frontend lanes have a TRACKED pin file and need no merge, one exit line each. I opened every one rather than guessing and the check caught two of my own wrong picks - the pin collision I had written between the two flag lanes does not exist.
Proposals per lane are in the map file rather than items:, per the ASCII/separator conflict. Read-only throughout: no container, no migration, nothing pushed, plan loaded as a module and no state mutated.
END RETURN
```
