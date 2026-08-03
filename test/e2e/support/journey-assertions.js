// THE ASSERTIONS A JOURNEY MAKES ABOUT AN ANSWER, SEPARATED FROM THE BROWSER THAT FETCHED IT.
//
// ---- WHY THIS FILE EXISTS ---------------------------------------------------------------------
//
// A journey assertion is only worth what it REFUSES. Four of the ones in this tree refused nothing
// that the product could actually produce:
//
//   • `expect(cost).toMatch(/kr|NOK|\d/)` on the wage chip. It passes on `kr 0,00` — which is
//     precisely what an unresolved rate renders, because `shiftCostLabel` reaches
//     `amount(cost.totalMinor, …)` for ANY Totalled cost and `priceLabel(0)` is `kr 0,00`. The
//     assertion looked like a guard against the rate-resolution defect and admitted its output.
//
//   • `expect(await results.count()).toBeGreaterThan(0)` on the validation panel. That one could not
//     fail AT ALL: `pages/admin/workforce-schedule.vue` renders the EMPTY state
//     (`wf_validation_no_results`) as an `<li class="wf-page__result">` too, so the class is present
//     whether eleven rules answered or none did. The pack's eleven were recorded in the step's prose
//     and never compared to anything.
//
//   • `expect(stamp).toContainText('Sist endret av')` plus `.not.toContainText('ukjent')` on the
//     feature-flag audit line. It passes for ANY named actor, including the wrong one — which is the
//     only failure that stamp exists to detect, since a kill switch attributed to somebody who did
//     not flip it is worse than one attributed to nobody.
//
//   • `expect(page.locator('.wf-page__meta').first()).toContainText('Revisjon')` after creating a
//     draft. `Revisjon 2` contains `Revisjon`, so the journey documented in its own header — run
//     without a world reset, it silently plans revision 2 of a week somebody had already published
//     and reports the same green.
//
// ---- WHY THEY ARE PURE FUNCTIONS --------------------------------------------------------------
//
// Because the only way to know an assertion can fail is to FAIL IT, and these live in `@live`
// journeys that need a seeded SQL world and a running API. A stronger `expect` inside a spec nobody
// can run on demand is a claim, not a proof. Written as pure functions over the strings the page
// showed, each one can be handed the wrong answer it used to accept and observed to throw —
// `test/journey-assertions.test.js` does exactly that, using the figures recorded in
// `artifacts/journeys/*.playwright.json` as the right answers and the product's own rendering code
// as the source of the wrong ones.
//
// The specs keep every locator: this file never sees a Page. It is handed text and class names, so
// the walk stays in the walk and only the JUDGEMENT moves.

// ---- the wage chip ----------------------------------------------------------------------------

// The two shapes `WorkforceWeekGrid.shiftCostLabel` can produce for a TOTALLED cost, anchored at both
// ends so a chip that merely CONTAINS a number cannot pass:
//
//   • the admin format, `core/helpers/tools.priceLabel` under the `{ prefix: 'kr ', suffix: '' }`
//     override `plugins/global-mixin.js` installs — `kr 1 650,00`, thousands split by a space
//     (`wholeAmountTool`), always two fraction digits (`fractionAmountTool` pads);
//   • the currency-mismatch format the same method falls back to when the shift's currency is not
//     the grid's — `1 650,00 CHF`.
//
// Anything else — the unknown mark, `Mangler sats`, `Ikke priset`, an empty chip — is not a wage.
const WAGE_PREFIXED = /^kr (\d{1,3}(?:[ \u00A0]\d{3})*|\d+),(\d{2})$/;
const WAGE_SUFFIXED = /^(\d{1,3}(?:[ \u00A0]\d{3})*|\d+),(\d{2}) ([A-Z]{3})$/;

/** The chip's minor amount and currency, or null when the string is not one of the two wage shapes. */
function parseWageChip (label) {
  const text = String(label === null || label === undefined ? '' : label).trim();
  const prefixed = WAGE_PREFIXED.exec(text);
  const suffixed = prefixed ? null : WAGE_SUFFIXED.exec(text);
  const match = prefixed || suffixed;
  if (!match) { return null; }
  const minor = parseInt(match[1].replace(/[ \u00A0]/g, ''), 10) * 100 + parseInt(match[2], 10);
  return { minor, currency: suffixed ? match[3] : null, label: text };
}

