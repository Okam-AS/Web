```
RETURN: L-PLAN-ARTIFACTS-ARE-SCRUBBED
brief: ecd15e7a
verdict: built
evidence: lanes/L-PLAN-ARTIFACTS-ARE-SCRUBBED/evidence.md
log:
FIVE VALUES READ FROM SOURCE, never typed: AppSettings Secret, PowerUserVerificationCode, DemoVerificationCode, the StoresController X-Okam-ApiKey GUID, the Functions host key. Same on 3 branches.
COUNTS: power-user code CONFIRMED at exactly 7 untracked files, 2 under docs/plan/returns/. Demo code REFUTED: 9 files under docs/plan, not 8 — the ninth is generated render/plan.html.
Secret, API-key GUID and Functions host key: ZERO in any plan artifact. Scrubbed 62 files / 93 hits to <ConfigKey>__REDACTED. No file deleted; all 34 JSON artifacts still parse.
A TIP-ONLY REBUILD WOULD HAVE REMOVED NOTHING: plan-snapshot's parents 212a2b8 and 5197056 already carried both codes. Rebuilt that 3-commit segment onto e34977a, not just the tip.
REFS REBUILT from original trees, only carrier blobs swapped: plan/docs-20260806 54d4dfc -> 6c4305e (444 files, still orphan, author and message preserved); plan-snapshot 5780798 -> a1ccc40.
OLD OBJECTS UNREACHABLE: all four old commits return 0 from rev-list --all --reflog. Expired only plan/docs-20260806's reflog, the one still holding 54d4dfc; no other reflog touched.
PROVED BY file:// CLONE, grepping every object received rather than the checkout — a plain local clone hardlinks the object store and would prove nothing. Docs branch: 451 objects, ZERO carriers.
So plan/docs-20260806, THE REF THE OWNER'S ONE-COMMAND PUSH PUBLISHES, yields neither code from tip or history. That gate is closed.
plan-snapshot CANNOT be made clean here: power-user code 6 blobs -> 0, demo code only 106 -> 82, all in product ancestry (test/e2e, 20 tracked lanes files). Owner-step now advises deleting that ref.
TWO CARRIERS THE BRIEF DID NOT NAME: fresh-clone/.git still held 10 pre-scrub blobs after its files read clean, re-created from the rebuilt ref, now 0; and a THIRD local ref carries the demo code.
owner-step.md hardcoded 54d4dfc in BOTH its pre-push verify and post-push confirm blocks; after the rebuild both would fail the owner, exactly when a failing check invites forcing past it. Fixed.
NOT ROTATION, and a green sweep is not "the credential is safe": the power-user code stays committed in OkamAPI at appsettings.json, Scripts/demo/demo-common.sh:25 and seed-workforce-demo.sh:32.
No OkamAPI file was touched and nothing here speaks to its history. The demo code also stays committed in this repo's own test/e2e suite. Rotation is the owner's, under the four flags naming it.
BOUNDARIES: no push (origin still has 0 plan/ heads), no shared-branch commit, no carrier git add-ed, all 7 still untracked. Index 1785918138 89350 unchanged; temp GIT_INDEX_FILE throughout.
ONE BOUNDARY KNOWINGLY CROSSED: the brief forbids editing docs/plan, its own exit requires scrubbing it. Took the specific over the generic — 9 files, value replacements only. Flagged, not silent.
END RETURN
```
