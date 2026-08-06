```
RETURN: L-CONSENT-REASON-VOCABULARY
brief: ae729bd9
verdict: built
evidence: /Users/svendaneel/okam/web-consentvocab/lanes/L-CONSENT-REASON-VOCABULARY/vocabulary.md
spec_gap: exclusionReasonBreakdown reports PendingConfirmation, not a GrowthConsentDenyReason member (it means Unverified) - named in place, deliberately not changed, different enum and outside this lane's subject
log:
Enum by object at 8e2b57de: Unsubscribe Objection HardBounce Complaint InvalidAddress AdminBlock Erasure.
GrowthConsentAdminService serialises byReason[group.Key.ToString()] - member names ARE the wire keys.
Fixture moved, enum did not, and NOT on naming grounds: Reason persists via EnumToStringConverter
(ApplicationDbContext:3522) and GrowthSuppressions is append-only guarded (:1553-61), so renaming it
orphans every 'Complaint' row and the only repair is an UPDATE on an append-only ledger - C1 forbids it.
SpamComplaint->Complaint, ManualSuppression->AdminBlock. Counts untouched; 4+2+1 still equals suppressedContacts 7.
Readers found FIRST, zero reds predicted, prediction held. Nothing asserted either string: growth-components,
growth-send-gate and growth-newsletter-page already wrote Complaint/HardBounce/Unsubscribe, and this file's
own SUPPRESSIONS ledger twelve lines below already used the real spellings.
Not an internal token - readConsentStanding passes keys through and GrowthConsentStanding.vue renders
{{ entry.reason }} RAW, so a journey printed to the operator two words the product cannot print.
Own baseline measured not inherited: 112 suites / 2583 tests; after the edit identical, 2581 pass / 2 fail.
Those 2 are pre-existing and NOT real: journey-artifact-store.test.js asserts the checkout holding the port
is named Web-modules and buildFromListeningProcess reads that from process cwd, so it reds in EVERY worktree.
Divergence check needs OKAM_API_REPO and the only backend checkout is 1-ahead/63-behind so it was not run; its own --prove lists "a field added to the 200" as a GREEN benign control - the blindness is designed.
END RETURN
```
