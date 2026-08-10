```
RETURN: L-ADMIN-JOURNEY-WAIT-DIAGNOSES
brief: 8836eeba
verdict: built
evidence: lanes/L-ADMIN-JOURNEY-WAIT-DIAGNOSES/kill-proof.txt
log:
signIn (test/e2e/support/admin.js, 31 journeys) now wraps its 4 waits: on timeout it probes both origins from node, reads #__nuxt and the modal, leads with the first "no". Assertions untouched.
Commit ac77d25 on lane/admin-journey-wait-diagnoses, worktree /Users/svendaneel/okam/web-waitdiag (detached 8ac6f63, clean, core init). ONE file, 240+/5-. Not pushed. Probes 2s, failure path only.
PROVEN BY KILLING THE FIXTURE mid-journey. Paired arms, same journey/wait/kill, both artifacts backendServed=0:
  C1 stock   -> "page.waitForURL: Timeout 30000ms exceeded. waiting for navigation until load"
  K1 changed -> "THE API IS NOT LISTENING - the application is up, the shell rendered, and nothing answered http://127.0.0.1:4877"; app HTTP 200, shell 239 chars, modal «Feil kode»
In the ARTIFACT, not just the console - the artifact is what stood 3 days. C1's artifact reproduces the 08-03 signature exactly, so a fixture that stopped answering suffices to produce that red.
Baselines PASS both worktrees (served=58); 5-journey regression passed 45.3s. NOT SHOWN: app-not-listening never fired - a dead dev server dies earlier at page.goto, self-naming; race lost 3/3.
DEFECT, not fixed (out of scope): with nothing listening the modal still advances to the OTP step and offers 6 boxes for a code it never sent - PostRequest RESOLVES failures, getCode sets smsSent in
a .then() that never reads the value, so LoginModal's «Feil telefonnummer» arm is dead for any server-side failure. Bound 3877/4877, 3878/4878; 4010/4971/4973 never bound, probed or signalled.
END RETURN
```
