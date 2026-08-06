```
RETURN: L-GERMAN-IDENTIFIER-LABELS
brief: d3547a7d
verdict: built
evidence: lanes/L-GERMAN-IDENTIFIER-LABELS/mutation-log.md
spec_gap: brief names 3 strings but 5 share the defect (receiptModal_companyRegistry, wfr_add_employer_hint), and its mounted-receipt criterion was unreachable until ReceiptModal.vue's optional chaining was rewritten for buble
log:
Refuted the alternative first: {vat} is order.storeVAT -> Order.StoreVAT, a `long`
copied from Store.VAT. A German USt-IdNr is DE+9 digits and cannot fit a numeric
column, so the value is a Norwegian organisasjonsnummer and NO/EN were correct.
Fixed 5 German strings, not 3. The extra two are the same substitution:
receiptModal_companyRegistry ('Handelsregister' for Foretaksregisteret) renders one
line BELOW the org number on the same receipt; wfr_add_employer_hint is the other.
All follow the rule de.ts states at 4710-4712: keep the Norwegian term, gloss it.
fodselsnummer case checked as asked: the surface FORBIDS the number rather than
showing it, so the string stays and correcting it strengthens the control. German
named the one number the server does NOT refuse -- MealsEmployeeReference.Normalize
keys on both mod-11 control digits, which a 12-char German SV number passes.
RULING NEEDED: ReceiptModal.vue could not be mounted in jest AT ALL (buble cannot
parse optional chaining); 2 template lines rewritten. 7 assertions, all 7 go red
if de.ts is reverted. MwSt left alone deliberately -- tax, not authority, VAT lane.
END RETURN
```