/**
 * The wage chip is a PRICED wage — the server totalled the shift, and totalled it at more than
 * nothing.
 *
 * Two independent signals, because they come from two different fields of the same response and a
 * defect moves them separately:
 *
 *   • `is-unpriced` is `shiftCostClass`, driven by `cost.state`. Its absence is the server SAYING it
 *     totalled the shift.
 *   • the text is `cost.totalMinor` through `priceLabel`. Its value is what the server totalled it AT.
 *
 * A rate that failed to resolve leaves the first clean and the second at zero. That combination is
 * the one this refuses, and the one the old regex accepted.
 *
 * @param label      textContent of `.wf-grid__shift-cost`
 * @param className  the same element's class attribute
 * @returns { minor, currency, label } for the caller to put in the step detail
 */
function assertPricedWage ({ label, className }) {
  const classes = String(className || '');
  if (/\bis-unpriced\b/.test(classes)) {
    throw new Error(
      'The wage chip is marked `is-unpriced`, so the server did NOT total this shift: ' +
      '`WorkforceWeekGrid.shiftCostClass` returns that class for every cost state except Totalled. ' +
      'The chip reads "' + String(label).trim() + '".');
  }

  const parsed = parseWageChip(label);
  if (!parsed) {
    throw new Error(
      'The wage chip is not a money amount. Expected either `kr 1 650,00` (the admin `priceLabel` ' +
      'format) or `1 650,00 CHF` (the currency-mismatch fallback), and the chip reads "' +
      String(label === null || label === undefined ? '' : label).trim() + '".');
  }

  if (parsed.minor <= 0) {
    throw new Error(
      'The wage chip is a ZERO total: "' + parsed.label + '". The shift was priced, and priced at ' +
      'nothing — which is what an unresolved hourly rate produces, since `shiftCostLabel` renders ' +
      'any Totalled cost through `priceLabel(cost.totalMinor)` and `priceLabel(0)` is `kr 0,00`. ' +
      'A staffed shift that costs the restaurant zero kroner is not a wage this journey can call ' +
      'evidence of pricing.');
  }

  return parsed;
}

/**
 * The implied hourly rate, for the step DETAIL — never asserted.
 *
 * Recorded rather than checked because the divisor is the journey's own arithmetic and the dividend
 * is the server's: a backend that rounds øre would make an equality here red for a reason that has
 * nothing to do with the product. What it is good for is a reader of the artifact seeing
 * `kr 220,00/h` and knowing at a glance whether the world's rate is the one they seeded.
 */
function impliedHourlyRate (minor, paidMinutes) {
  if (!paidMinutes) { return null; }
  return Math.round((minor * 60) / paidMinutes);
}

// ---- the rule pack ----------------------------------------------------------------------------

// THE ELEVEN RULES OF `NO-AML-2026-07`, TRANSCRIBED — the same discipline as `CATALOG_KEYS` in
// `workforce-flag-lever.spec.js`, and for the same reason: an expectation computed from the thing it
// checks agrees with it by construction.
//
// Their two independent witnesses, neither of them this file:
//
//   • `OkamAPI/Services/Workforce/WorkforceRulePackSeed.cs` declares exactly these eleven ids in the
//     pack's `rules` array (`paySupplements` is a separate table and produces no rule result), and
//     `WorkforceRuleEvaluator.Evaluate` emits ONE result per rule — `foreach (var ruleToken in
//     rules.OfType<JObject>())` — so the panel's rows and the pack's rules are the same set.
//   • the live run already on record — `artifacts/journeys/workforce-schedule-publish.playwright.json`
//     step 9, `"11 rule results, state Validert"`.
//
// A pack that shrinks, a rule that is renamed, or an engine that silently stops emitting one now
// reds here instead of being spent in a sentence nobody compares.
const WORKFORCE_RULE_PACK_NO = [
  'daily-rest',
  'weekly-rest',
  'ordinary-weekly-hours',
  'break-required',
  'night-window',
  'minor-block',
  'overtime-weekly',
  'overtime-four-weeks',
  'overtime-annual',
  'scheduled-vs-contract',
  'plan-notice-lead'
];

