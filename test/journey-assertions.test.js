// CAN THESE ASSERTIONS FAIL?
//
// Four journey assertions in this tree accepted the answers they existed to refuse, and the reason
// none of them was caught is that nothing ever handed them a wrong answer. They live in `@live`
// journeys that need a seeded SQL world and a running API, so "it is stronger now" was, for every
// previous version of them, a claim nobody could check without rebuilding a database.
//
// This suite checks it. Each assertion is handed:
//
//   • THE WRONG ANSWER IT USED TO ACCEPT — and must throw. Every one of those strings is taken from
//     the product's own rendering code, not invented: `kr 0,00` is `priceLabel(0)` under the admin
//     currency override; the empty rule panel is `wf_validation_no_results`; `ukjent` is
//     `ff_actor_unknown`; `Revisjon 2` is what the schedule journey produces on an unreset world.
//   • THE RIGHT ANSWER, taken from the live runs already on record in `artifacts/journeys/` — and
//     must not throw. A guard that reds on everything is a guard somebody deletes, so the green
//     direction is asserted as hard as the red one.
//
// AND THE SPECS ARE READ, TOO. Proving the helper is strong says nothing about whether the journey
// uses it: a spec could import it and still assert the old weak thing beside it. The last block
// reads the two spec files as text and requires both that the weak forms are gone and that the
// helper is called — the source is a different direction from the behaviour, and neither is derived
// from the other.

const fs = require('fs');
const path = require('path');

const {
  parseWageChip,
  assertPricedWage,
  impliedHourlyRate,
  WORKFORCE_RULE_PACK_NO,
  assertRulePackResults,
  assertStampedActor,
  assertFirstRevision,
  isShellPath,
  judgeSubjectOrigin,
  proxiedApiPath,
  judgeProxiedSubject
} = require('../test/e2e/support/journey-assertions');

const REPO_ROOT = path.resolve(__dirname, '..');
const JOURNEYS = path.join(REPO_ROOT, 'test', 'e2e', 'journeys');

// The figure the live run recorded: `artifacts/journeys/workforce-schedule-publish.playwright.json`,
// step 7 — "08:00–16:00 · Barista · kr 1 650,00".
const RECORDED_WAGE = 'kr 1 650,00';

describe('the wage chip assertion', () => {
  // THE ONE THE OLD `toMatch(/kr|NOK|\d/)` ACCEPTED. Kept first and alone because it is the whole
  // point: a Totalled cost of zero is what an unresolved hourly rate produces, and it carries both a
  // "kr" and a digit.
  it('reds on a zero-priced wage — the answer the old regex accepted', () => {
    expect(() => assertPricedWage({ label: 'kr 0,00', className: 'wf-grid__shift-cost' }))
      .toThrow(/ZERO total/);
    // …and the old assertion did not.
    expect('kr 0,00').toMatch(/kr|NOK|\d/);
  });

  it('stays green on the wage the live run recorded', () => {
    const wage = assertPricedWage({ label: RECORDED_WAGE, className: 'wf-grid__shift-cost' });
    expect(wage.minor).toBe(165000);
    expect(wage.currency).toBeNull();
  });

  it('accepts the currency-mismatch shape the same component renders', () => {
    const wage = assertPricedWage({ label: '1 650,00 CHF', className: 'wf-grid__shift-cost' });
    expect(wage.minor).toBe(165000);
    expect(wage.currency).toBe('CHF');
  });

  it('accepts a wage under a thousand, and one with real øre', () => {
    expect(assertPricedWage({ label: 'kr 825,00', className: '' }).minor).toBe(82500);
    expect(assertPricedWage({ label: 'kr 1 650,04', className: '' }).minor).toBe(165004);
  });

  it('reds when the server says it did not price the shift', () => {
    expect(() => assertPricedWage({
      label: 'Mangler sats',
      className: 'wf-grid__shift-cost is-unpriced'
    })).toThrow(/is-unpriced/);
  });

  it.each([
    ['Mangler sats'], // wf_cost_shift_unpriced — a rate the backend could not resolve
    ['Ikke priset'], // wf_cost_shift_open — an open shift, never priced
    ['—'], // the unknown mark, for a cost state the component does not recognise
    [''], // no chip at all
    [null],
    ['kr'], // a currency and no number
    ['1650'], // a number and no currency, no fraction
    ['kr 1 650'], // no fraction digits: not what priceLabel emits
    ['ca. kr 1 650,00'] // a number INSIDE other prose — what an unanchored match would take
  ])('reds on a chip that is not a wage: %p', (label) => {
    expect(() => assertPricedWage({ label, className: 'wf-grid__shift-cost' })).toThrow();
  });

  it('parses nothing out of the refusal labels', () => {
    expect(parseWageChip('Mangler sats')).toBeNull();
    expect(parseWageChip('—')).toBeNull();
  });

  it('reports the implied hourly rate for the step detail', () => {
    // 7.5 paid hours (08:00–16:00 less a 30-minute unpaid break) against the recorded kr 1 650,00.
    expect(impliedHourlyRate(165000, 450)).toBe(22000);
    expect(impliedHourlyRate(165000, 0)).toBeNull();
  });
});

