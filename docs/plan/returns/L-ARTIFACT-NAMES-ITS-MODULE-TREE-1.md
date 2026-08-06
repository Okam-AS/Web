```
RETURN: L-ARTIFACT-NAMES-ITS-MODULE-TREE
brief: 6305a954
verdict: built
evidence: lanes/L-ARTIFACT-NAMES-ITS-MODULE-TREE/run.md
log:
8fa3f6d..c3024b8 on lane/artifact-names-its-module-tree, worktree /Users/svendaneel/okam/web-modtree off 8ac6f636. No push, no npm install, no container, 4010 never bound; 8 files, no rename.
New moduleTree beside commit: state(symlink|own|absent), REALPATH, owner, shared, root, buildDir{command,realpath,inside,shared,exists}, source. Nothing renamed; a test pins the 14 old ledger keys.
EXIT: modal-scroll-lock walked twice in ONE tree at f8980ef, symlinked then cloned. Same journey/commit/status/key; state, realpath, owner, shared and ledger token (shared:Web-modules vs own) differ.
FALSIFIED: realpathOf(own)->own (path not realpath), A re-run: realpath/owner/shared collapse onto arm B, only state survives and it cannot name WHICH tree. jest 5F/15P mutant, 20/20 reverted, grep 0.
buildDir is the USED one: dev/build=.nuxt (config.js:139,:538; cli-dev/cli-build assign none), generate=node_modules/.cache/nuxt (cli-generate.js:128), export delegates (cli-export.js:36).
Absent tree reads state:absent+realpath:null, never a missing field; a broken symlink stays symlink. The block is the SERVER's, stamped by dev-server.js, refused if its pid is gone or off the port.
jest 2571P/2F, both PRE-EXISTING at 8ac6f636; guard-proof 10/10 (could not LOAD at HEAD, repaired); build-provenance 5/5; eslint clean. HAZARD: git stash is SHARED across worktrees, do not stash.
END RETURN
```
