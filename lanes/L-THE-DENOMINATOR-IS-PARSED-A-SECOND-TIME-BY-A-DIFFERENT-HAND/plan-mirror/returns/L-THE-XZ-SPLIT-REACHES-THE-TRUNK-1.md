RETURN: L-THE-XZ-SPLIT-REACHES-THE-TRUNK
brief: c06a7129
verdict: built
evidence: docs/plan/returns/L-THE-XZ-SPLIT-REACHES-THE-TRUNK-1.md
log:
LANDED. Backend feature/restaurant-modules moved c4326402c to 668590cbe. My work is an ancestor and the previous tip is still reachable, so nothing was orphaned.
RECOMPOSED, NOT CARRIED. The 4985 from my own tip was discarded: I merged onto c4326402c fresh and re-measured there. Clean merge, no conflicts.
THE GUARD FIRED AT THE INSTANT OF THE MOVE, not at lane start: re-read the trunk immediately before git branch -f and required it still equal c4326402c, my merge base. It did.
Reading at lane start is what failed for the two lanes that clobbered each other; both were correct when they read. Check and move sit in one command, so the window is milliseconds.
TIER AT THE COMPOSED TIP: 4997 passed / 0 failed / 11 skipped / 5008 total, exit 0. No abort line above the summary, dll built in a fresh worktree, run-sheet restored, worktree clean.
ASSERTED BY NAME FROM A TRX, not from the summary. A dotnet console log names only failed and skipped, so a vanished arm and a passing arm print the same green line.
All nine named arms ran and passed: the five X/Z split arms at 1 each, Both_printed_ladders_name_the_tender at 17, Every_declared_member_is_labelled at 2, the other two at 1.
Total 26 passed across the nine, zero absent. The parameterised label ladder running 17 rather than 1 is the count that a bare summary would have hidden entirely.
CONFIRMED ON THE LANDED TRUNK, not only on my branch. SAF-T files changed: 0, so SaftCashRegisterExportService is untouched pending D-DOES-A-SAFT-PAYMENT-ELEMENT-ADMIT-A-CREDIT-MEDIUM.
TripletexPosService changed: 0. It routes CompanyAccount to a receivables account and must carry every medium, because filtering that line would leave the revenue credit with no matching debit.
The label exclusion is still BY NAME: SectionTotals carries both totals, with zero bare Sum-prefix matches. A prefix would swallow whatever total a later section adds.
The landing changes exactly four files: the model, the ESC/POS builder, and the two test files. Nothing else moved.
ON THE TRUNK NOW: Sum mottatt counts only money that arrived, and the invoiced sale is stated under KREDITTSALG (IKKJE MOTTATT) with its own total rather than dropped.
STILL SHORT BY ONE EMITTER, deliberately and on the record: SAF-T waits on the ruling. When it comes, IsReceived is already on the model waiting for it.
Frontend untouched. Nothing pushed. Worktree /Users/svendaneel/okam/be-land left standing at the composed commit in case the landing needs re-reading.
END RETURN