describe('the rule-pack assertion', () => {
  // THE ONE THE OLD `toBeGreaterThan(0)` COULD NOT SEE, and the reason that assertion could not fail
  // at all: `pages/admin/workforce-schedule.vue` renders the empty state as an
  // `<li class="wf-page__result">` too, so the count was at least one either way. The `-id` span
  // exists only on a real result row, so an empty panel yields an empty list here.
  it('reds on a validation that produced no rule results at all', () => {
    expect(() => assertRulePackResults([])).toThrow(/NO rule ids/);
    // The old assertion's subject, reproduced: the empty state IS a `.wf-page__result`.
    const domCountWithEmptyState = 1;
    expect(domCountWithEmptyState).toBeGreaterThan(0);
  });

  it('stays green on the eleven the live run recorded', () => {
    expect(WORKFORCE_RULE_PACK_NO).toHaveLength(11);
    expect(assertRulePackResults(WORKFORCE_RULE_PACK_NO)).toBe(11);
  });

  it('does not care what order the server emitted them in', () => {
    expect(assertRulePackResults(WORKFORCE_RULE_PACK_NO.slice().reverse())).toBe(11);
  });

  it('reds when a rule goes missing from the pack', () => {
    expect(() => assertRulePackResults(WORKFORCE_RULE_PACK_NO.slice(0, 10)))
      .toThrow(/Missing: plan-notice-lead/);
  });

  it('reds when a rule is renamed', () => {
    const renamed = WORKFORCE_RULE_PACK_NO.slice();
    renamed[0] = 'daily-rest-v2';
    expect(() => assertRulePackResults(renamed)).toThrow(/Missing: daily-rest\b/);
  });

  it('reds on the fixture\'s two-rule stand-in, which a count of "more than none" accepted', () => {
    expect(() => assertRulePackResults(['workforce.rest-period', 'workforce.weekly-hours']))
      .toThrow(/got 2/);
  });

  it('reds on eleven results that are eleven of the wrong thing', () => {
    const wrong = WORKFORCE_RULE_PACK_NO.map((_, i) => 'rule-' + i);
    expect(() => assertRulePackResults(wrong)).toThrow(/Unexpected/);
  });
});

describe('the audit-stamp assertion', () => {
  // The stamp the live run recorded, and the id `GET /user` answers with in that world.
  const LIVE_ID = '05dd858b-8ff4-405b-95cf-b2db29b9278d';
  const LIVE_STAMP = 'Sist endret av ' + LIVE_ID + ' — 02.08.2026, 13:49';

  it('reds when the flip is attributed to somebody who is not the signed-in user', () => {
    const someoneElse = 'Sist endret av 11111111-2222-3333-4444-555555555555 — 02.08.2026, 13:49';
    expect(() => assertStampedActor({ stampText: someoneElse, userId: LIVE_ID }))
      .toThrow(/NOT the signed-in user/);
    // …and the old assertion did not: it named somebody, and did not say "ukjent".
    expect(someoneElse).toContain('Sist endret av');
    expect(someoneElse).not.toContain('ukjent');
  });

  it('stays green on the stamp the live run recorded', () => {
    expect(assertStampedActor({ stampText: LIVE_STAMP, userId: LIVE_ID }).userId).toBe(LIVE_ID);
  });

  it('holds against the fixture world too, with no literal pinned', () => {
    expect(assertStampedActor({
      stampText: 'Sist endret av user-manager — 02.08.2026, 13:49',
      userId: 'user-manager'
    }).userId).toBe('user-manager');
  });

  it('reds on the unknown-actor fallback', () => {
    expect(() => assertStampedActor({ stampText: 'Sist endret av ukjent', userId: LIVE_ID })).toThrow();
  });

  it('reds on an actor that merely CONTAINS the signed-in id', () => {
    expect(() => assertStampedActor({
      stampText: 'Sist endret av user-manager-2',
      userId: 'user-manager'
    })).toThrow(/NOT the signed-in user/);
  });

  it('refuses to pass when the journey could not read who is signed in', () => {
    expect(() => assertStampedActor({ stampText: LIVE_STAMP, userId: null }))
      .toThrow(/could not read who it is signed in as/);
  });
});

