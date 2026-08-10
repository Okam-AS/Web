```
RETURN: L-CONFIRM-ADMIN-SURFACE
brief: 78d42e0c
verdict: built
evidence: artifacts/journeys/account-email-confirm.playwright.json (passed, 14 steps, 4 shots) · commit 968869e
log:
Brief verified in full against source; all six claims hold, nothing contradicted.
Built pages/admin/account-email.vue + its sidebar entry in the same change (C3), in the one nav
group not gated on store-admin membership, so the phone-signup admin the guard blocks reaches it.
Refusal copy names the confirmation clause and that screen; three locales, still no slot (C7).
FIXTURE WAS A RELEASE BEHIND THE BACKEND — address equality checked, confirmation flag not — so
this journey would have run against a world that never refused anything: an assertion that could
not fail. Found it, levelled it to the real guard, sibling send-gate journey re-run green.
THE BROWSER FOUND WHAT NO MOCKED TEST COULD: the shipped client posts to /user/confirm-email/
with a trailing slash, unlike every other route in that file. ASP.NET matches either form so the
real API never notices; the fixture 404'd it while the page reported failure against a fine API.
Silent-failure notes split: browser half of both taken, server halves refused as outside a node
lane's boundary and left as findings; the copy says the code was ORDERED, not delivered.
No section 15 closure claimed anywhere; the journey drives a wrong code and asserts it survives.
Ports 3961/4961; another lane's live API on :5951 and four mid-flight files left exactly as found.
END RETURN
```

---

## Detail

**Verification.** All six brief claims were checked against source and hold; nothing was
contradicted, so no `fail-spec`. The guard carrying the confirmed clause is `wt-gr-confirmed`
@ `a7697121` — an *earlier* worktree (`wt-gr-testsend` @ `5719fc96`) still holds the version without
it, which is the copy a reader would find first.

**Split judgement on the two silent-failure notes.** Both defects live in OkamAPI, a different repo
than this `node` lane. I took the half that lives here and refused the half that does not, rather
than reaching across a boundary:

- the page refuses a malformed address before calling, so *this screen's* user never provokes the
  unhandled 500 — any other caller still can;
- the fire-and-forget send cannot be fixed from here at all, so the screen refuses to lie about it:
  the copy says the code was **ordered** and that we do not learn whether it arrived, rather than
  claiming a delivery.

Both server halves are `note` findings in the artifact, so a backend lane inherits them written down.

**Falsifiability.** The refusal is provoked *before* the confirmation — same address, same screen,
same person — so "she can test-send" is bound to the one thing that changed. Two mutations were run
against the unit suite and each reddened the intended test and only it: replacing the post-confirm
re-read with a local `emailConfirmed = true`, and deleting the nav entry.

The fixture guard being a release behind the backend was the real hazard here. It checked address
equality but not the confirmation flag, so the whole journey would have passed against a world that
never refused anything. It now mirrors `RequireOwnAccountAddressAsync`: four reasons, one static
address-free 403.

**C7.** Asserted positively first (both the address and the code *did* reach the server), then
negatively (no `$i` call carried either), plus structural pins that every message renders with no
params and no `ae_*` string carries a `{` slot. The journey reads the code from Node rather than
through the browser, so it is not counted in `backendServed`, cannot reach `backendSample`, and never
enters page state. The artifact was grepped after the run: zero six-digit sequences, zero occurrences
of the address.

**Ops.** `core/` is a real checkout here, so no borrow marker was written and it was verified intact
after teardown. The harness was confirmed to be the fixed one — both wrong-world guards plus the
`wrongWorld` re-throw that stops a live-labelled failure exiting zero — before its result was
trusted. During the lane another lane modified `playwright.config.js`, `live-world.sh` and two
workforce journeys; none were staged or committed, and all four remain modified-and-uncommitted
exactly as found. Commit `968869e` names all 14 paths explicitly. Shared fixtures were edited in
place by hand, no snapshot restored; translations by hand, one key at a time, all three locales.
jest 2344/2344 on the committed tree.

**What this does not establish.** The confirmation is reachable, not strong: six digits, no attempt
counter, no lockout, no rate limit, and the code survives a wrong guess. The journey drives that
wrong guess and asserts against the mailbox that the code is still outstanding, filed as a `defect`
finding.

**Not done here, and named.** A backend lane is owed the two server-side halves. Rate limits and
lockout are a separate lane's subject, as the brief states. **C5 is not met** — a person has not
walked this. The artifact and four screenshots record that a browser did; Sven's acceptance is the
gate, and the screen is ready to be opened.
