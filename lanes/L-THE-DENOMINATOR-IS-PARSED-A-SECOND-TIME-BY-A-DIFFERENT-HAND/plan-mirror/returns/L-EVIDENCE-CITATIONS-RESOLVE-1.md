```
RETURN: L-EVIDENCE-CITATIONS-RESOLVE
brief: 59e0bc07
verdict: built
evidence: lanes/L-EVIDENCE-CITATIONS-RESOLVE/citations.md
spec_gap: The brief's three classes cannot hold the result: measuring forced five more (tracked-dirty, untracked-not-ignored, wrong-path-same-repo, elsewhere-in-estate, in-cited-commit), and the largest bucket by far is none of the three.
reason: nothing stopped; census complete over both repos, read-only, nothing repaired
log:
1987 citations from 559 evidence lines: plan.md (276) + returns (283 files). Read-only.
1300 resolvable, 533 untracked-never-committed, 74 ignored-by-git, 34 resolvable-but-not-where-cited, 10 tracked-dirty, 35 unresolvable.
F-COMMIT-TREE-LEAVES-NO-REF: 527 commit ids, 524 on a ref. ONE dangling: f176db85 (L-EV-SEED-DEPOSITS). Its branch moved to caee6ae3; the same commit message is on the branch as 7a6d9798, so the citation is dead and the work is NOT lost -- two findings, not one. That lane is state:open / verdict:fail-spec, so consequence is low. Commit discipline is otherwise sound.
F-EVIDENCE-GITIGNORED: 74 citations, all from the unanchored `artifacts/` rule (matches lanes/<LANE>/artifacts/ too). This is deliberate policy, not an accident -- 16 journey files are force-added as named exceptions. The finding is that 74 citations sit on the wrong side of that exception.
BIGGEST FINDING, and it is none of the three classes: `docs/plan/` is entirely untracked (`?? docs/plan/`), and plan.md appears in NO reachable commit. plan.md, 283 returns, 300 briefs and 22 reviews are working-tree-only. 45 citations point into docs/plan/ itself, incl. the six module reviews that six lanes name as their sole evidence. A PR from feature/restaurant-modules today carries neither the plan nor the reviews.
Fourth column CONFIRMED as its own class: tracked-dirty (10), the jest.config.js shape -- cited, present, tracked, content only in the working tree; every reachability check reads green while one `git checkout --` erases it.
INSTRUMENT: validated in both directions before any zero was reported. cbb5a98 reproduces as worktree-head-only (NOT plain dangling -- it is pinned by web-jestlanes); e34977a/82127eb/8e2b57de as on-ref; deadbee as no-object; a known-absent path as absent. Refs enumerated across refs/heads + refs/lanes + refs/salvage (119 web / 339 backend) plus 397 worktree HEADs.
CROSS-REPO was the dominant error source: naive two-root checking scores 238 paths absent; the true figure is 3. Five corrections got there, each forced by hand-checking a result that looked wrong -- worktrees named on the same line, brace suffixes, cited-commit trees, docs/plan/lanes, sibling checkouts.
The brace bug is the cautionary one: `lanes/X/{a,b}.txt` puts the extension after `}`; dropping it turned six existing tracked files into six absent citations that ranked FIRST by consequence.
Two repairable-but-not-absent classes named in full: wrong-path-same-repo (5 lanes cite lanes/<L>/ for files at docs/plan/lanes/<L>/) and elsewhere-in-estate (13, evidence only in unmerged worktrees). Web-modules/lanes/L-COERCION-WRITE-PATHS/ is the sharp case: the dir exists on integration and is EMPTY while web-coercwrite holds the files -- a hollow link, not a broken one.
Of the 35 unresolvable, 28 are under-specified rather than missing (bare filenames like base.trx/api.log, or shorthand like `.../3cf288fb.../RUN.md`); 5 name a file that exists nowhere; 2 are commit ids. Almost nothing points at lost evidence.
Two lane-state mismatches noticed in passing, recorded but not ruled on: L-MEALS-FUNDED is state:verified in plan.md while its return is verdict:fail-spec; same for L-EV-SEED-DEPOSITS at state:open.
Backend read as instructed: OkamAPI-modules is on lane/meals-grace-pins (34c6c103), so backend paths were resolved by object against refs/heads/feature/restaurant-modules (8e2b57de), never from its working tree.
NOT DONE, by instruction: no citation repaired. Whether docs/plan/ and journey captures should be committed is a decision about what this repo is for, and belongs to a later lane with an owner. Caveat on my own evidence: lanes/L-EVIDENCE-CITATIONS-RESOLVE/ is itself untracked-not-ignored -- this return cites a file in the very class it reports as the largest.
END RETURN
```
