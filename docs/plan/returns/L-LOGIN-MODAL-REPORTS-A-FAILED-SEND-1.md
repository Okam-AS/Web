```
RETURN: L-LOGIN-MODAL-REPORTS-A-FAILED-SEND
brief: fd4ae50d
verdict: built
evidence: lanes/L-LOGIN-MODAL-REPORTS-A-FAILED-SEND/kill-proof.txt
log:
DECIDED the MODAL, not the request layer: PostRequest's resolve is a documented contract 205 call sites read via TryParseResponse, and the Safe*Request variants exist to mirror it.
SendVerificationToken already returns Promise<boolean>; 3 of 4 callers read it, LoginModal alone discarded it — a caller bug. Request layer and support/admin.js (31 journeys) untouched.
NOTHING LISTENING (port 4883 unbound, asserted before+after; no process killed, no race), same spec sha 4e89c58 both arms: stock = 6 code boxes and no error; fixed = 0 boxes and reports the failure.
Ports bound: web 3881/3882, fixture 4881/4882, dead 4883. 4010/4971/4973 never bound, never probed, never signalled. Worked in clean detached worktrees, never the primary checkout.
PINNED: the e2e spec reds on stock (expected 0 code inputs, received 6) and passes fixed; the jest file drives the REAL RequestService+UserService so the premise is pinned, not assumed.
REGRESSION: growth-newsletter-send-gate still signs in through this modal; 76/76 across the 4 suites that touch LoginModal.
MUTATION 9/9 killed. All 8 of round one died so I kept looking: M9 (deleting the errorMessage reset) would have survived — a stale failure rode onto a successful retry. Test G closes it.
FOUND NOT FIXED: /admin/lang + 11 pages mount a 2nd .login-modal over AdminPage's; LoginModal.vue:203 sets errorMessage=JSON.stringify(response) on SUCCESS. Message hard-coded NO to match the file.
COMMIT 1a33ed7 on lane/login-modal-reports-a-failed-send in /Users/svendaneel/okam/web-loginsend. NOT pushed; no shared branch touched; core submodule pristine after mutation.
END RETURN
```