/**
 * The validation panel answered for the WHOLE pack.
 *
 * Set equality in both directions — nothing missing and nothing extra — rather than a count, because
 * a count of eleven is satisfied by eleven of the wrong thing, and rather than an ordered compare,
 * because the render order is the server's emission order and that is not the claim being made here.
 *
 * @param observed  the texts of every `.wf-page__result-id` on screen
 * @param expected  the pack (defaults to the Norwegian one)
 */
function assertRulePackResults (observed, expected) {
  const want = (expected || WORKFORCE_RULE_PACK_NO).slice().sort();
  const got = (observed || []).map(text => String(text).trim()).filter(Boolean).slice().sort();

  if (!got.length) {
    throw new Error(
      'The validation panel rendered NO rule ids. Note that counting `.wf-page__result` cannot see ' +
      'this: `pages/admin/workforce-schedule.vue` gives the empty state ' +
      '(`wf_validation_no_results`) that same class, so the count is at least one whether the pack ' +
      'answered or not. Expected the ' + want.length + ' rules of the pack: ' + want.join(', ') + '.');
  }

  const missing = want.filter(id => !got.includes(id));
  const extra = got.filter(id => !want.includes(id));
  if (missing.length || extra.length || got.length !== want.length) {
    throw new Error(
      'The validation panel is not the pack. Expected ' + want.length + ' rule results ' +
      '(' + want.join(', ') + ') and got ' + got.length + ' (' + got.join(', ') + ').' +
      (missing.length ? ' Missing: ' + missing.join(', ') + '.' : '') +
      (extra.length ? ' Unexpected: ' + extra.join(', ') + '.' : ''));
  }

  return got.length;
}

// ---- the audit stamp --------------------------------------------------------------------------

/**
 * The override was attributed to THE PERSON WHO IS SIGNED IN, not merely to somebody.
 *
 * The two sides are resolved by two different routes on the server and neither is derived from the
 * other, which is what makes this a check rather than a restatement:
 *
 *   • `userId` is what `GET /user` answered and the Vuex store persisted — the account the journey
 *     signed in as;
 *   • the stamp is `updatedByReference` on the flag row, which the API resolves from the BEARER via
 *     `ActorClaims.ResolveUserId` and never from anything the client sent.
 *
 * It holds in both worlds without pinning either: against the fixture both sides are `user-manager`,
 * against a live backend both are the same user id (`UserService.GenerateJwtTokenAsync` mints
 * `unique_name` = `user.Id`, which is exactly what `GET /user` returns as `id`).
 *
 * Matched as a whole token, not as a substring: `user-manager` is a substring of `user-manager-2`,
 * and an actor column off by a suffix is precisely the kind of wrong attribution this exists for.
 */
function assertStampedActor ({ stampText, userId }) {
  const stamp = String(stampText === null || stampText === undefined ? '' : stampText)
    .replace(/\s+/g, ' ').trim();
  const id = String(userId === null || userId === undefined ? '' : userId).trim();

  if (!id) {
    throw new Error(
      'This journey could not read who it is signed in as, so it cannot say whether the flag was ' +
      'attributed to the right person. That is a harness failure, not a product one — and reporting ' +
      'the stamp as "somebody was named" instead would be the weak assertion this replaced.');
  }

  const tokens = stamp.split(/[\s,;()]+/).filter(Boolean);
  if (!tokens.includes(id)) {
    throw new Error(
      'The override is stamped with an actor that is NOT the signed-in user. Signed in as `' + id +
      '`; the row reads "' + stamp + '". A kill switch attributed to the wrong person is worse than ' +
      'one attributed to nobody: the audit trail names somebody who did not do it.');
  }

  return { stamp, userId: id };
}

// ---- the revision the draft opened as ---------------------------------------------------------

const REVISION_NUMBER = /Revisjon\s+(\d+)/i;

