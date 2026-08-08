RETURN: L-A-FISCAL-LINE-CANNOT-PRINT-AN-UNDEFINED-TENDER
brief: 56058dfa
verdict: fail-spec
spec_gap: The exit criterion "no undefined PaymentType value can reach a printed fiscal line" is ALREADY MET at the trunk, contradicted by 44 passing arms in PrintedTenderNameTests and EscPosPaymentLabelTests that pin (PaymentType)9999 to the residual word "Ukjent" on all three emitters.
evidence: /Users/svendaneel/okam/Web-modules/docs/plan/lanes/L-A-FISCAL-LINE-CANNOT-PRINT-AN-UNDEFINED-TENDER/evidence.md
log:
NOTHING BUILT, NOTHING LANDED, NOTHING PUSHED. bd77cd6b0 untouched. Base measured against: 976489141; the trunk moved to c4326402c mid-lane and every file I measured is byte-identical across that move, so the findings hold.
THE PRINTER IS ALREADY SAFE. All three emitters route through Services/PaymentTenderLabels.cs whose default returns "Ukjent" -- not the number, not blank. Measured: Passed 44, Failed 0 at the trunk.
WHY THE BRIEF BELIEVED OTHERWISE, and it is nobody's error: PaymentTenderLabels.cs did NOT exist at bd77cd6b0's base 8e2b57de8. It landed afterwards in bcc8bd179.
So the branch's own comment -- "(PaymentType)999 rendered 999 125,00" -- is a true statement about its base and a false one about the trunk. Exactly the diff-vs-tip failure the brief warned about.
WHAT IS STILL OPEN IS A DIFFERENT EXPOSURE: the journal write. The branch's own tests applied to the trunk give Failed 6, Passed 1.
FIVE of those six are genuine behaviour. The sixth is not: CardSale_WithNotSet fails only on wording -- the trunk already refuses NotSet and says "requires the PROVIDER payment type", which the branch rephrases.
The real exposure is narrower than the brief's: JournalPaymentLine is append-only and persists PaymentType via EnumToStringConverter, so an undefined value stores as "999" in an unrepairable row while the printed line for the same sale correctly says "Ukjent".
BOUNDARY OR PRINTER: the trunk refuses at the printer, deliberately, and its documented reason is right -- by the time a tender reaches a receipt the sale is settled, so refusing to render makes a legally required document unproducible, the wrong side of C6.
"Ukjent 42,37" discloses the amount and admits the tender is unknown; a receipt that fails to print discloses nothing. A visible residual is not a silent default, which is the harm the brief actually names.
The branch guards the journal writer and covers ALL THREE new JournalPaymentLine sites -- counted at the trunk against its four RequireDefinedTender call sites. No one-of-four gap.
I CHECKED ITS "no model binder fills these DTOs" CLAIM rather than accepting it: FinalizeReturnRequest appears twice in PosController, but both are new constructions; the controller binds its own types and maps across. The claim holds.
REACHABILITY: no current HTTP path can deliver an undefined tender to a journal line. Three callers pass enum literals; the settlement path is gated by IsTerminalPayment(), which matches two defined members only.
So the branch is defence-in-depth on an append-only write, not a repair of a live leak -- a good reason to land it and a bad reason to call it urgent, and worth recording rather than blurring.
ALSO UNGUARDED, named as asked, neither being a fiscal document: DinteroController.cs:729 serialises order.PaymentType.ToString() to a provider, and the EnumToStringConverter mapping itself.
RECOMMEND LANDING bd77cd6b0 ON A CORRECTED RATIONALE -- the append-only journal row, not the printed line. It does not touch PaymentTenderLabels, so unlike a sibling case it would not break the deliberate "Ukjent"; one arm's message assertion needs reconciling.
END RETURN
