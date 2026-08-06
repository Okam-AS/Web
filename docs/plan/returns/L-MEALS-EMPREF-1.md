```
RETURN: L-MEALS-EMPREF
brief: 224bc9b1
verdict: built
evidence: fact:meals.empref
log:
Built D-MEALS-EMPREF as ruled (nullable-copied-at-claim). Backend OkamAPI-modules 241e042e; frontend Web-modules 27e33a7. Not pushed.
Migration 20260731215452_Meals_MembershipEmployeeReference: nullable nvarchar(64) on MealsInvitations + MealsMemberships. No index, no FK, no backfill.
Chain is linear. Its Designer = the tip (Events_DietaryRequirements) plus exactly those 2 columns, nothing else. Sibling L-WF-IDREG generated 20260731220005 AFTER mine and its Designer contains my columns, so no two migrations share a parent. Verified again after they landed a04f51ca; 241e042e is still an ancestor.
Company supplies the reference at invitation issue; claim COPIES it onto the membership; MealsStatementService reads it into MemberDisplayRef, falling back to MembershipId. Resolved via a dictionary, not a join — an inner join would silently drop a member's allocations off the invoice.
SQL tier (5 new tests, migrated catalog): invitation issued -> claimed -> captured -> drafted -> FINALIZED line carries "ANS-2287". The columns are read from sys.columns, so it is the migration that created them, not the model.
Both brief claims verified rather than trusted. A membership row takes a raw UPDATE (no trigger, no GuardAppendOnly branch) so a live repair path exists. A finalized line does not.
The immutability pin is an UPDATE, not a DELETE, so FK-before-trigger cannot mask it; it asserts THROW NUMBER 50043; and a Draft control proves the same statement is executable before finalization. I ran the trigger-drop experiment: with TR_MealsStatementLines_FinalizedImmutable dropped the UPDATE simply succeeds (1 row), so the pin is trigger-caused. Probe deleted after the run.
Non-vacuity: reverting the statement fallback -> 4 red; removing the claim copy -> 2 red; frontend statementRef and payload mutations -> 3 red. All restored with cp + touch, rebuilt, re-green.
Suites: backend Meals 464 passed / 0 failed from a DETACHED WORKTREE at 241e042e (clean of sibling WIP); frontend 2140/0, up from 2127; eslint clean.
Beyond the column, because the decision would otherwise leak: a fødselsnummer is refused (both mod-11 digits, so 11-digit payroll numbers still pass; 11 zeros is the known false positive and is pinned, not hidden) — the value reaches a CSV the restaurant hands over. The concierge company-create takes the same field, or the founding CompanyAdmin is the one member nobody could ever label. Only PRESENCE reaches the append-only audit ledger.
Frontend was not optional: my own backend commit made the panel's MIG-17 danger note FALSE in three languages ("EmployeeReference ... do not exist yet"). Reworded, and the note + acknowledgement now show only while the field is empty. The member column shows what the statement will carry, badging the rows nothing can fix.
DEFECT, not mine: WorkforceW4MigrationLineageTests asserts an exact Workforce table count of 32; L-WF-IDREG's 33rd table makes it red on the shared tree. Green at my SHA. Theirs to update — the assertion is deliberately exact.
No persistent database was touched: every migration ran via MigrateAsync into Testcontainers-created localhost catalogs, each disposed. I started no container I did not also dispose, and killed none I did not create.
Sven still has to walk the invite -> claim -> statement journey in the UI (C5); a green suite is not that.
END RETURN
```