describe('the first-revision assertion', () => {
  it('reds on the second revision — the silent weakening an unreset world produces', () => {
    expect(() => assertFirstRevision('Revisjon 2 · Utkast')).toThrow(/opened as revision 2/);
    // …and the old assertion did not.
    expect('Revisjon 2 · Utkast').toContain('Revisjon');
  });

  it('stays green on the revision the live run recorded', () => {
    expect(assertFirstRevision('Revisjon 1')).toBe(1);
  });

  it('reds when there is no revision number at all', () => {
    expect(() => assertFirstRevision('Ingen plan')).toThrow(/No revision number/);
  });
});

describe('the split-origin guard behind both served floors', () => {
  // The shell, read off the `backendSample` of the artifacts on disk: what every admin journey calls
  // to get somebody signed in and a store on screen, whatever it is about.
  it.each([
    ['/user'],
    ['/user/login'],
    ['/user/sendverificationtoken'],
    ['/stores/42'],
    ['/stores/1/market'],
    ['/stores/42/specialopeninghours']
  ])('classifies %s as shell', p => expect(isShellPath(p)).toBe(true));

  // Subject paths, one per module journey on this branch — and, deliberately, the account journey's
  // own subject, which lives under `/user/` and must NOT be swallowed by a prefix rule.
  it.each([
    ['/feature-flags/catalog'],
    ['/stores/1/feature-flags'],
    ['/workforce/stores/42/context'],
    ['/workforce/me/inbox'],
    ['/margin/status'],
    ['/training/stores/42/context'],
    ['/events/admin/42/events'],
    ['/v1/growth/stores/42/newsletters'],
    ['/user/send-email-confirmation-code'],
    ['/user/confirm-email']
  ])('classifies %s as the journey\'s subject', p => expect(isShellPath(p)).toBe(false));

  const NAMED = 'http://127.0.0.1:5961';

  it('reds when the named backend served only the sign-in and another origin served the rest', () => {
    const error = judgeSubjectOrigin({
      apiBaseUrl: NAMED,
      subjectFromBackend: 0,
      subjectFromElsewhere: 14,
      elsewhereSample: ['GET http://127.0.0.1:4411/workforce/stores/42/context -> 200']
    });
    expect(error).toMatch(/EVERYTHING IT IS ABOUT from somewhere else/);
    // …and the floors both cleared, which is the point: signing in is three responses.
    const servedIncludingSignIn = 3;
    expect(servedIncludingSignIn).not.toBe(0);
  });

  it('stays green when the journey\'s subject reached the backend it names', () => {
    expect(judgeSubjectOrigin({
      apiBaseUrl: NAMED,
      subjectFromBackend: 31,
      subjectFromElsewhere: 0,
      elsewhereSample: []
    })).toBeNull();
  });

  it('does not accuse a journey whose subject is the browser rather than the backend', () => {
    // The two modal scroll-lock walks sign in, open a page and measure a wheel gesture. No subject
    // call anywhere, so nothing was served elsewhere and there is nothing to say.
    expect(judgeSubjectOrigin({
      apiBaseUrl: NAMED,
      subjectFromBackend: 0,
      subjectFromElsewhere: 0,
      elsewhereSample: []
    })).toBeNull();
  });

  it('does not accuse a run that also talked to a third party', () => {
    expect(judgeSubjectOrigin({
      apiBaseUrl: NAMED,
      subjectFromBackend: 12,
      subjectFromElsewhere: 4,
      elsewhereSample: ['POST https://api.example-psp.test/v1/intents -> 200']
    })).toBeNull();
  });
});