/**
 * The draft this run created is REVISION 1 — that is, the week it planned had never been planned.
 *
 * `toContainText('Revisjon')` passed on `Revisjon 2`, which is what the schedule journey produces
 * when it runs on a world `workforce-flag-lever` has already published into: the draft view resolves
 * no revision once the previous one is published, so the badge still reads "Ingen plan" and the run
 * quietly plans a SECOND revision of somebody else's week. It never red; it produced weaker evidence
 * than its own header claimed. `test/e2e/scripts/live-world-reset.sh restore` is what makes the run
 * mean what it says, and this is what notices when it was skipped.
 */
function assertFirstRevision (metaText) {
  const text = String(metaText === null || metaText === undefined ? '' : metaText)
    .replace(/\s+/g, ' ').trim();
  const match = REVISION_NUMBER.exec(text);
  if (!match) {
    throw new Error('No revision number on the schedule meta line; it reads "' + text + '".');
  }
  const number = parseInt(match[1], 10);
  if (number !== 1) {
    throw new Error(
      'This draft opened as revision ' + number + ', not revision 1 — the week had already been ' +
      'planned before this run started. The journey still walks, but what it proves is "a further ' +
      'revision of an existing week", not "a manager plans an unplanned week". Run ' +
      '`test/e2e/scripts/live-world-reset.sh restore` first. Meta line: "' + text + '".');
  }
  return number;
}

// ---- which traffic was the journey's SUBJECT --------------------------------------------------

// THE SHELL. Exactly the routes every admin journey makes to get a person signed in and a store on
// screen, regardless of what the journey is about — read off the `backendSample` of every artifact
// in `artifacts/journeys/`. They are matched as whole paths and never as prefixes, which is
// load-bearing: `account-email-confirm`'s SUBJECT is `/user/send-email-confirmation-code`, and a
// `/user` prefix rule would classify that journey's whole point as shell.
const SHELL_PATHS = [
  /^\/user$/,
  /^\/user\/login$/,
  /^\/user\/sendverificationtoken$/,
  /^\/stores\/\d+$/,
  /^\/stores\/\d+\/market$/,
  /^\/stores\/\d+\/specialopeninghours$/
];

function isShellPath (pathname) {
  return SHELL_PATHS.some(shape => shape.test(String(pathname || '')));
}

/**
 * THE SPLIT-ORIGIN LIE, which neither served floor could see.
 *
 * Both floors ask only whether the named backend answered AT ALL — `stats.served` on the fixture
 * side, `backendResponses === 0` on the live side. Signing in satisfies both. So if a build's
 * subject calls ever went to a different origin than its authentication — a client with its own base
 * URL, a partially-adopted dev server — the run would talk to the named backend for the login,
 * fetch everything the journey is ACTUALLY about from somewhere else, and file an artifact naming a
 * backend that answered nothing but the door.
 *
 * The signature is precise and this refuses only it: the named origin served NONE of the journey's
 * subject calls while some OTHER origin served them. Anything less specific would be a guard people
 * delete —
 *
 *   • a journey whose subject is the browser rather than the backend (the two modal scroll-lock
 *     walks) makes no subject calls anywhere and is not accused of anything;
 *   • fonts, images and scripts are not subject calls: only `xhr` and `fetch` are counted, so a page
 *     that loads a webfont from a CDN is not a split origin;
 *   • a run that reached the named backend for its subject is green no matter what else it also
 *     talked to.
 *
 * @returns the error sentence, or null when there is nothing to say
 */
function judgeSubjectOrigin ({ apiBaseUrl, subjectFromBackend, subjectFromElsewhere, elsewhereSample }) {
  if (subjectFromBackend > 0) { return null; }
  if (!subjectFromElsewhere) { return null; }
  return 'This journey signed in against ' + apiBaseUrl + ' and then fetched EVERYTHING IT IS ' +
    'ABOUT from somewhere else: ' + subjectFromElsewhere + ' subject request(s) were answered by ' +
    'another origin and not one by the backend this artifact names. The served count is not zero — ' +
    'authentication alone reaches that floor — so only the split shows it. Sample: ' +
    (elsewhereSample || []).join(' | ') + '.';
}

module.exports = {
  parseWageChip,
  assertPricedWage,
  impliedHourlyRate,
  WORKFORCE_RULE_PACK_NO,
  assertRulePackResults,
  assertStampedActor,
  assertFirstRevision,
  SHELL_PATHS,
  isShellPath,
  judgeSubjectOrigin
};
