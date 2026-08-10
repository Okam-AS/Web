```
RETURN: L-PROVENANCE-EXCLUDES-LANE-EVIDENCE
brief: 56e2c8d4
verdict: built
evidence: lanes/L-PROVENANCE-EXCLUDES-LANE-EVIDENCE/run.md
spec_gap: none for the exit; live-world.sh's substituted call is proven standalone but the script itself needs a SQL container and this brief grants no slot
log: Exclusion built, argued against the convention rather than picked. Rule: an UNTRACKED path under lanes/ or docs/plan/ is not a change to the build; everything else is. Commit 607f138 on lane/provenance-excludes-lane-evidence off 7030c00, worktree /Users/svendaneel/okam/web-provexcl, unpushed.
Both arms, real prover, this lane's logs on disk inside the tree: evidence-only -> web-provexcl@607f1385... clean; one line appended to utils/price.js (occurrences asserted = 1) -> web-provexcl@607f1385...+dirty. runs/build-provenance-at-607f138.txt and runs/build-provenance-SOURCE-DIRTIED.txt.
BEFORE arm at pristine 7030c00 reproduces the defect: one run log under lanes/<L>/runs/ -> fixture@7030c00...+dirty. Full 8-arm transcript in arms.txt.
Narrowness proven three ways, each paired with a red: a COMMITTED receipt under lanes/ rewritten still says +dirty (untracked-only, not a directory exclusion); lanes-archive/ and docs/plan-old/ still say +dirty (the trailing slash is load-bearing); clean again after each, so the reds were caused by the write under test.
The exclusion never fires silently: dirtyOf returns the ignored count and it lands in backendBuild.detail on the artifact - "3 untracked paths under lanes/ or docs/plan/ ignored as lane evidence". A clean id that was merely unexamined says so on its own face.
Corpus lies NOT whitewashed, measured: applying the rule to the shared checkout today gives ignored=1221 changed=135 dirty=true. And for row 39 it is provable - 997936a's arm-3 receipt carries proxiedSubjectServed, e34977a's journey.js does not emit it, 9d4399a's does, so a non-excluded path was dirty at that capture. Verified in this lane, not taken on report.
Row 18 (22f21082) has no equivalent tell; stated as undetermined rather than generalised.
Found and fixed a real trap mid-build: git status --porcelain collapses a wholly-untracked directory to its topmost ancestor, so docs/plan/returns/X.md reports as "?? docs/" and no prefix rule can read it. -uall is now mandatory in the rule. The paired test caught it, not review. Cost 0.066s on a 1356-entry tree.
Three independent implementations of "is this tree dirty" existed at 7030c00 (artifact-store.js:187, world-stamp.js:168, live-world.sh:189) and agreed only by being copies. Unified on worldStamp.dirtyOf; the shell now calls "node world-stamp.js built <repo>". Two of three excluding and one not would have printed the drift as resolveBackendBuild's "this overrode E2E_API_BUILD" - drift dressed as the guard working.
A fourth site, fixture-divergence.js:75, uses --untracked-files=no (broader) for a human-readable note only; keys nothing, reaches no artifact, deliberately left alone and named so nobody reads the unification as total.
Both provers still green together at the new ref: guard-proof 10/10 EXIT=0, build-provenance 5/5 EXIT=0, journey.js sha 6dd043e1... byte-identical to 7030c00 (the file they testify to was not touched), copier still resolves 5 support files.
Jest: 6 tests added, all green. 42 pass / 2 fail vs baseline 36 pass / 2 fail. The 2 are pre-existing, reproduced at pristine 7030c00 in a scratch worktree - they pin the literal basename "Web-modules". eslint exit 0 on all three JS files; bash -n clean.
MERGE HAZARD: the shared checkout holds an uncommitted 572-line world-stamp.js (this ref has 307) adding W1/W2 machinery and its OWN inlined buildTokenOf, with no dirtyOf. Its live-world.sh already calls "built" at line 301, after the binary is built - a better position than this lane's line 187. Take that lane's structure, keep only dirtyOf/isEvidencePath/EVIDENCE_ROOTS/evidenceNote, drop this lane's shell edit. Overlaying whole would silently revert their work.
This lane's own evidence is inside the worktree it measures, at lanes/L-PROVENANCE-EXCLUDES-LANE-EVIDENCE/ - run.md, arms.txt, 3 run logs and 5 artifacts. That placement is the claim: if the change is wrong, these ids are the first thing to go +dirty.
No push, no shared branch, no container, no migration, no money-path write. Port 4010 never bound, pid 73160 never signalled. One stderr log line added, carrying a count and two directory names (C7 clear).
END RETURN
```
