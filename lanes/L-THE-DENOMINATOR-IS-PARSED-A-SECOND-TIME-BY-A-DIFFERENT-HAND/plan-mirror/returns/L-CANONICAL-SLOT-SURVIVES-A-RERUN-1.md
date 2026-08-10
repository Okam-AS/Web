```
RETURN: L-CANONICAL-SLOT-SURVIVES-A-RERUN
brief: 150d6ee6
verdict: built
evidence: /Users/svendaneel/okam/Web-modules/lanes/L-CANONICAL-SLOT-SURVIVES-A-RERUN/proof-hashes.txt
log:
Red at 8ac6f636: one re-run of the 3 committed journeys changed 5 of 16 tracked artifacts; green after, 0 of 16, all 3 passing. Hash = git ls-files artifacts/ piped to shasum, before and after.
The trap decided the fix: modal-* records predate backendBuild, so an incoming run OUTRANKS them — consulting rank before lineage would have left the orphaning exactly as it was.
So the standing canonical is asked whether git KEEPS it (index membership; check-ignore calls all 16 ignored). If it does no run displaces it: not stronger, not same lineage, not the provisional.
journey.js also sends that run's pictures to runs/<name>.<key>/ — without it the guard saves the JSON and the 7 tracked workforce PNGs still get overwritten. Regenerate = delete, re-run, add -f.
6 new pins built on a real git index (a tmpdir repo); every other test in that file runs where the question has no answer. 2 mutations red them. jest 129 suites/2998, guard-proof 15/15, this tree.
Commit f00d040 on lane/canonical-slot-survives-a-rerun; checkout put back on lane/focustrap-teardown, fix uncommitted there as other lanes sit. 27 of its 47 hunks are siblings' edits to those files,
labelled in lanes/L-CANONICAL-SLOT-SURVIVES-A-RERUN/hunk-inventory.txt — take the 20 marked MINE. .gitignore untouched. The 4 pre-existing dirty artifacts byte-identical to 08:02Z, in no commit.
END RETURN
```
