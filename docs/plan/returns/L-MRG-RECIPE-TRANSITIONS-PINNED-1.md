```
RETURN: L-MRG-RECIPE-TRANSITIONS-PINNED
brief: 5bd46e41
verdict: built
evidence: /Users/svendaneel/okam/web-mrgtrans/lanes/L-MRG-RECIPE-TRANSITIONS-PINNED/mutation-log.md
log:
Based on candidate/fe-compose-2026-08-05 (f40fdf3), verified: its page IS 0c483de and equals c429d51 byte for byte, its suite equals 8ac314c, and 0c483de is still no ancestor of lane/mrg-revise-land.
Measured before building: PRIOR, the pinned suite as landed, runs 31/31 GREEN on this page unmodified. These are ADDITIONS closing a measured gap, not repairs of a red.
EXIT MET, each unbind red on its OWN arm, page restored between arms: new-draft 2, save-draft 4, add-draft 2, remove-draft 2, retire 2 of 42. PRIOR reds 0 in all five; 42/42 restored.
11 tests added, every action entered through the screen; each of the five has a test depending on IT and on no other of the five, so an unbind is attributable rather than merely noticed.
pressTest presses by the page's own data-test name: the draft editor reuses mrg_component_add and the remove "x" the recipe form above it owns, which button() must refuse as ambiguous.
TRAP measured, not asserted: a bound-but-disabled save-draft fires 4/4, and DELETING the trap reds the SAME 4. It improves the sentence, it is not the detection; kept, and the log says exactly that.
Census re-measured all EIGHT pre-existing controls: none changed status; refresh, copy-starter and remove-component are still UNPINNED and still named. select-recipe 11 -> 22 reds, status unchanged.
No "any control" claim anywhere -- three controls on this page unbind cleanly green. Scratch is LANE-LOCAL (lanes/<lane>/.tmp); log regenerated whole, run twice and diffed byte-identical.
Numbers: suite 6ba1f00 x page 0c483de; log 9cca3dc on lane/mrg-recipe-transitions-pinned, worktree /Users/svendaneel/okam/web-mrgtrans, unpushed, explicit pathspec. Tree + eslint clean.
END RETURN
```
