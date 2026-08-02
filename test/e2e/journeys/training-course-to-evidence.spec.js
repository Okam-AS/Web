// JOURNEY — a course becomes evidence, and the server is the one that grades it.
//
// Author a course carrying a competency key, cut a version and PUBLISH it (which freezes its content
// and mints the hash every later record is stamped with), assign it, file a completion, and ask the
// possession projection whether the person now holds the competence. The last step is the only one
// that proves the first five did anything.
//
// ---- WHAT THIS JOURNEY CANNOT DO, AND SAYS SO --------------------------------------------------
//
// Training's stated exit is «a worker passes the quiz». THERE IS NO WORKER-FACING SURFACE, by ruling
// and not by omission — `pages/admin/training-courses.vue` is the only Training page in the app,
// `training-client.js` records that «a worker's own quiz submission has no route anywhere», and
// `TrainingVersionPanel` says out loud on screen that no quiz is authored here because nobody could
// take one. So the achievable walk is the MANAGER half, and the journey files a finding naming the
// gap rather than quietly walking something else and calling it the exit. A journey that stops at a
// named refusal is worth more than no journey; one that pretends it did not stop is worth less.
//
// ---- WHY IT STARTS BY THROWING A SWITCH --------------------------------------------------------
//
// `training.setup` and `training.assignments` are both deny-closed, and Training's refusal shape is
// READ-ONLY rather than dark: `training.flag-disabled-read-only` is documented as «the area's feature
// flag is off on a store that IS visible — reads answer, writes do not». So the gate opens, the lists
// render, the forms are drawn, the submit buttons are enabled — and every write comes back 409. That
// is a far more dangerous state than a blank page, and it is exactly the state an earlier draft of
// this journey never saw: the fixture answered a hard-coded flag map with both flags ON, which is a
// store no venue is. The fixture now resolves them from the same per-store override store the
// operator switchboard writes, and this journey turns both on through `/admin/feature-flags`.
//
// The mutation that proves it: with the two flips removed, the walk reds at the first course create,
// on the 409 banner instead of the course row.
//
// ---- THE CLAIM THIS JOURNEY EXISTS FOR ---------------------------------------------------------
//
// **The UI must not appear to grade.** TR-B1 settled that `RecordTrainingCompletionRequest` carries
// `PersonRef`, `CourseVersionId` and `ScorePercent` and NO verdict field, and that the service writes
// `Passed = TrainingGrading.IsPass(score, version.PassThresholdPercent)` against the exact frozen
// version. This panel used to render a «Passed» checkbox whose value the server discarded, under a
// hint saying the opposite — a manager could tick it, enter 55 against a threshold of 80, and get
// «Ikke bestått» back in the row they had just filed. So the journey files 55 against 80 and asserts
// the row comes back NOT PASSED, then files 90 and asserts the FIRST ROW SURVIVES. The ledger is
// append-only under a SQL trigger; a retake is a second row, and a surface that replaced the first
// would be destroying statutory evidence.
//
// Two refusals, and they are different in kind. A malformed reference is refused BEFORE anything is
// sent — `PersonRef` binds to a `Guid`, so a non-GUID fails model binding and returns a framework 400
// carrying no `training.*` code at all, which this page could not explain. A well-formed reference
// naming nobody is refused BY THE SERVER, and the page attributes it by elimination rather than by
// reading the server's prose.

const { test, journeyDetails, expect } = require('../support/journey');
const { signIn } = require('../support/admin');
const { turnOn, flip } = require('../support/flags');
const world = require('../fixture/world');

/** Ola Ansatt's `workforcePersonId` — the PERSON id, not the engagement's `staffMemberId`. */
const OLA = world.STAFF[0].workforcePersonId;
/** Well formed, and names nobody. The server's own refusal, not the form's. */
const NOBODY = world.UNKNOWN_PERSON_REF;

