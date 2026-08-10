# L-STATUTE-HONESTY — the exit is wrong about what was built, and needs re-ruling

Reason shape hit: **(4) the evidence proves the opposite of one clause**, compounded by **(5) half a
two-part exit that is in no capture at all.** Per the brief: **do not build toward this exit.** Recorded
here for an owner ruling.

## The evidence line as it stands

```
evidence: Web-modules lane/statute-honesty @ f01886a (worktree ../web-statute) + OkamAPI-modules lane/statute-honesty @ 485959ab (worktree ../OkamAPI-statute); artifacts/journeys/statute-honesty/ incl. the A4 portrait PDF; neither pushed
```

Nothing in the plan was changed by this pass. The exit line is untouched.

## The exit, and the three places it does not match its own capture

> the personalliste sheet **and its CSV** state that only employees can be registered, and the run-sheet
> staleness banner names a **post-issue** dietary statement **as its own cause**, **both captured under
> `artifacts/journeys/`**

`instrumentless-exits.md` Batch 4 declined it on three grounds. Each was re-opened this pass and each
holds, read off `../web-statute/artifacts/journeys/statute-honesty.playwright.json` (`status: "passed"`,
10 steps, `commit 129f9d63`) rather than inferred:

**1. Composition, not issue — and the lane says so deliberately.** Step 9 is named
*"an allergy written down after the sheet was **composed** says exactly that"*, and step 10 is
*"the **composition** time is on screen beside the issue time"*. The commit message
(`f01886a0`) states the design decision outright: *"Composition, not issue: a statement made in the
compose-to-issue window is still not on the paper."* The exit asks for **post-issue**. The capture proves
a strictly wider window, deliberately chosen, and the RETURN's own words are that the first test asserting
the exit's version *"asserted the opposite and was wrong"*. **An exit rewritten to match this would be the
edit this program exists to prevent; the ruling belongs to an owner.**

**2. The CSV is in no capture.** The journey has ten steps: 1–2 sign-in and the register, 3–6 the sheet
and the A4 print, 7–10 the run sheet. No kodeoversikt, no CSV. The CSV half is real — backend commit
`485959ab` on `lane/statute-honesty`, *"The kodeoversikt says which of the four categories it can actually
carry"* — but it lives in a **second unpushed worktree** (`../OkamAPI-statute`) and is pinned by a backend
test, not by a capture. So *"both captured under `artifacts/journeys/`"* is false of the CSV **however the
first clause is read**. `artifacts/journeys/statute-honesty/` holds four files:
`01-personalliste-with-coverage-caveat.pdf`, `01-the-register-on-screen.png`,
`02-a-run-sheet-stale-because-the-proposal-version-m.png`,
`03-the-same-banner-with-the-allergy-named-as-the-ca.png`.

**3. The capture records a live defect against the exit's own sentence.** `findings[0]` in that JSON is
`severity: "defect"` — *"the shared version sentence can still name a cause that did not fire … This
enquiry's sheet was generated from the version that IS operative (both fields read 1), so 'not generated
from the operative proposal version' is false of it — and it is still printed, because `isStale` is the
server's boolean and this surface will not overrule it."* The banner therefore does **not** name the
dietary statement **as its own cause**; it names it **beside a cause that did not fire**. The capture also
names the fix: one nullable field on `EventsRunSheetView`, set where `EventsRunSheetService.Map` already
computes all four causes — a **wire** change, which this lane did not make.

**A fourth fact a reader should carry:** the run-sheet half was captured against `"backend": "fixture"`
(`baseUrl 127.0.0.1:3345`, `apiBaseUrl 127.0.0.1:4439`), so no real server answered the staleness
question in that capture.

## What an owner has to decide

1. **Which window the product means.** Post-*composition* (what is built and captured, and defensible —
   a statement made in the compose→issue window is genuinely not on the printed paper) or post-*issue*
   (what the exit says). If post-composition, the exit must be re-ruled, not reworded to fit.
2. **Whether the CSV clause is dropped from this exit or the CSV is captured.** Capturing it needs the
   backend branch landed first; it renders server-side and no browser step reaches it today.
3. **The banner clause is unmet either way** while the wire publishes one boolean for four causes. That
   is a backend change (`EventsRunSheetView` + `EventsRunSheetService.Map`) and belongs to a lane, not to
   a wording pass.

## Constraint note

C6 is engaged and **not** violated by the current state: the sheet's caveat *names no paragraph* (the
commit says so explicitly, and the CSV commit repeats it), precisely because it produces a caveat rather
than the register a paragraph would demand. What is unresolved is the exit, not the statute claim.
