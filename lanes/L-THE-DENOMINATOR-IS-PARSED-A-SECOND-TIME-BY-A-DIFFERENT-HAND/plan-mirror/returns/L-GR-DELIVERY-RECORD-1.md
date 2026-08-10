```
RETURN: L-GR-DELIVERY-RECORD
brief: c9f27214
verdict: fail-spec
evidence: lanes/L-GR-DELIVERY-RECORD/RUNS.md
spec_gap: "the record is written marked delivered regardless" is not the code at 8e2b57de: fix 6b4913b8 is an ancestor, and the throwing contract case already exists on both articles.
log: |
  Ref: feature/restaurant-modules @ 8e2b57de (2026-08-04). Every read via `git show 8e2b57de:<path>`; the primary checkout (lane/meals-grace-pins @ 34c6c103) was never read.
  `git merge-base --is-ancestor 6b4913b8 8e2b57de` = yes. Enum carries three states and NO Delivered member; `git grep exportDelivered` = 4 hits, all past-tense prose, zero code.
  SendPrivacyNoticeAsync returns GrowthMailSendOutcome; SubmittedToTransport has ONE producer (Service.cs:299) behind catch + outcome check, consumed by ForAccess :245, ForErasure :88/:153.
  ShredOrDeferAsync refuses AttemptedAndFailed outright; the deferred sweep carries the recorded value forward rather than re-asserting a send. The throwing case exists, parameterized:
  [InlineData(TransportFailure.Throws)] on the access AND erasure theories of GrowthPrivacyDeliveryEvidenceTests. 8 load-bearing files are byte-identical 3579bbbc->8e2b57de, so run 1's
  mutation proof describes this tip; re-ran at it anyway: 13/13 green, no container, 0 commits, nothing built. Gap left is config: Fake default, Postmark selectable, Resolve no fallback.
END RETURN
```