describe('the same-origin proxy, which the split-origin guard cannot see', () => {
  // `nuxt.config.js:138` mounts `server-middleware/okam-api-proxy.js` at `/okam-api`, and it rewrites
  // `pathRewrite: { '^/okam-api': '' }`. So the path the BACKEND saw is the path with the mount
  // stripped, and that — not the browser's path — is what decides shell from subject.
  it.each([
    ['/okam-api/workforce/stores/1/context', '/workforce/stores/1/context'],
    ['/okam-api/v1/growth/stores/42/newsletters', '/v1/growth/stores/42/newsletters'],
    ['/okam-api/user/login', '/user/login'],
    ['/okam-api/', '/'],
    ['/okam-api', '/']
  ])('%s reaches the backend as %s', (browserPath, backendPath) => {
    expect(proxiedApiPath(browserPath)).toBe(backendPath);
  });

  // NOT proxied, and the reason the prefix is matched as a DELIMITED one. A bare `startsWith` would
  // call the first two of these backend traffic; they are the app's own routes and are forwarded
  // nowhere. `/_nuxt/*` is the case the brief names: the Nuxt dev server's own fetches must not red.
  it.each([
    ['/okam-api-docs'],
    ['/okam-apifoo'],
    ['/_nuxt/static/manifest.json'],
    ['/workforce/stores/1/context'],
    ['/']
  ])('%s is not proxied traffic', p => expect(proxiedApiPath(p)).toBeNull());

  // The whole point of stripping before testing the shell: a proxied sign-in is the SHELL, and a
  // counter that tested `/okam-api/user/login` directly would call it a subject call and red on a
  // run that only opened the door.
  it('classifies a proxied sign-in as shell, not as the journey subject', () => {
    expect(isShellPath('/okam-api/user/login')).toBe(false);
    expect(isShellPath(proxiedApiPath('/okam-api/user/login'))).toBe(true);
  });

  const NAMED = 'http://127.0.0.1:5961';
  const APP = 'http://127.0.0.1:3010';

  it('reds when the whole subject came through the proxy and none from the named backend', () => {
    const error = judgeProxiedSubject({
      apiBaseUrl: NAMED,
      appBaseUrl: APP,
      subjectFromBackend: 0,
      subjectViaProxy: 12,
      proxySample: ['GET http://127.0.0.1:3010/okam-api/workforce/stores/42/context -> 200']
    });
    expect(error).toMatch(/SAME-ORIGIN PROXY/);
    // …and this is exactly the run the split-origin judge stays silent on, because the traffic never
    // left the app's origin and so `subjectFromElsewhere` is zero. That silence is the defect.
    expect(judgeSubjectOrigin({
      apiBaseUrl: NAMED, subjectFromBackend: 0, subjectFromElsewhere: 0, elsewhereSample: []
    })).toBeNull();
  });

  // THE QUESTION THAT MAKES THE COUNTER WORTH HAVING. A guard that reds on "nothing was fetched" as
  // well as on "the proxy served it" has re-created the silent zero one column along.
  it('stays silent when nothing was fetched at all, which is a different fact', () => {
    expect(judgeProxiedSubject({
      apiBaseUrl: NAMED, appBaseUrl: APP, subjectFromBackend: 0, subjectViaProxy: 0, proxySample: []
    })).toBeNull();
  });

  it('stays silent when the named backend served the subject directly', () => {
    expect(judgeProxiedSubject({
      apiBaseUrl: NAMED, appBaseUrl: APP, subjectFromBackend: 31, subjectViaProxy: 4, proxySample: []
    })).toBeNull();
  });

  it('names the remedy rather than accusing the backend of not answering', () => {
    // The backend may well have served every one of these calls — through the proxy. What is false
    // is the artifact's ability to say so, so the sentence has to send the reader to the build, not
    // to the API.
    const error = judgeProxiedSubject({
      apiBaseUrl: NAMED, appBaseUrl: APP, subjectFromBackend: 0, subjectViaProxy: 3, proxySample: []
    });
    expect(error).toContain('API_BASE_URL');
    expect(error).toContain(NAMED);
  });
});

