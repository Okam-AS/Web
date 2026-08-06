```
RETURN: L-WHICH-EVIDENCE-CAME-FROM-A-BORROWED-TREE
brief: b198ac6d
verdict: built
evidence: /Users/svendaneel/okam/Web-modules/lanes/L-WHICH-EVIDENCE-CAME-FROM-A-BORROWED-TREE/census.md
log:
NARROWED BY MEASUREMENT: the symlink redirects `npm run generate` ALONE. cli-generate.js:128 moves buildDir into node_modules/.cache/nuxt; dev/build keep .nuxt inside the worktree (config.js:139).
SO JOURNEYS ARE NOT IMPEACHED: playwright.config.js:95 -> dev-server.js:41 spawns nuxt-ts with no subcommand = `nuxt dev`. Jest maps ~/ to <rootDir> and reads neither build dir. Both are out of it.
ARMED NOW: the shared .cache/nuxt/components/index.js (08:02) holds 191 entries and declares MealsReconciliationQueue.vue - absent from the shared checkout's 197 .vue, present in 11 other worktrees.
STATES, 124 worktrees at 09:46: 91 symlink (88 to Web-modules, 2 to web-journeys, 1 to Web), 15 own, 18 none. The brief's 21-none is the 04:09Z figure; the population moved, neither count is wrong.
47 trees really ran nuxt (.nuxt is gitignored, so it proves a local run) or hold own-produced artifacts: 29 symlink, 12 own, 6 that BUILT yet hold no module tree today - run-time state unknowable.
POPULATION 74 lanes; 23 tree-attributable, 51 UNKNOWN (worktree gone or never named) - unknown IS the answer. Exposed class has ONE member, L-DUPLICATE-KEY-IN-THE-BUILD, which re-measured itself.
MY OWN FAULTS, KEPT: -uall still hides IGNORED files (saw 5 artifact trees, truth 35); loose name-matching mis-placed 2 lanes. Nothing re-run/installed/repaired; L-WF-OPLINK is worth a re-measure.
END RETURN
```
