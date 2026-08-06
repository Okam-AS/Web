# L-LOGINMODAL-SUCCESS-IS-SILENT

`components/molecules/LoginModal.vue` — `login()` assigned `JSON.stringify(response)` to
`errorMessage` on the **success** path.

## The C7 question, answered by measurement

**No credential reached the DOM, and no serialized body was ever painted.** Both halves of that were
measured, not reasoned about, and both contradict the brief's stated harm ("a person who signs in
correctly is shown a serialized response object"). The correction matters more than the fix, so it
is recorded first.

### What the response actually was: `true`

`LoginModal`'s `_userService` is `AdminUserService` (`plugins/global-mixin.js:220`). Its `Login`
override (`plugins/admin-core-services.js:50-54`) maps the resolved `User` to a **boolean** before
the modal sees it:

```js
Login (phoneNumber, token) {
  return super.Login(phoneNumber, token)
    .then((user) => { if (user) { this._store.dispatch('SetCurrentUser', user); return true } return false })
    .catch(() => false)
}
```

So `JSON.stringify(response)` produced the four characters `true`. The token does arrive — it goes to
the store, which is where it belongs.

Measured in `c7-probe.probe.js` against the real chain (real `RequestService`, real `UserService`,
real adapter, real modal; only the HTTP module faked), with a sentinel token value:

| layer | resolves | carries the sentinel |
| --- | --- | --- |
| core `UserService.Login` | object, keys `id, phoneNumber, email, emailConfirmed, firstName, lastName, isPowerUser, adminIn, token` | **yes** |
| `AdminUserService.Login` — the one wired here | `true` | no |
| `AdminUserService.LoginAdmin` — sibling method, not called here | the same user object | **yes** |
| `errorMessage` on the stock modal | `"true"` | no |

Key names only above; no token value is printed anywhere in this lane.

### But the guard is not in this component

Three things stood between that line and a person, and **none of them is in `LoginModal.vue`**:

1. the adapter collapsing the response to a boolean — one line, another file, another owner;
2. `v-if="!user || !user.token"` on the form, so once `SetCurrentUser` lands the whole form (error
   box included) is replaced by the logged-in branch;
3. every mount site unmounting the modal from the same `close` the success path emits — checked all
   15 (`closeLoginModal`/`closeLogin`, incl. `MyUserDropdown`), all of them set `showLogin` false.

`LoginAdmin` in the same adapter file already returns the user object. Pointing this call site one
layer down — or at that sibling method — turns the line into a credential render with no other
change. The token in question is minted with `Expires = DateTime.Now.AddDays(36500)`
(`Services/UserService.cs:547`, OkamAPI) and `OnTokenValidated` only rejects it if the user row is
gone, so there is no revocation path: an exposure would not be one anybody could take back.

That is why the fix removes the assignment rather than making it safer, and why the pinned property
is *"nothing from the response reaches `errorMessage`, whatever `Login` resolves"* rather than
*"`errorMessage` is not a token today"*.

### It never painted, either — confirmed in a real browser

jsdom cannot settle this: the form lives inside `<transition name="fade" mode="out-in">`, and
`mode="out-in"` keeps an **outgoing** element mounted for its whole leave animation — jsdom has no
CSS and no animation clock, so it collapses exactly the window a one-frame paint would use.

Four browser arms, each with the compiler **restarted after the source edit** and readiness decided
by polling `/admin` for a 200 (never a sleep). Ports: **3897** dev server, **4897** API base with
nothing bound — every call fulfilled by `page.route`, so no sign-in attempt left the laptop.
Recording is a `MutationObserver` plus a `requestAnimationFrame` loop installed *before* the first
click, banking every change of every `.alert--error`.

| arm | chunk carries the defect | error-slot sightings |
| --- | --- | --- |
| stock / success | **true** | `[]` |
| stock / wrongcode | **true** | `[{t:1131, text:"Feil kode"}]` |
| fixed / success | false | `[]` |
| fixed / wrongcode | false | `[{t:962, text:"Feil kode"}]` |

- **stock/success is the finding**: the defect compiled, served and executed, and the serialized
  response never reached the screen for a single frame.
- **wrongcode is the positive control**: the same observer on the same page catches a real error box,
  so `[]` is a genuine negative and not a broken instrument.

Two harness bugs were caught by the arms' own checks rather than by inspection, and both would have
produced a confident wrong answer:

- **A route-order bug.** Playwright tries the **last** registered matching route first, so a
  catch-all registered after the specific endpoints answered `/user/sendverificationtoken` with
  `null`. `SendVerificationToken` returned false and the modal correctly refused to advance — a
  harness failure that reads exactly like a product failure. Found by logging the requests.
