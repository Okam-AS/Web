// RED PROOF — does the API base a journey computes actually point at the fixture serving that run?
//
// This file exists because the full unfixed walk COULD NOT SAFELY BE RUN. `meals-statement-month`'s
// first use of its hardcoded base is a MUTATING POST — `/v1/stores/<id>/meals/statements/drafts` —
// and at the time of this lane 127.0.0.1:4010 was answered by a LIVE fixture belonging to another
// lane's worktree (`wt-jwf`, pid 73160, cwd /Users/svendaneel/okam/wt-jwf). Running the unfixed spec
// on a non-default port would have created a statement draft, and then FINALIZED it — irreversibly —
// inside a sibling's running world. That is the precise damage this lane exists to prevent, so the
// resolution is proven over the wire with a READ-ONLY call instead.
//
// Both expressions below are copied verbatim from the tree:
//
//   OLD  test/e2e/journeys/meals-statement-month.spec.js:72   (before this lane)
//   NEW  test/e2e/journeys/account-email-confirm.spec.js:48   (and two other siblings, and
//        test/e2e/support/journey.js:524, which is what writes `apiBaseUrl` into every artifact)
//
// The run is given a non-default E2E_FIXTURE_PORT and starts its OWN fixture there. `/__fixture/health`
// answers `{"ok":true,"port":<n>}`, so each expression can be asked, over a real socket, which fixture
// it actually reached. Test 1 is expected to FAIL and that failure is the evidence.

const { test, expect, request: apiRequest } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const OLD_BASE = process.env.E2E_API_BASE_URL || 'http://127.0.0.1:4010';
const NEW_BASE = process.env.E2E_API_BASE_URL || ('http://127.0.0.1:' + (process.env.E2E_FIXTURE_PORT || 4010));

// The fixture this run was told to stand up. Not a guess: playwright.portproof.config.js starts
// `test/e2e/fixture/api-server.js` with exactly this in the environment.
const RUN_PORT = String(process.env.E2E_FIXTURE_PORT || 4010);

// APPEND, never rewrite. Playwright tears the worker down after a failing test, so module state does
// not survive from test 1 to test 2 — a whole-file rewrite silently dropped the OLD probe, which is
// the one this proof is FOR.
const LOG = path.join(__dirname, 'resolution.jsonl');

function record (which, probe, base) {
  fs.appendFileSync(LOG, JSON.stringify({
    at: new Date().toISOString(), expression: which, runPort: RUN_PORT, resolvedBase: base, answeredBy: probe
  }) + '\n');
}

/** Ask a base which fixture answers it. Never throws — an unreachable base is a result, not an error. */
async function whoAnswers (base) {
  const ctx = await apiRequest.newContext();
  try {
    const response = await ctx.get(base + '/__fixture/health', { timeout: 5000 });
    const body = await response.text();
    let port = null;
    try { port = String(JSON.parse(body).port); } catch (e) { port = null; }
    return { reachable: true, status: response.status(), body: body.trim(), port };
  } catch (e) {
    return { reachable: false, status: null, body: String(e.message).split('\n')[0], port: null };
  } finally {
    await ctx.dispose();
  }
}

test.beforeAll(() => {
  // A proof that ran on the default port would prove nothing at all, so refuse to be that.
  expect(RUN_PORT, 'this proof is meaningless on the default port').not.toBe('4010');
});

test('OLD expression (hardcoded 4010) reaches the fixture serving THIS run', async () => {
  const probe = await whoAnswers(OLD_BASE);
  record('old', probe, OLD_BASE);
  expect(OLD_BASE, 'the old expression ignores E2E_FIXTURE_PORT').toBe('http://127.0.0.1:' + RUN_PORT);
  expect(probe.port, 'the old base is answered by this run\'s own fixture').toBe(RUN_PORT);
});

test('NEW expression (reads E2E_FIXTURE_PORT) reaches the fixture serving THIS run', async () => {
  const probe = await whoAnswers(NEW_BASE);
  record('new', probe, NEW_BASE);
  expect(NEW_BASE, 'the new expression honours E2E_FIXTURE_PORT').toBe('http://127.0.0.1:' + RUN_PORT);
  expect(probe.reachable, 'the new base answered').toBe(true);
  expect(probe.port, 'the new base is answered by this run\'s own fixture').toBe(RUN_PORT);
});
