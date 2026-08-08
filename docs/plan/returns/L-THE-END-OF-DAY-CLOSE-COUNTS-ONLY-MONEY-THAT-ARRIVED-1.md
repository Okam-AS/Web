```
RETURN: L-THE-END-OF-DAY-CLOSE-COUNTS-ONLY-MONEY-THAT-ARRIVED
brief: (read in full)
verdict: blocked
reason: host load 18.57/23.70/22.59 against this brief's gate of 13, with another lane's four-phase measured tier program mid-run on the same host
log:
BLOCKED on host capacity, not on the work. Nothing was run, so no arm is claimed and no evidence is offered. The design is settled and the retry is one step rather than a fresh start.
Load read 18.57 / 23.70 / 22.59 against this brief's gate of 13 - above it on all three windows. Your dispatch note said 11.9; the host got busier between dispatch and my first command.
Cause named rather than guessed: a four-phase measured program is mid-run in /Users/svendaneel/okam/OkamAPI-bothtrunks - three backend tiers plus a frontend jest - with three dotnet test processes live.
It gates itself between phases at load under 12, so it holds the host a while yet. Adding a fourth concurrent tier would contend with it and corrupt the very timings it exists to measure.
No needs: named, deliberately. The clerk correction of 2026-08-08 records that a needs: is for a dependency satisfied by work, never a condition merely true right now, and that transient capacity returns blocked with the reason in its log.
Nothing built, no container started, no worktree created or left behind, no branch touched. Backend trunk still d30c1c4d4.
The read-only analysis cost no CPU and is complete:
The one definition of received is Helpers/PaymentTypeExtensions.IsCompanyAccount. PaymentMeansTotal.IsReceived is a thin alias over it, and the X/Z builder is its only other reader.
So the non-duplicating fix is a PaymentType.IsReceived() extension beside IsCompanyAccount with PaymentMeansTotal.IsReceived delegating to it - one rule, two surfaces, no second definition of received.
EodService.ProjectPaymentTotalsAsync then gains a fourth bucket off that predicate, EodSummaryModel a CreditTotal, and BuildReceiptHtml a row beside Kort and Annet.
THE ZERO-CREDIT QUESTION IS FORCED, and I am not settling it. The close prints its rows unconditionally - Kort and Annet show zero - while the X/Z prints its credit section only when non-empty.
The two surfaces' own conventions therefore give opposite answers for a zero-credit close. That is the unruled § 2-8-2 reading arriving on a new surface, and it decides whether the row is present at zero.
Distinguish-rather-than-exclude is followed either way: the invoiced sale leaves the takings total and is stated under its own heading. Only the zero case turns on the ruling.
Reproduction surface identified: WebApi.Tests/Kassa/EodServiceTests.cs, 11 facts, no SqlServer trait, so fast tier and no container. GetSummary_Live_ComputesExpected_ProjectsCardAndCash_NettingReturns is the sibling the before arm extends.
Re-dispatch when load clears. The before arm is a company-account sale reaching OtherTotal and printing under Annet, which is live on d30c1c4d4 today.
END RETURN
```
