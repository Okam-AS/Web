```
RETURN: L-MRG-WASTE-RECEIPTS
brief: 27c5b15d
verdict: built
evidence: /Users/svendaneel/okam/web-wastereceipts/lanes/L-MRG-WASTE-RECEIPTS/RUN.md @ 87702ef
log:
- RECEIPT COMMITTED: 87702ef on lane/mrg-waste-receipts -> lanes/L-MRG-WASTE-RECEIPTS/RUN.md.
- THE OLD ARTIFACT CANNOT COVER 7b99f2a: artifacts/tests/frontend/jest.json is gitignored (never
  committed), ran 19h29m earlier, and holds NO margin-waste suite -- a tree without the panel.
- AT THE WASTE COMMIT, CLEAN WORKTREE: 93 suites, 2183/2183, 0 failed (parent a234509c: 2154).
  node_modules proven valid at both SHAs; core submodule populated at each SHA's own gitlink.
- "22" IS reconstructible but SHORT BY 7. Diffed on NAMES: ADDED 29 / REMOVED 0 = 22 (new file)
  + 7 into margin-statements-page.test.js -- the seven proving the panel is wired to the page.
- PRESENCE TEST: test/translation-key-presence.test.js, 11 tests, covering the two dynamic
  lookups no $i(' grep can see. FALSIFIED by 7 mutations, each restored byte-for-byte.
- PREMISE CORRECTED: utils/i18n.js falls back active->no->en->de->key, so a one-locale gap shows
  NORWEGIAN to an English operator, not a raw key. Raw needs all three missing; there are 0.
- FINDING: 34 rendered keys are Norwegian-only (index.vue, GoodsGroupsTab.vue, products.vue),
  pinned as debt, ratcheted both ways. translations/*.ts NOT touched by this lane.
- FINDING: journey-artifact-store.test.js:295,457 pin the checkout's DIRECTORY BASENAME to
  "Web-modules", so it is red in EVERY lane worktree. Pre-existing. C5: UI unwalked. No push.
END RETURN
```
