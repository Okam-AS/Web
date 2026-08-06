```
RETURN: L-PLAN-LIVES-IN-GIT
brief: 2290eb92
verdict: built
evidence: lanes/L-PLAN-LIVES-IN-GIT/evidence.md
log:
- Branch plan/docs-20260806 exists locally at 54d4dfc: orphan, 444 files, 3.59 MB, no code. Primary index fingerprint identical before and after (1785918138 89350); no `git add -A`, no stash.
- PUSH IS UNPERFORMED AND OWED: `git -C /Users/svendaneel/okam/Web-modules push origin plan/docs-20260806:refs/heads/plan/docs-20260806` — dry run exit 0; origin still shows 0 plan heads.
- Fresh-checkout proof: clone --single-branch over file:// into lanes/L-PLAN-LIVES-IN-GIT/fresh-clone. find gives 444 files, 0 dirty paths, top level is docs/ alone.
- Opened in the clone: plan.md (25,686 lines, signed 7c84435b), returns/L-ABSENCE-AUDIT-CONDITIONS-1.md, reviews/L-CONFIRM-CHAIN-REVIEW.md. All 444 hash-equal: identical=444 differs=0.
- Measured: 863 files under docs/plan, 419 ignored by docs/plan/.gitignore (briefs/ render/ *.tmp-plan) plus root *.log; 444 addable = plan + 415 returns + 22 reviews + 3 walks.
- The ignore is sound, not loss: `plan` write_briefs() at line 1904 regenerates briefs per dispatch; render/ is a rendered view; stamps.log is a log. Tracking them adds ~46,986 lines a day.
- Brief correction: 4 return files ARE tracked, swept into commits on candidate/fe-compose-2026-08-05 and 5 lane branches. plan.md, intent.md, log.md and all 22 reviews: zero branches.
- Snapshot ref 212a2b8 re-measured at 812 files and is NOT current: stale by 57 files (29 briefs, 28 returns), 11 changed contents, 3,107 lines, in 23 hours.
- Its 6 apparently-missing paths are not lost: docs/plan/lanes/ moved to repo-root lanes/, all six byte-identical. Nothing in the ref is unique; this lane neither deleted nor resurrected it.
- Unreachable, not merely stale: 0 refs/lanes on origin, and the clone refspec is +refs/heads/*:refs/remotes/origin/* so no clone would fetch it even if pushed.
- feature/restaurant-modules is on NO remote (one remote; origin carries 7 heads); it exists locally at e34977a. This push would be the program's first arrival at origin.
- WHERE, measured: one day of plan churn = 30 files, 3,107 insertions, 211 deletions vs focused lane diffs of 5-16 files / 400-1,387 lines. 2x-6x a whole lane, every day.
- Recommendation, not a ruling: dedicated branch, ONLY IF the refresh has an owner — a stale branch presents superseded rulings with plan.md's authority. Detect and refresh are each one command.
- zsh trap: `while read -r sha path` destroys PATH (path is zsh's array alias); every command in the loop body vanishes with command-not-found and never names the cause.
END RETURN
```
