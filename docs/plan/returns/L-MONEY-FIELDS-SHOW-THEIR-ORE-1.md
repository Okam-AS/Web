```
RETURN: L-MONEY-FIELDS-SHOW-THEIR-ORE
brief: 841913c5
verdict: built
evidence: lanes/L-MONEY-FIELDS-SHOW-THEIR-ORE/reachability-census.md, lanes/L-MONEY-FIELDS-SHOW-THEIR-ORE/red-01-shipped-page.txt, lanes/L-MONEY-FIELDS-SHOW-THEIR-ORE/green-02-full-suite.txt
log:
Measured on lane/focustrap-teardown 8ac6f63 WORKING TREE, not the shipped tip; ~394 foreign uncommitted paths present. Four files touched. No commit, no push, no container, no migration.
REACHABILITY ANSWERED FIRST: no automated writer in this estate can create an ore-carrying minimum. All THREE admin clients multiply whole kroner by 100 and floor on read.
The third is the native AdminApp/app/views/pages/DeliveryMethods.vue:318, a second admin client carrying the identical floor at :255. The brief named one writer; there are three.
Backend has ONE writer, StoresController.cs:563-570, which assigns `amount` straight to the column: no rounding, no multiple-of-100 rule, no validation. Bruno ships a request template for it.
So it bites by hand - that route or an edited row - and the honest fix is a field that shows what the column holds, not a constraint pretending it cannot. Full census in the evidence file.
OkamAPI read BY OBJECT at 8e2b57de from OkamAPI-modules, whose tree sits on the foreign branch lane/meals-grace-pins 34c6c10. Nothing was checked out there.
RED FIRST against the shipped page: 16 of 18 arms failed. Headline `Expected "150,50" / Received "150"`; a negative store `Expected "-150,50" / Received "-151"`, rounding away from zero.
FIX: the kroner/ore pair the delivery-method editor in the same file already uses, plus one exact-inverse conversion each way shared by the dirty check, the load, the blur and the POST.
BOTH DIRECTIONS PINNED: typing 50 into the ore box leaves the fake server holding 15050, and editing only the kroner over a stored 15050 leaves 20050 rather than 20000.
A CONSEQUENCE THE BRIEF DID NOT NAME: under the floor an ore component could not be REMOVED. Typing 150 over a stored 150,50 read 15000 on both sides, so no Save ever appeared.
THREE MUTATIONS, each restored: flooring the display reds 9 arms; posting kroner instead of ore reds 8 across both files; decomposing by decimal-string slice reds the round-trip range at -1 ore.
Not the mixin wholeAmount/fractionAmount, which slice the decimal string: -50 ore slices to a whole part of "-" that reads back as +50. Mutation C measures that claim rather than asserting it.
COMPOSES WITH L-SETTINGS-SAVES-REPORT-FAILURE: its 22 arms pass unchanged. Its fake backend moved verbatim to test/support/delivery-page-harness.js and one selector was renamed; no arm edited.
GREEN: these two files 40/40, whole repo 136 suites and 3106 tests, eslint 0 errors over all four files (155 style warnings, the same class the page already carried).
NO BROWSER ARM, so this is NOT acceptance: a fixture journey needs new routes in the shared 1719-line api-server.js and ports the brief calls foreign. No dev server ran, nothing hit a real API.
END RETURN
```
