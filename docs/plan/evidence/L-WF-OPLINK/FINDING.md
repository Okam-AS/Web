# L-WF-OPLINK — the capture is rescued, and it still cannot close this exit

Reason-shape hit: **(3) the evidence proves less than the exit claims** — and the gap is C5, so no file can
close it. **This lane is NOT verified by this pass.** The capture was rescued anyway, because it was
**untracked in the plan repo** (`git ls-files --error-unmatch` on it returned *"did not match any file(s)
known to git"*) and a genuine 11-step walk with six screenshots was one `git clean` from gone.

## The `evidence:` line, preserved verbatim

    artifacts/journeys/wf-operator-import-clock.playwright.json (11/11 steps passed, commit 3e811b2, 0 failed requests, 6 screenshots) in worktree ~/okam/web-wf-oplink, copied to lanes/L-WF-OPLINK/artifacts/journeys/ · branch lane/fe-wf-oplink, commit 3e811b2, not pushed · Jest 98 suites / 2282 tests, 5/5 browser journeys

## What was rescued

`journeys/wf-operator-import-clock.playwright.json` + `journeys/wf-operator-import-clock/*.png` (6 files),
copied from `lanes/L-WF-OPLINK/artifacts/journeys/`; `diff -r` between source and destination reports no
difference.

## What the capture genuinely is — stated fully, because it is better than the decline implies

Opened and read, not summarised from its header: **`status: passed`, 11 of 11 steps passed,
`failedRequests: []`**, `commit 3e811b222dfd42a018f1f3b792a577a930024a93`, `surface: admin`,
`baseUrl http://127.0.0.1:3338`. The steps are the exit's own sentence, in order, with real screen text:

| # | step | what it recorded |
|---|---|---|
| 2 | the roster says who cannot clock today | `Kari Hansen #1 Kan stemple – koblet til Kari Hansen` / `Ola Ansatt #2 Kan ikke stemple – ing…` |
| 4 | the import runs | `1 av 1 ble koblet nå` |
| 5 | the engagement states the link | `Koblet til kasseoperatør #2. Stemplinger fra den operatøren blir denne ansettelsens timer.` |
| 8 | he clocks in | `Du er stemplet inn. Økta står åpen fra 16:58.` |
| 9 | a minute later he clocks out | `Du er stemplet ut. Økta er ført 16:58–16:59.` |
| 10 | the manager reads the hours back | `Ola Ansatt 2026-08-01 0 min 1 min 1 min` |

That is a real journey and it is worth keeping. It is not the thing the exit asks for.

## Why it does not close the exit — three independent grounds, all re-measured

1. **`"backend": "fixture"`.** Read directly out of the JSON, with `apiBaseUrl: http://127.0.0.1:3340`. The
   RETURN records that this lane *extended that fixture* with the very routes the journey calls
   (endpoint 7, `GET /staff/{id}`, `GET /attendance`). **The world that answered the walk was authored
   alongside the walk.** Compare `L-LIVE-WORLD-SEED`, which was accepted on a capture reporting
   `backend: "live"` with a `backendProbe {status: 200, body: "Healthy"}` — that is the difference.
2. **C5.** The exit's subjects are *a manager* and *an operator* doing things on screen. `C5.violated_when`
   is explicit that acceptance is a person completing the journey and never a suite or a file. A Playwright
   capture is a file.
3. **The capture reports its own defects, and nobody has ruled on them.** `findings` carries **three entries
   of severity `defect`**, all the same shape, plus `consoleErrors: 6`:

       pageerror: Navigation cancelled from "/admin?redirect=%2Fadmin%2Fworkforce-roster"
                  to "/admin?redirect=%2Fadmin%2Fworkforce-roster&storeId=42" with a new navigation.

   and the same for `/admin/pos` and `/admin/workforce-rates`. Step 11 is literally *"what the browser said
   while this ran — 3 distinct, recorded as findings"*. **A capture that records live defects is not an
   acceptance of the journey it captured**, whatever its step count.

A fourth fact the RETURN discloses and this file should carry: `page.clock` does not work on this register,
so **step 9 waits out a real wall-clock minute** rather than driving the control. That is why the attendance
row reads `1 min`.

## What would close it

An owner walking `/admin/workforce-roster` → pos-operator-import → the POS register → the attendance table
against a **live** backend, and saying so. Until then this lane is `built-unverified` on purpose, and the
three navigation-cancelled defects above are owed a ruling of their own.
