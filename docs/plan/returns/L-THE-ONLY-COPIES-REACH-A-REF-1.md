```
RETURN: L-THE-ONLY-COPIES-REACH-A-REF
brief: 60c47924
verdict: built
evidence: docs/plan/returns/L-THE-ONLY-COPIES-REACH-A-REF-1.md
log: Verified all four objects exist; tested with for-each-ref --contains plus rev-list over named refs only (--single-worktree), since --all silently includes other worktrees' detached HEADs.
FALSE ALARM 1 - 94f06c7 (tripletex.vue + 130-line test): merge-base --is-ancestor YES against feature/restaurant-modules, 21 commits below ff497c07. The landing carried it. No branch minted.
FALSE ALARM 2 - d7b5f3f (Wolt Drive setup page, asharghi 2026-08-04): git rev-parse origin/main == d7b5f3f26e. It IS the tip of origin/main, so it is pushed to the remote. No branch minted.
Census row 4 is wrong: it recorded "exists on 10 worktree-agent refs and nowhere else"; it missed refs/remotes/origin/main and refs/prefcentre-exec/main. 12 refs contain it.
AT RISK 1 - bfa1992 (German identifier labels, 4 files / 415 lines): 0 of 194 refs contained it.
Not patch-carried: patch-id a4b485eb matched no commit in the last 400 on trunk; 2 of 4 files absent at trunk; needle scanned across all 194 ref-tip trees gave 0 hits; test file at 0 ref tips.
Its only holder was a detached HEAD in the session scratchpad /private/tmp/.../wt-german-ids - a path that vanishes with the session, so sharper than the census implied.
AT RISK 2 - 66f19e23 (ModelVersusChainDriftTests.cs, 382 lines, parented on stack tip 7f8945dc = integration/mig-stack-merge): 0 of 414 refs contained it.
Not patch-carried: the file exists at 0 ref tips; blob 7e92d2cf unreachable from named refs; only holder was the detached HEAD at ~/okam/wt-pendmodel.
Created refs/heads/preserve/german-identifier-labels -> bfa1992 (Web-modules) and refs/heads/preserve/model-versus-chain-drift-test -> 66f19e23 (OkamAPI-modules).
Chose the preserve/ prefix over lane/ so a landing sweep does not mistake either for integration input; neither is merged, rebased, landed or pushed, and no ref was deleted.
Post-condition: both blobs are reachable from a named ref under --single-worktree, and git fsck --unreachable lists neither commit.
Both checkouts untouched: FE HEAD stayed on its session branch (32 dirty entries unchanged), BE HEAD stayed on its rescue branch.
Backend trunk read fresh at 8e2b57de with its checkout at 5243c06a; the landing lane's movement changed neither finding.
END RETURN
```
