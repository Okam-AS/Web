```
RETURN: L-XZ-NEGATED-ABSENCE
brief: 3881dcd4
verdict: built
evidence: lanes/L-XZ-NEGATED-ABSENCE/mutation-log.md · commit b150668b on refs/lanes/L-XZ-NEGATED-ABSENCE
spec_gap: the same construction lives at PosReceiptView.vue:57, CheckLine.vue:55 and CheckPanel.vue:118 — the first is itself a fiscal artifact, all three are outside this lane's exit criterion and untouched.
reason: nothing stopped; exit criterion met and mutation-proved.
log:
BASE c4a4fa44 (refs/lanes/L-PRICE-BYPASS-FIVE), NOT tip e34977ac: my change builds on its
absence rule and the working tree already matched it byte for byte. Commit b150668b via a
private GIT_INDEX_FILE; no checkout -b, branch left at e34977ac, nothing pushed, no container.
TWO commits share that message — 8c6e91fa and c4a4fa44, neither an ancestor of the other, and
byte-identical on both files I touch, so this composes with whichever one lands.
COUNT CONFIRMED SIX: 51/54/88/94/97/178, every brief line number correct. The RETURER section
prints the same buckets UNSIGNED and was never broken — that is why it is six and not eight.
Reproduced verbatim by mounting at c4a4fa44: "pos_report_negative_sales (2)−—", as reported.
FIX: negatedAmountLabel in utils/price.js beside statedSum/isAmountStated — no second answer
authored. Sign resolved ONCE from the negated value; the formatter only ever gets a MAGNITUDE
because core priceLabel renders -4 as "kr 0,-4" and -50 as "kr -,50" (verified by hand).
58 mounted tests: four worlds x six rows + a sweep failing if any cell pairs sign with mark.
7/7 mutations red, incl. M2 the tempting wrong fix — hides the symptom, turns six deductions
into positives. MUTATION PROOF CORRECTED MY OWN FIX: `if (negated === 0)` survived deletion —
dead since -0 < 0 is false; removed. C6 clean. 179 tests/6 suites green, sibling mount included.
END RETURN
```
