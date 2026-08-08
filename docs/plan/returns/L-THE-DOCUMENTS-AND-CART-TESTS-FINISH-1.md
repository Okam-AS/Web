RETURN: L-THE-DOCUMENTS-AND-CART-TESTS-FINISH
brief: 0748c3d3
verdict: built
evidence: docs/plan/lanes/L-THE-DOCUMENTS-AND-CART-TESTS-FINISH/mutation-ledger.md
log:
Both inherited commits were real and complete. FE 4541e98 carried 4 suites/117 tests, BE 6859bdaa6 carried 19. The backend half the brief expected missing was present and green.
Judged each and kept all five files. They assert values not presence, drive two-store two-line worlds, and name exact strings. Nothing was discarded.
Applied 20 mutations, each restored after measuring. 19 red. The 1 that did not is defect A below.
evidence.js: reading the store-local stamp for the UTC twin reds 1/32; integrityFinding giving a clean bill to an absent document reds 3/32.
statement-client.js: trailing slash before the query reds 2/21; a locally re-derived content hash reds 3/21; plain filename beating RFC 5987 reds 3/21.
cart wire: Validate as POST reds 1/22; a failed checkout resolving not throwing reds 2/22; the legacy waiter-order default flipping reds 3/22.
cart state: SetLineItem upsert degrading to append reds 1/42; a raw splice(-1) taking the last line reds 1/42; SetCarts taking a non-array reds 1/42.
CartService.Validate: floor read off the total, capture guard removed, part-settling giftcard admitted, unapproved venue barred from cash, 20-min buffer cut. Each reds 1/19.
DEFECT A: the Load arm claimed it pinned parseInt's base-10 radix. ES5 removed octal, so dropping the radix stayed green. Retitled to pin the parse; keeping the string reds 1/42.
DEFECT B: the backend blocked-customer arm wrapped its only assert in `if (id != null)`, going vacuous the day BlockedUsers.Ids empties. Now asserts non-empty; dropping isUserBlocked reds 1/19.
DEFECT C: statement-client.js held a private character-identical copy of api-client's exported fileNameFrom. Deleted. Mutating the shared parser now reds 2/21, which it could not before.
C6 meals statement CLEAN: no statute printed, 3 routes live (MealsStatementController.cs:93,108,123), 12-line preamble, sort applied on build and read paths, hash and filename CORS-exposed.
C6 training evidence FINDING: no statute named (internkontroll banned from the UI at translations/no.ts:4744), but trn_ev_page_intro promises a record "slik den kan legges fram ved tilsyn".
No export of any kind exists: no PDF, no CSV, no download, not even a print stylesheet the personalliste has. Backend serves one JSON action. Reported not built; closing it is C3-shaped.
Rebased onto the moved trunk 780d405, clean. Frontend tier 157 suites / 3711 tests / 0 failed. Backend 19/19, SQLite in memory, no container. Created no worktree; reused the two inherited.
END RETURN