describe('the journeys actually assert these things', () => {
  // A helper that can fail proves nothing about a spec that does not call it, and a spec can import
  // one and still assert the old weak form beside it. Read as text, which is a different direction
  // from the behaviour asserted above.
  // COMMENT-ONLY LINES ARE DROPPED FIRST, and that is not a convenience. Each of these specs now
  // quotes the weak assertion it replaced, verbatim, so the reader of the diff can see what changed
  // — and a scan over the raw file would find those quotations and report the defect as still
  // present. It is the same mistake one level up: matching a string rather than the thing the string
  // describes. What is scanned is what executes.
  const code = source => source
    .split('\n')
    .filter(line => !/^\s*(\/\/|\*|\/\*)/.test(line))
    .join('\n');

  const schedule = code(fs.readFileSync(path.join(JOURNEYS, 'workforce-schedule-publish.spec.js'), 'utf8'));
  const lever = code(fs.readFileSync(path.join(JOURNEYS, 'workforce-flag-lever.spec.js'), 'utf8'));

  it('the schedule journey no longer accepts any digit-bearing cost', () => {
    expect(schedule).not.toMatch(/toMatch\(\/kr\|NOK/);
    expect(schedule).toContain('assertPricedWage(');
  });

  it('the schedule journey no longer counts a class the empty state also carries', () => {
    expect(schedule).not.toMatch(/toBeGreaterThan\(0\)/);
    expect(schedule).toContain('assertRulePackResults(');
    expect(schedule).toContain('.wf-page__result-id');
  });

  it('the schedule journey asserts the revision number, not the word', () => {
    expect(schedule).toContain('assertFirstRevision(');
  });

  it('the flag journey compares the stamp with the signed-in user', () => {
    expect(lever).toContain('signedInUserId(');
    expect(lever).toContain('assertStampedActor(');
    // The weak pair that used to stand in for it.
    expect(lever).not.toMatch(/not\.toContainText\('ukjent'\)/);
  });

  it('both served floors ask the split-origin question', () => {
    const journey = code(fs.readFileSync(
      path.join(REPO_ROOT, 'test', 'e2e', 'support', 'journey.js'), 'utf8'));
    expect(journey).toContain('judgeSubjectOrigin(');
    expect(journey).toContain('backendSubjectServed');
  });

  it('the recorder counts and judges the same-origin proxy too', () => {
    const journey = code(fs.readFileSync(
      path.join(REPO_ROOT, 'test', 'e2e', 'support', 'journey.js'), 'utf8'));
    // The judge is CALLED, not merely imported — a helper that can fail proves nothing about a
    // recorder that never asks it.
    expect(journey).toContain('judgeProxiedSubject(');
    // The counter is FILED, so a reader can see the zero rather than infer it from silence. This is
    // the number that was previously unwritable rather than merely zero.
    expect(journey).toContain('proxiedSubjectServed');
    // And the shell test runs on the STRIPPED path. `isShellPath(pathOf(...))` alone would classify
    // every proxied sign-in as a subject call.
    expect(journey).toContain('proxiedApiPath(');
    // The bare mount strips to `/`, which is in no SHELL_PATHS shape and would otherwise count as a
    // subject call. No client fetches the API root as its subject, so counting it could only false-red.
    expect(journey).toContain('proxied !== \'/\'');
  });

  it('an arm is not satisfied unless a test actually executed', () => {
    // Arm 3 expects `nonzero` + `NONE`, which is EXACTLY the signature of a harness that died in
    // module load. Without an execution check that arm was satisfiable by the very breakage this
    // script failed to notice for five commits.
    const proof = fs.readFileSync(
      path.join(REPO_ROOT, 'test', 'e2e', 'scripts', 'guard-proof.js'), 'utf8');
    expect(proof).toContain('&& executed');
    expect(proof).toMatch(/const executed = .*1 \(\?:passed\|failed\)/);
  });

  it('guard-proof copies whatever the support files require, rather than a hand-written list', () => {
    // The list was `artifact-store.js` and `journey-assertions.js`; `artifact-store.js` grew a
    // `require('./world-stamp')` and the list did not follow, so every arm of the proof died in
    // module load and the whole standing proof reported nothing while still printing a table.
    const proof = fs.readFileSync(
      path.join(REPO_ROOT, 'test', 'e2e', 'scripts', 'guard-proof.js'), 'utf8');
    expect(proof).toContain('const queue = [\'journey.js\', \'artifact-store.js\', \'journey-assertions.js\']');
    expect(proof).not.toContain('fs.copyFileSync(path.join(SUPPORT, \'artifact-store.js\')');
  });
});