- **The barrier check firing twice, in both directions.** `expect(bundleCarriesDefect).toBe(ARM === 'stock')`
  first failed on a *stock* arm — the served chunk did not carry the defect, because the check read
  `script[src]` tags at load and the component arrives in a lazily fetched webpack chunk. It then
  failed on a *fixed* arm, because the fixed component *explains* the defect in a comment and the
  check found the comment. Fixed by collecting every script **response** from before the first
  navigation and stripping line comments before the search. Without this check, the very first arm —
  which reported a clean `[]` while silently serving the fixed bundle — would have been reported as
  the defect's browser proof.

### No permanent e2e journey was added, on purpose

A browser journey here would assert "no error box after a correct sign-in", and the table above
shows that **passes against the defect**. Adding it would put another non-failing assertion shape
into an estate that already has nineteen. The falsifiable pin is the jest one.

## The fix

```js
login(code) {
  this.code = code;
  this.errorMessage = "";     // added
  this.isLoading = true;
  ...
    if(Boolean(response)) {
      this.codeSent = true;
      // this.errorMessage = JSON.stringify(response);   <- removed
      this.$emit("close", true);
```

**Deleting the line alone would have been wrong.** `login` had no `errorMessage` reset of its own
(unlike `getCode` directly above it), so the defective assignment was the only thing overwriting a
previous «Feil kode». Removing it and stopping there lets a stale failure ride onto a sign-in that
worked — the same lie pointing the other way, which is the defect a sibling lane's ninth mutant
found in `getCode`. The reset therefore moves to the top of the method, matching `getCode`'s
existing shape in the same file. Mutant **M3** is exactly that naive deletion, and test B kills it.

Strings stay hard-coded Norwegian, matching the file; no locale file was touched.

## Proof

`test/login-modal-success-is-silent.test.js` — 11 tests. Red proven before green:
`lanes/L-LOGINMODAL-SUCCESS-IS-SILENT/kill-proof.txt`, **15 mutants / 0 survivors, 3 inverses / 0
reds**. `M1-STOCK` is the original defect verbatim (assignment restored, reset removed) and reds A,
B, C7, F and I by name.

The inverses (reset written before the code assignment; single quotes; a template literal) must stay
GREEN, so the kill count cannot be mistaken for a suite that merely reacts to any edit.

Regression: 7 suites that touch this modal, 135/135. Full jest run **2609 passed / 2611**, 115
suites; the 2 reds are both in `test/journey-artifact-store.test.js`, which asserts `/^Web-modules@/`
against this worktree's name (`web-loginsuccess@…`) — the documented worktree-name hazard. That file
contains zero references to `LoginModal`, `login-modal` or `errorMessage`.

### The lane's own files were being collected by jest — fixed inside the lane

`jest.config.js` on this branch ignores `/node_modules/` and `test/e2e/` **but not `lanes/`**. The
`<rootDir>/lanes/` entry exists only on `candidate/fe-compose-2026-08-05`; it is on neither `main`,
nor this lane's base `1a33ed7`, nor `L-LOGINMODAL-MOUNTED-ONCE` @ `0f88242`. So jest collected this
lane's working files: the two probes RAN AND PASSED (inflating the count by 8 exactly as that
config's own comment warns), and `browser-arm.spec.js` loaded `@playwright/test` outside a runner and
FAILED — a red every future lane on this base would have inherited.

Fixed by renaming rather than by editing the shared config, which a different lane owns and is
already changing:

| was | now | why it is no longer collected |
| --- | --- | --- |
| `c7-probe.test.js` | `c7-probe.probe.js` | outside jest's default `testMatch` |
| `c7-visibility-probe.test.js` | `c7-visibility-probe.probe.js` | same |
| `browser-arm.spec.js` | `browser-arm.playwright.js` | same; `browser-proof.config.js` matches the new name |

This keeps the lane green on any base, whether or not the `lanes/` exclusion lands. Re-run the probes
on demand with `npx jest --testMatch='**/*.probe.js' --testPathIgnorePatterns=/node_modules/`.

## Files

- `components/molecules/LoginModal.vue` — the fix
- `test/login-modal-success-is-silent.test.js` — the pin
- `mutate.py` / `kill-proof.txt` — red-before-green
- `browser-arm.playwright.js` / `browser-proof.config.js` / `run-browser-arm.sh` / `runs/` — the browser arms
- `c7-probe.probe.js` / `c7-visibility-probe.probe.js` — the C7 measurement (excluded from `npm test`
  by `jest.config.js` `testPathIgnorePatterns`, which already ignores `<rootDir>/lanes/`)

## Base

Branched from `lane/login-modal-reports-a-failed-send` @ `1a33ed7`, which is a descendant of `main`
and carries the **only** newer `LoginModal.vue` in the repository (blob `1bac648`; `main`,
`candidate/fe-compose-2026-08-05` and 116 other refs still carry `7213119`). Basing anywhere else
would have reverted that lane's `getCode` fix. `L-LOGINMODAL-MOUNTED-ONCE` @ `0f88242` was checked
and does not touch this file — confirmed against its diff, not its report.
