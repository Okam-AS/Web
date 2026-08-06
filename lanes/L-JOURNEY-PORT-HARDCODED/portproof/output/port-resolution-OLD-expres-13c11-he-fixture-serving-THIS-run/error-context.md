# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: port-resolution.spec.js >> OLD expression (hardcoded 4010) reaches the fixture serving THIS run
- Location: lanes/L-JOURNEY-PORT-HARDCODED/portproof/port-resolution.spec.js:64:1

# Error details

```
Error: the old expression ignores E2E_FIXTURE_PORT

expect(received).toBe(expected) // Object.is equality

Expected: "http://127.0.0.1:4318"
Received: "http://127.0.0.1:4010"
```

# Test source

```ts
  1  | // RED PROOF — does the API base a journey computes actually point at the fixture serving that run?
  2  | //
  3  | // This file exists because the full unfixed walk COULD NOT SAFELY BE RUN. `meals-statement-month`'s
  4  | // first use of its hardcoded base is a MUTATING POST — `/v1/stores/<id>/meals/statements/drafts` —
  5  | // and at the time of this lane 127.0.0.1:4010 was answered by a LIVE fixture belonging to another
  6  | // lane's worktree (`wt-jwf`, pid 73160, cwd /Users/svendaneel/okam/wt-jwf). Running the unfixed spec
  7  | // on a non-default port would have created a statement draft, and then FINALIZED it — irreversibly —
  8  | // inside a sibling's running world. That is the precise damage this lane exists to prevent, so the
  9  | // resolution is proven over the wire with a READ-ONLY call instead.
  10 | //
  11 | // Both expressions below are copied verbatim from the tree:
  12 | //
  13 | //   OLD  test/e2e/journeys/meals-statement-month.spec.js:72   (before this lane)
  14 | //   NEW  test/e2e/journeys/account-email-confirm.spec.js:48   (and two other siblings, and
  15 | //        test/e2e/support/journey.js:524, which is what writes `apiBaseUrl` into every artifact)
  16 | //
  17 | // The run is given a non-default E2E_FIXTURE_PORT and starts its OWN fixture there. `/__fixture/health`
  18 | // answers `{"ok":true,"port":<n>}`, so each expression can be asked, over a real socket, which fixture
  19 | // it actually reached. Test 1 is expected to FAIL and that failure is the evidence.
  20 | 
  21 | const { test, expect, request: apiRequest } = require('@playwright/test');
  22 | const fs = require('fs');
  23 | const path = require('path');
  24 | 
  25 | const OLD_BASE = process.env.E2E_API_BASE_URL || 'http://127.0.0.1:4010';
  26 | const NEW_BASE = process.env.E2E_API_BASE_URL || ('http://127.0.0.1:' + (process.env.E2E_FIXTURE_PORT || 4010));
  27 | 
  28 | // The fixture this run was told to stand up. Not a guess: playwright.portproof.config.js starts
  29 | // `test/e2e/fixture/api-server.js` with exactly this in the environment.
  30 | const RUN_PORT = String(process.env.E2E_FIXTURE_PORT || 4010);
  31 | 
  32 | // APPEND, never rewrite. Playwright tears the worker down after a failing test, so module state does
  33 | // not survive from test 1 to test 2 — a whole-file rewrite silently dropped the OLD probe, which is
  34 | // the one this proof is FOR.
  35 | const LOG = path.join(__dirname, 'resolution.jsonl');
  36 | 
  37 | function record (which, probe, base) {
  38 |   fs.appendFileSync(LOG, JSON.stringify({
  39 |     at: new Date().toISOString(), expression: which, runPort: RUN_PORT, resolvedBase: base, answeredBy: probe
  40 |   }) + '\n');
  41 | }
  42 | 
  43 | /** Ask a base which fixture answers it. Never throws — an unreachable base is a result, not an error. */
  44 | async function whoAnswers (base) {
  45 |   const ctx = await apiRequest.newContext();
  46 |   try {
  47 |     const response = await ctx.get(base + '/__fixture/health', { timeout: 5000 });
  48 |     const body = await response.text();
  49 |     let port = null;
  50 |     try { port = String(JSON.parse(body).port); } catch (e) { port = null; }
  51 |     return { reachable: true, status: response.status(), body: body.trim(), port };
  52 |   } catch (e) {
  53 |     return { reachable: false, status: null, body: String(e.message).split('\n')[0], port: null };
  54 |   } finally {
  55 |     await ctx.dispose();
  56 |   }
  57 | }
  58 | 
  59 | test.beforeAll(() => {
  60 |   // A proof that ran on the default port would prove nothing at all, so refuse to be that.
  61 |   expect(RUN_PORT, 'this proof is meaningless on the default port').not.toBe('4010');
  62 | });
  63 | 
  64 | test('OLD expression (hardcoded 4010) reaches the fixture serving THIS run', async () => {
  65 |   const probe = await whoAnswers(OLD_BASE);
  66 |   record('old', probe, OLD_BASE);
> 67 |   expect(OLD_BASE, 'the old expression ignores E2E_FIXTURE_PORT').toBe('http://127.0.0.1:' + RUN_PORT);
     |                                                                   ^ Error: the old expression ignores E2E_FIXTURE_PORT
  68 |   expect(probe.port, 'the old base is answered by this run\'s own fixture').toBe(RUN_PORT);
  69 | });
  70 | 
  71 | test('NEW expression (reads E2E_FIXTURE_PORT) reaches the fixture serving THIS run', async () => {
  72 |   const probe = await whoAnswers(NEW_BASE);
  73 |   record('new', probe, NEW_BASE);
  74 |   expect(NEW_BASE, 'the new expression honours E2E_FIXTURE_PORT').toBe('http://127.0.0.1:' + RUN_PORT);
  75 |   expect(probe.reachable, 'the new base answered').toBe(true);
  76 |   expect(probe.port, 'the new base is answered by this run\'s own fixture').toBe(RUN_PORT);
  77 | });
  78 | 
```