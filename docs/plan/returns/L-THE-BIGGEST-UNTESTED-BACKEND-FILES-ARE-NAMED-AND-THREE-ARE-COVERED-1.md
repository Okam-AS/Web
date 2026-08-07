RETURN: L-THE-BIGGEST-UNTESTED-BACKEND-FILES-ARE-NAMED-AND-THREE-ARE-COVERED
brief: 8ff1d2bf
verdict: built
evidence: docs/plan/artifacts/pos-uncovered-twenty.md
log:
Trunk had already moved to 057c390ad; branched lane/pos-coverage-opened at the stated 81d06c10a anyway so the 4937/0/10 baseline stays comparable. Not forced, not rebased.
Coverage measured in my own worktree, non-SQL tier, Migrations EXCLUDED and said so: 275 generated files and 635,874 line-entries at zero are 86 of every 100 denominator lines.
Coverlet's headline reads 8.7 for a backend that is at 63.3 excluding migrations. Instrumented run 4936 passed / 1 failed / 10 skipped of 4947, and every test is accounted for.
The single red is ConfirmationCodeEntropySourceTests refusing coverlet's injected Interlocked.Increment - the IL guard behaving, not a flake, and it passes uninstrumented.
Parser counts only class-level <lines> and asserts the cobertura header (64766/738199); pointed at the earlier census's own report first, it reproduced that document's top ten row for row.
Twenty largest named with measured figures at docs/plan/artifacts/pos-uncovered-twenty.md, plus ranks 21-40. Core/POS holds 33,410 of 37,559 uncovered non-migration lines; the twenty hold 12,544.
Four of the twenty read zero - WoltMenuSyncService, ProductService, Analytics/GeminiClient, WoltMenuController - and ten of ranks 21-40 do too.
Covered three carrying money or a statutory document rather than three cheap ones: CartService (2), InvoiceService (9), GiftcardService (20). Twenty tests, no production file edited.
DEFECT left failing - TransferGiftcard funds two wallets from one card, then EF's one-to-one fixup NULLs the old row's GiftcardId, leaving spendable money no gift card explains.
DEFECT left failing - GetInvoiceModel matches month sections on Completed.Month with no year while the guard permits 24 months, so a 14-month invoice listed 4 orders as 8 rows.
Eighteen mutations, one per passing test, each written into production source, watched red, reverted byte-identical, re-run green. Two more applied FIXES to prove the failing pins are pins.
Stale-build trap closed as CLAUDE.md demands: restore writes bytes then bumps mtime, WebApi.dll's mtime is asserted to MOVE across every build, and the restored file is asserted byte-identical.
I also caught two of MY OWN tests asserting worlds the product cannot produce, and one write-up claiming a constraint violation that running it refuted. Both corrected; both recorded.
Tier at the lane tip, from WebApi.Tests with the Database filter: 4955 passed / 2 failed / 10 skipped of 4967. The two reds are the named defect pins; the ten skips are the expected ones.
The non-SQL tier REWRITES tracked artifacts/journeys/ev-dietary/run-sheet.json every run; restored, not committed. Backend commit b368d930e. Worktree wt-posunc20 removed and pruned. Not pushed.
END RETURN