const SETUP_FLAG = 'training.setup';
const ASSIGNMENTS_FLAG = 'training.assignments';

test(
  'A manager opens Training, publishes a course version, files a failing score, and the SERVER calls it not passed',
  journeyDetails({
    journey: 'training-course-to-evidence',
    surface: 'admin',
    capabilities: [
      'platform.feature-flags.write',
      'training.flags.read-only-refusal',
      'training.course.author',
      'training.version.publish',
      'training.assignment.create',
      'training.completion.record',
      'training.completion.server-graded',
      'training.competency.holdings'
    ]
  }),
  async ({ page, journey }) => {
    await journey.step('sign in and pass the module gate', async () => {
      await page.goto('/admin/training-courses');
      await page.waitForURL(/\/admin\?redirect=/, { timeout: 30000 });
      await signIn(page, { phone: '99999999', code: '123123', expectPath: '/admin/training-courses' });
      await expect(page.locator('.trn-page__title')).toHaveText('Opplæring');
      // The context read is the ONLY refusal on this surface that says anything; past it every 404 is
      // one answer for absent / another store's / never enabled, and every 403 is one answer for "you
      // do not hold this store" and "there is no such store". No gate panel means it answered.
      await expect(page.locator('[data-test="gate"]')).toHaveCount(0);
      await expect(page.locator('[data-test="context-zone"]')).toContainText('Europe/Oslo');
      return 'gate open, zone Europe/Oslo';
    });

    await journey.step('READ-ONLY, NOT DARK: the store is visible and every write is refused', async () => {
      // Training's refusal is the dangerous kind, and this step is here to show it before the walk
      // relies on it being gone. The two flags that gate something are OFF, and the page renders that
      // fact rather than discovering it on a failed write: the flag map on the context read is worth
      // rendering precisely because the same flag being off is a 409 rather than a missing route.
      await expect(page.locator('[data-test="flag-' + SETUP_FLAG + '"]')).toHaveText('Av');
      await expect(page.locator('[data-test="flag-' + ASSIGNMENTS_FLAG + '"]')).toHaveText('Av');

      // The two warnings are DIFFERENT sentences for the two different areas, and both are written
      // out: they are what tells a manager which of the two switches to go and ask for, and a
      // keyword match on "slått av" would be satisfied by either.
      await expect(page.locator('[data-test="course-write-blocked"]')).toHaveText(
        'Serveren melder at kurs og sertifikater er slått av for butikken. Skriving vil bli avvist.');
      await expect(page.locator('[data-test="assignment-write-blocked"]')).toHaveText(
        'Serveren melder at tildeling og gjennomføring er slått av for butikken. Skriving vil bli avvist.');

      // …and the form is STILL THERE and still submittable. The note is a warning, NOT an enforcement
      // point — the server's 409 is the only thing that actually stops the write, and this page
      // deliberately does not pre-empt it. Proven by filling the one field the button's own
      // `canSubmit` requires and then finding the button live: asserting `toBeEnabled` on the empty
      // form would have passed for the wrong reason on a page that DID disable on the flag, because
      // an empty title disables it too.
      const submit = page.locator('[data-test="course-submit"]');
      await expect(submit).toBeDisabled();
      await page.locator('[data-test="course-title"]').fill('Allergenhåndtering');
      await expect(submit).toBeEnabled();
      return 'both flags read "Av"; the form is drawn and its submit goes live anyway';
    });

    await journey.step('and pressing it really is refused, by the server', async () => {
      await page.locator('[data-test="course-submit"]').click();
      // Keyed on `training.flag-disabled-read-only`, which is the code the 409 carries. The banner is
      // the whole sentence, so a page that fell through to its generic «noe gikk galt» would fail
      // here rather than pass on a refusal it could not explain.
      await expect(page.locator('[data-test="failure"]')).toHaveText(
        'Denne delen er slått av for butikken. Lesing virker, skriving gjør det ikke.', { timeout: 15000 });
      // Nothing was written: the list is still empty, so the refusal was a refusal and not a
      // half-completed write with a scary banner over it.
      await expect(page.locator('[data-test="courses-empty"]')).toBeVisible();
      return 'refused 409 training.flag-disabled-read-only; nothing filed';
    });

    await journey.shot('visible, and read-only');

    await journey.step('turn both Training switches on from the operator switchboard', async () => {
      // THROUGH THE PRODUCT. `/admin/feature-flags` is the only caller of `PUT /stores/{id}/feature-flags`
      // in the whole frontend, so pressing its buttons is what makes these switches a capability
      // rather than a curl. Both are needed and they gate different halves: setup covers courses,
      // versions and certificates; assignments covers assignments and the completions filed against
      // them. A journey that flipped only one would stop halfway and look like a product defect.
      await turnOn(page, SETUP_FLAG);
      await turnOn(page, ASSIGNMENTS_FLAG);
      return 'both ' + SETUP_FLAG + ' and ' + ASSIGNMENTS_FLAG + ' on for store ' + world.STORE_ID;
    });

    await journey.step('the same page now reports both switches up', async () => {
      await page.goto('/admin/training-courses');
      await expect(page.locator('.trn-page__title')).toHaveText('Opplæring');
      await expect(page.locator('[data-test="flag-' + SETUP_FLAG + '"]')).toHaveText('På');
      await expect(page.locator('[data-test="flag-' + ASSIGNMENTS_FLAG + '"]')).toHaveText('På');
      // The warnings are gone rather than merely restyled — they are `v-if`s on an explicit `false`.
      await expect(page.locator('[data-test="course-write-blocked"]')).toHaveCount(0);
      await expect(page.locator('[data-test="assignment-write-blocked"]')).toHaveCount(0);
      return 'both flags read "På", both warnings gone';
    });

    await journey.step('author a course that carries a competency key', async () => {
      await expect(page.locator('[data-test="courses-empty"]')).toBeVisible();
      await page.locator('[data-test="course-title"]').fill('Allergenhåndtering');
      await page.locator('[data-test="course-category"]').fill('Mattrygghet');
      // The key is what a PASSING completion later confers. A course without one teaches something
      // and confers nothing, which is a real choice and why the field is optional.
      await page.locator('[data-test="course-competency"]').fill('food.allergens');
      await page.locator('[data-test="course-submit"]').click();

      const rows = page.locator('[data-test="course-row"]');
      await expect(rows).toHaveCount(1, { timeout: 15000 });
      await expect(rows.first()).toContainText('food.allergens');
      return 'Allergenhåndtering · food.allergens';
    });

    await journey.step('cut a draft version with a pass threshold of 80', async () => {
      await page.locator('[data-test="course-row"]').first().click();
      await expect(page.locator('[data-test="versions-empty"]')).toBeVisible({ timeout: 15000 });

      await page.locator('[data-test="version-content"]').fill('["De 14 allergenene", "Krysskontaminering"]');
      // The quiz is deliberately NOT authored here and the panel says so: `QuizJson` is one of the
      // three inputs to the content hash, and a schema guessed today would be minted permanently into
      // the hash every completion against this version is stamped with.
      await expect(page.locator('[data-test="version-quiz-absent"]')).toBeVisible();
      await page.locator('[data-test="version-threshold"]').fill('80');
      await page.locator('[data-test="version-submit"]').click();

      const rows = page.locator('[data-test="version-row"]');
      await expect(rows).toHaveCount(1, { timeout: 15000 });
      await expect(rows.first()).toContainText('Utkast');
      await expect(rows.first()).toContainText('80%');
      return 'v1 Draft, threshold 80 %';
    });

    await journey.step('THE STATED EXIT CANNOT BE WALKED — there is no quiz and nobody to take it', async () => {
      // Recorded HERE, at the point in the walk where a quiz would have been authored, rather than in
      // prose at the top of the file where nothing joins it to a step. The finding is the deliverable
      // of this step; the assertions exist so the finding cannot become stale silently.
      //
      // The panel itself says it, on screen, in the place a quiz author would look:
      const absent = page.locator('[data-test="version-quiz-absent"]');
      await expect(absent).toContainText('Ingen kunne tatt den');
      journey.finding('note',
        'Training\'s stated exit — "a worker passes the quiz" — names a step no shipped screen offers',
        'pages/admin/training-courses.vue is the only Training page in the app: there is no worker-' +
        'facing surface at all, and none is planned for this wave. `utils/training/training-client.js` ' +
        'records that a worker\'s own quiz submission has no route anywhere, so every completion is ' +
        '`ManagerRecorded` by construction; `TrainingVersionPanel` authors no quiz for the same reason ' +
        'and prints the sentence asserted above. What this journey walks is therefore the MANAGER ' +
        'half — a score filed against a frozen threshold — which is the whole of what exists. The ' +
        'Feature\'s exit and L-TRAIN-FIXES\'s exit both name the worker half and neither can be met ' +
        'by any screen on this branch.');
      return 'recorded: the worker half does not exist; walking the manager half';
    });

    await journey.step('DEFECT — the publish button is not clickable at a 1280px viewport', async () => {
      // Found by driving the page, not by reading it. An ordinary `.click()` on the publish button
      // times out: something else is on top of it. The measurement below is what turns "the click
      // timed out" into a defect somebody can act on, so it is taken rather than assumed.
      const button = await page.locator('[data-test="version-publish"]').boundingBox();
      const viewport = page.viewportSize();
      const columns = await page.locator('.trn-page__column').evaluateAll(
        nodes => nodes.map((n) => { const r = n.getBoundingClientRect(); return { left: Math.round(r.left), right: Math.round(r.right) }; }));

      // Whatever the browser says is actually at the button's centre. If it is not the button, no
      // pointer at that point can ever reach it.
      const covering = await page.evaluate(({ x, y }) => {
        const el = document.elementFromPoint(x, y);
        if (!el) { return null; }
        return {
          tag: el.tagName.toLowerCase(),
          className: typeof el.className === 'string' ? el.className : '',
          text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 70)
        };
      }, { x: button.x + button.width / 2, y: button.y + button.height / 2 });

      const blocked = !!covering && !covering.className.includes('trn-btn');
      if (blocked) {
        journey.finding('defect', 'the Training publish button cannot be clicked at a 1280px viewport',
          'pages/admin/training-courses.vue — `.trn-page__columns` is ' +
          '`grid-template-columns: repeat(auto-fit, minmax(420px, 1fr))` over columns that carry ' +
          '`min-width: 0`, so the six-column versions table (which ends in the publish action cell) ' +
          'overflows its own track and its last cell lands under the NEXT column, which paints over ' +
          'it. Measured in Chromium at ' + viewport.width + '×' + viewport.height + ': the button box ' +
          'is x=' + Math.round(button.x) + '–' + Math.round(button.x + button.width) + ', the columns ' +
          'are ' + JSON.stringify(columns) + ', and `document.elementFromPoint` at the button\'s own ' +
          'centre returns <' + covering.tag + ' class="' + covering.className + '"> — "' + covering.text +
          '" — which belongs to the right-hand column. A manager on a 1280px laptop therefore cannot ' +
          'publish a course version by pointing at the control that publishes it; the button is ' +
          'reachable by keyboard, which is the only reason this is not a total block. Fix at the ' +
          'layout: let the table scroll inside its column (`overflow-x: auto`) rather than overflow it.');
      }
      return blocked
        ? 'blocked by <' + covering.tag + ' class="' + covering.className + '">'
        : 'not blocked at this viewport';
    });

    let hash = null;
    await journey.step('publish it — this is the hinge', async () => {
      // DISPATCHED DIRECTLY, and that is the point rather than a convenience. A pointer click cannot
      // reach this control at this viewport (see the step above), so the journey performs the one
      // thing that still proves the HANDLER and the route are wired, while recording that the path a
      // user would take is broken. Using `force: true` would have been dishonest: it still fires at
      // the coordinates, so it would have exercised the covering element.
      await page.locator('[data-test="version-publish"]').dispatchEvent('click');
      const row = page.locator('[data-test="version-row"]').first();
      await expect(row).toContainText('Publisert', { timeout: 15000 });
      // A published version is immutable, so the control that would change it is GONE rather than
      // disabled: there is no server path that would accept the change.
      await expect(page.locator('[data-test="version-publish"]')).toHaveCount(0);
      // The hash is minted over the exact snapshot being published. It is the mechanism by which a
      // completion means "this person passed THIS material", so the journey captures it and matches
      // the completion's stamp against it later.
      hash = (await row.locator('.trn-ref').textContent()).trim();
      expect(hash).not.toBe('—');
      return 'v1 Published, content hash ' + hash;
    });

    await journey.shot('a published version');

    await journey.step('assign it to a named person', async () => {
      const version = page.locator('[data-test="assignment-version"]');
      // ONLY PUBLISHED VERSIONS ARE OFFERED. A draft or a retired version is a 400 from the server,
      // and a control whose only outcome is a refusal is not a control.
      await expect(version.locator('option')).toHaveCount(2);
      await version.selectOption({ index: 1 });
      await page.locator('[data-test="assignment-scope"]').selectOption('Person');
      // Picked from the WORKFORCE roster — a different module with a different authorization, read
      // purely to suggest. Using the picker proves that read landed; the text input stays available
      // under every state of it, because the suggestions are not the accepted set.
      await page.locator('[data-test="assignment-reference-picker"]').selectOption(OLA);
      await expect(page.locator('[data-test="assignment-reference"]')).toHaveValue(OLA);
      await page.locator('[data-test="assignment-due"]').fill('2026-08-15');
      await page.locator('[data-test="assignment-submit"]').click();

      await expect(page.locator('[data-test="assignment-row"]')).toHaveCount(1, { timeout: 15000 });
      return 'v1 assigned to Ola Ansatt, due 2026-08-15';
    });

    await journey.step('a reference that is not a GUID is refused before anything is sent', async () => {
      const before = journey.failedRequests.length;
      await page.locator('[data-test="completion-person"]').fill('ola.ansatt');
      await expect(page.locator('[data-test="completion-person-malformed"]')).toBeVisible();
      await expect(page.locator('[data-test="completion-submit"]')).toBeDisabled();
      // Nothing left the browser: model binding would have answered a framework 400 with no
      // `training.*` code, which this page could not have explained to anyone.
      expect(journey.failedRequests.length).toBe(before);
      return 'refused locally, submit disabled';
    });

    await journey.step('a well-formed reference naming nobody is refused by the SERVER', async () => {
      await page.locator('[data-test="completion-person"]').fill(NOBODY);
      await expect(page.locator('[data-test="completion-person-malformed"]')).toHaveCount(0);
      await page.locator('[data-test="completion-version"]').selectOption({ index: 1 });
      await page.locator('[data-test="completion-score"]').fill('90');
      await page.locator('[data-test="completion-submit"]').click();

      // The cause is established by ELIMINATION — `training.validation` carries no discriminator and
      // the page is forbidden from keying on the server's prose — because the form refuses every
      // other 400 this route can throw before sending.
      const failure = page.locator('[data-test="failure"]');
      await expect(failure).toContainText('peker ikke på en kjent person', { timeout: 15000 });
      // Nothing was filed.
      await expect(page.locator('[data-test="completions-empty"]')).toBeVisible();
      return (await failure.textContent()).trim().slice(0, 80) + '…';
    });

    await journey.step('file 55 against a threshold of 80', async () => {
      // The rule the SERVER runs, stated to the person filling the form in — and the selected
      // version's OWN threshold, read off the same document the picker was built from.
      await expect(page.locator('[data-test="completion-grading-note"]')).toContainText('Serveren avgjør');
      await expect(page.locator('[data-test="completion-threshold-note"]'))
        .toHaveText('Denne versjonen er bestått fra 80% og opp.');

      await page.locator('[data-test="completion-person"]').fill(OLA);
      await page.locator('[data-test="completion-version"]').selectOption({ index: 1 });
      await page.locator('[data-test="completion-score"]').fill('55');
      await page.locator('[data-test="completion-submit"]').click();

      const rows = page.locator('[data-test="completion-row"]');
      await expect(rows).toHaveCount(1, { timeout: 15000 });
      return 'filed 55 % for Ola Ansatt';
    });

    await journey.step('THE ROW COMES BACK NOT PASSED, and the UI did not decide that', async () => {
      const row = page.locator('[data-test="completion-row"]').first();
      await expect(row).toContainText('55%');
      // The server's verdict, printed as it derived it. There is no pass control on the form to have
      // contradicted it, and the table never recomputes the comparison: the threshold that graded
      // this row is the one frozen into ITS version, and a browser rounding where the server's exact
      // decimal comparison does not would be a second opinion about statutory evidence.
      await expect(row.locator('.trn-badge')).toHaveText('Ikke bestått');
      // Stamped with the version hash captured at publish — the join between the record and the
      // material it is a record OF.
      await expect(row).toContainText(hash.replace('…', ''));
      // Only one source exists in this wave; a `Quiz` row would mean the backend changed — and would
      // mean the worker surface this journey recorded as absent had arrived.
      await expect(row).toContainText('Ført av leder');
      return '55 % → Ikke bestått, stamped ' + hash;
    });

    await journey.shot('a failing completion');

    await journey.step('a retake above the threshold passes — and the first row survives', async () => {
      await page.locator('[data-test="completion-person"]').fill(OLA);
      await page.locator('[data-test="completion-version"]').selectOption({ index: 1 });
      await page.locator('[data-test="completion-score"]').fill('90');
      await page.locator('[data-test="completion-submit"]').click();

      const rows = page.locator('[data-test="completion-row"]');
      await expect(rows).toHaveCount(2, { timeout: 15000 });
      // APPEND-ONLY. The ledger is not an upsert: both attempts are on the record, and a surface that
      // replaced the first would be deleting the evidence that a retake was needed.
      const verdicts = (await page.locator('[data-test="completion-row"] .trn-badge').allTextContents())
        .map(t => t.trim()).sort();
      expect(verdicts).toEqual(['Bestått', 'Ikke bestått']);
      const scores = (await rows.allTextContents()).join(' ');
      expect(scores).toContain('55%');
      expect(scores).toContain('90%');
      return 'two rows: 55 % Ikke bestått, 90 % Bestått';
    });

    await journey.step('the possession projection is what proves the six steps did anything', async () => {
      await page.locator('[data-test="holdings-person"]').fill(OLA);
      await page.locator('[data-test="holdings-lookup"]').click();
      await expect(page.locator('[data-test="holdings-answer"]')).toBeVisible({ timeout: 15000 });
      await expect(page.locator('[data-test="holdings-keys"]')).toContainText('food.allergens');
      // POSSESSION ONLY. An absent key means "no fact recorded", never "not qualified" — Training
      // never evaluates a role requirement and never issues a verdict, and the panel says so.
      await expect(page.locator('[data-test="holdings-not-a-verdict"]')).toBeVisible();
      return 'Ola Ansatt holds food.allergens';
    });

    await journey.shot('what the person holds');

    await journey.step('and putting the assignments switch back down closes writing again', async () => {
      // THE MUTATION, RUN BY THE JOURNEY ITSELF. Everything above would be equally green against a
      // fixture that ignored feature flags — which is the defect this walk exists to not repeat — so
      // the walk ends by proving the gate is load-bearing. The EVIDENCE MUST SURVIVE: this is the
      // read-only refusal, not a dark one, and a completion ledger that vanished when a switch was
      // thrown would be a compliance incident rather than a feature.
      await page.goto('/admin/feature-flags');
      await flip(page, 'off', ASSIGNMENTS_FLAG);
      await page.goto('/admin/training-courses');

      await expect(page.locator('[data-test="flag-' + ASSIGNMENTS_FLAG + '"]')).toHaveText('Av');
      // Both completions are still on screen — read-only means the record stays readable, and it is
      // readable WITHOUT selecting anything: the ledger is a store-level list, which is what an
      // inspector would be shown.
      await expect(page.locator('[data-test="completion-row"]')).toHaveCount(2);

      // The completion FORM, though, needs a course selected — its version picker is built from the
      // course detail read, so on a fresh load there is nothing to file against until one is chosen.
      // Selecting it here is part of the walk, not a workaround: it also proves the course detail
      // still reads with the switch down.
      await page.locator('[data-test="course-row"]').first().click();
      await expect(page.locator('[data-test="version-row"]')).toHaveCount(1, { timeout: 15000 });

      // …and the write is refused again.
      await page.locator('[data-test="completion-person"]').fill(OLA);
      await page.locator('[data-test="completion-version"]').selectOption({ index: 1 });
      await page.locator('[data-test="completion-score"]').fill('70');
      await page.locator('[data-test="completion-submit"]').click();
      await expect(page.locator('[data-test="failure"]')).toHaveText(
        'Denne delen er slått av for butikken. Lesing virker, skriving gjør det ikke.', { timeout: 15000 });
      await expect(page.locator('[data-test="completion-row"]')).toHaveCount(2);
      return 'switch down: the two rows survive, the third is refused — the gate is real';
    });

    await journey.step('what the browser said while this ran', () => {
      // RECORDED, NOT ASSERTED. The flow completed, so failing here would say the capability does not
      // work, which is false. A browser error during a working flow is a finding somebody has to
      // decide about, and they cannot decide about something nobody wrote down.
      //
      // SORTED, though, because a finding filed against the wrong surface is nearly as useless as no
      // finding. The router's «Navigation cancelled» pair is the ADMIN SHELL's login redirect racing
      // itself — `AdminPage` replaces to `/admin?redirect=…` and the store selection appends
      // `&storeId=` on top of it — and it appears identically in every signed-in journey in this
      // suite, including ones that touch nothing this page touches. Filing it as a defect here would
      // send somebody to read this page looking for it.
      //
      // The 400 is the unknown-person completion and the 409s are the three flag refusals, all
      // provoked on purpose and all asserted on screen above. Excluded BY THIS JOURNEY ONLY.
      const noise = /favicon|Download the Vue Devtools|status of 400|status of 409/i;
      const shellRedirect = /Navigation cancelled from "\/admin\?redirect=/i;
      const errors = journey.consoleErrors.filter(text => !noise.test(text));

      const shell = errors.filter(text => shellRedirect.test(text));
      if (shell.length) {
        journey.finding('note',
          'the admin shell logs a router «Navigation cancelled» pair on every signed-in journey',
          'Seen ' + shell.length + ' times here and identically in growth-privacy-queue, '
          + 'workforce-flag-lever and workforce-schedule-publish. It is AdminPage\'s login redirect '
          + 'being superseded by the storeId append, not anything on this page. Recorded so it is '
          + 'not re-diagnosed from here.');
      }
      for (const error of errors.filter(text => !shellRedirect.test(text))) {
        journey.finding('defect', 'browser error during the training journey', error);
      }
      return errors.length
        ? shell.length + ' shell-redirect (note), ' + (errors.length - shell.length) + ' this page\'s'
        : 'nothing';
    });
  }
);
