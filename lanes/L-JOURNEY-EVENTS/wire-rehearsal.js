// Wire-level rehearsal of the enquiry-to-settlement walk against the fixture, so the fixture is
// known good before a browser is asked to drive it. Not a deliverable.
const { spawn } = require('child_process');
const path = require('path');

const REPO = '/Users/svendaneel/okam/Web-modules';
const PORT = 4099;
const BASE = 'http://127.0.0.1:' + PORT;
const world = require(path.join(REPO, 'test/e2e/fixture/world.js'));

const server = spawn(process.execPath, [path.join(REPO, 'test/e2e/fixture/api-server.js')], {
  env: Object.assign({}, process.env, { E2E_FIXTURE_PORT: String(PORT) }),
  stdio: 'inherit'
});

const ok = [];
const bad = [];
function check (label, condition, detail) {
  (condition ? ok : bad).push(label + (detail === undefined ? '' : ' :: ' + JSON.stringify(detail)));
}

async function call (method, route, body, headers) {
  const response = await fetch(BASE + route, {
    method,
    headers: Object.assign({ 'Content-Type': 'application/json' }, headers || {}),
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  let payload = null;
  try { payload = await response.json(); } catch (e) { payload = null; }
  return { status: response.status, body: payload };
}

async function main () {
  await new Promise(r => setTimeout(r, 700));
  await call('POST', '/__fixture/reset');

  const login = await call('POST', '/user/login', { phoneNumber: world.MANAGER_PHONE, token: world.OTP });
  check('login', login.status === 200 && !!login.body.token, login.status);
  const auth = { Authorization: 'Bearer ' + login.body.token };
  const store = world.STORE_ID;

  // 1. the public enquiry, with the module OFF
  const inquiry = await call('POST', '/events/inquiries', {
    storeId: store, title: 'Julebord for Nordane AS', eventDate: '2026-12-12',
    startTime: '18:00', endTime: '23:30', guestCountPlanned: 40,
    contactName: 'Nina Nordmann', contactEmail: 'nina@nordane.test', contactPhone: '+4791000002',
    companyName: 'Nordane AS', message: 'Vi trenger et glutenfritt alternativ.'
  });
  check('inquiry accepted with the module off', inquiry.status === 200 && !!inquiry.body.publicId, inquiry);

  // 2. the venue cannot see it
  const darkList = await call('GET', '/events/admin/' + store + '/events', undefined, auth);
  check('pipeline dark', darkList.status === 404 && darkList.body.code === 'EVENTS_DISABLED', darkList);

  // 3. the lever
  const flagOn = await call('PUT', '/stores/' + store + '/feature-flags',
    { flagKey: world.EVENTS_CORE_FLAG, enabled: true }, auth);
  check('Events.Core on', flagOn.status === 200 && flagOn.body.effective === true, flagOn.status);

  const list = await call('GET', '/events/admin/' + store + '/events', undefined, auth);
  const row = (list.body || []).find(r => r.publicId === inquiry.body.publicId);
  check('the enquiry is in the pipeline', !!row && row.status === 'Inquiry', list.body);
  const eventId = row && row.id;

  // 4. draft + send
  const draft = await call('POST', '/events/admin/' + store + '/events/' + eventId + '/proposal-versions', {
    currencyCode: 'NOK', minimumSpendMinor: 3000000, roomFeeMinor: 400000, depositRequiredMinor: 0,
    termsText: 'Avbestilling senere enn 14 dager foer arrangementet faktureres i sin helhet.',
    expiresAtUtc: '2026-11-30T23:00:00Z',
    lines: [{ kind: 'Package', description: 'Julebordmeny', quantity: 40, unitPriceMinor: 89500, vatRate: 0.25 }]
  }, auth);
  check('draft', draft.status === 200 && draft.body.status === 'Draft' && draft.body.totalMinor === 3580000, draft.body);

  const draftRead = await call('GET', '/events/proposals/' + draft.body.publicToken);
  check('a draft is not publicly readable',
    draftRead.status === 404 && draftRead.body.code === 'EVENTS_PROPOSAL_NOT_FOUND', draftRead);

  const sent = await call('POST',
    '/events/admin/' + store + '/events/' + eventId + '/proposal-versions/1/send', {}, auth);
  check('send', sent.status === 200 && sent.body.status === 'Sent' && !!sent.body.contentHash, sent.body);
  const token = sent.body.publicToken;

  const offer = await call('GET', '/events/proposals/' + token);
  check('the guest can read the offer', offer.status === 200 && offer.body.isActionable === true, offer.status);

  // 5. THE OFF-FLAG ARM: same token, same call, one variable
  await call('PUT', '/stores/' + store + '/feature-flags', { flagKey: world.EVENTS_CORE_FLAG, enabled: false }, auth);
  const refused = await call('POST', '/events/proposals/' + token + '/accept',
    { acceptorName: 'Nina Nordmann', acceptorEmail: 'nina@nordane.test' });
  check('accept REFUSED with the module off',
    refused.status === 404 && refused.body.code === 'EVENTS_PROPOSAL_NOT_FOUND', refused);

  const declineRefused = await call('POST', '/events/proposals/' + token + '/decline', { note: null });
  check('decline REFUSED with the module off',
    declineRefused.status === 404 && declineRefused.body.code === 'EVENTS_PROPOSAL_NOT_FOUND', declineRefused);

  // and nothing was written
  await call('PUT', '/stores/' + store + '/feature-flags', { flagKey: world.EVENTS_CORE_FLAG, enabled: true }, auth);
  const afterRefusal = await call('GET', '/events/admin/' + store + '/events/' + eventId, undefined, auth);
  check('the refusal wrote nothing', afterRefusal.body.status === 'ProposalSent' &&
    afterRefusal.body.versions[0].status === 'Sent', afterRefusal.body.status);

  // 6. the same accept, with the flag on
  const accepted = await call('POST', '/events/proposals/' + token + '/accept',
    { acceptorName: 'Nina Nordmann', acceptorEmail: 'nina@nordane.test' });
  check('accept ACCEPTED with the module on',
    accepted.status === 200 && accepted.body.acceptedVersionNo === 1 &&
    accepted.body.proposalContentHash === sent.body.contentHash, accepted);
  check('a zero-deposit acceptance confirms outright', accepted.body.eventStatus === 'Confirmed', accepted.body);

  const replay = await call('POST', '/events/proposals/' + token + '/accept', {});
  check('a second accept replays', replay.status === 200 &&
    replay.body.acceptedAtUtc === accepted.body.acceptedAtUtc, replay.status);

  // 7. the settlement tail
  const gatedSettlement = await call('GET', '/events/admin/' + store + '/events/' + eventId + '/settlement', undefined, auth);
  check('settlement gated by its own flag',
    gatedSettlement.status === 404 && gatedSettlement.body.code === 'EVENTS_DISABLED', gatedSettlement);

  await call('PUT', '/stores/' + store + '/feature-flags', { flagKey: world.EVENTS_SETTLEMENT_FLAG, enabled: true }, auth);

  const service = await call('POST', '/events/admin/' + store + '/events/' + eventId + '/start-service', {}, auth);
  check('start service', service.status === 200 && service.body.eventStatus === 'InService', service.body);

  const closed = await call('POST', '/events/admin/' + store + '/events/' + eventId + '/close', {}, auth);
  check('close opens a Draft statement', closed.status === 200 && closed.body.eventStatus === 'Settling' &&
    closed.body.settlement.status === 'Draft', closed.body);
  let revision = closed.body.settlement.revision;

  const noPrecondition = await call('POST',
    '/events/admin/' + store + '/events/' + eventId + '/settlement/lines',
    { kind: 'Invoice', amountMinor: 3580000 }, auth);
  check('a settlement write without If-Match is refused',
    noPrecondition.status === 400 && noPrecondition.body.code === 'EVENTS_REVISION_REQUIRED', noPrecondition);

  const stale = await call('POST', '/events/admin/' + store + '/events/' + eventId + '/settlement/lines',
    { kind: 'Invoice', amountMinor: 3580000 }, Object.assign({ 'If-Match': 'nonsense' }, auth));
  check('a stale If-Match is refused', stale.status === 409 && stale.body.code === 'EVENTS_CONFLICT', stale);

  const line = await call('POST', '/events/admin/' + store + '/events/' + eventId + '/settlement/lines',
    { kind: 'Invoice', amountMinor: 3580000, sourceReference: 'F-2026-4471', note: 'Faktura' },
    Object.assign({ 'If-Match': revision }, auth));
  check('the invoice line lands', line.status === 200 && line.body.statementTotalMinor === 3580000 &&
    line.body.lines[0].matchState === 'Unverified', line.body);
  revision = line.body.revision;

  const earlyClose = await call('POST', '/events/admin/' + store + '/events/' + eventId + '/settlement/close',
    {}, Object.assign({ 'If-Match': revision }, auth));
  check('closing before reconciling is refused', earlyClose.status === 409 &&
    earlyClose.body.code === 'EVENTS_SETTLEMENT_NOT_RECONCILED', earlyClose);

  const reconciled = await call('POST', '/events/admin/' + store + '/events/' + eventId + '/settlement/reconcile',
    {}, Object.assign({ 'If-Match': revision }, auth));
  check('reconcile', reconciled.status === 200 && reconciled.body.settlement.status === 'Reconciled' &&
    reconciled.body.mismatchedLineNos.length === 0, reconciled.body);
  revision = reconciled.body.settlement.revision;

  const settled = await call('POST', '/events/admin/' + store + '/events/' + eventId + '/settlement/close',
    {}, Object.assign({ 'If-Match': revision }, auth));
  check('the statement closes and the event is Settled',
    settled.status === 200 && settled.body.eventStatus === 'Settled' &&
    settled.body.settlement.status === 'Closed' && !!settled.body.settlement.closedAtUtc, settled.body);

  // 8. the standing world still answers as it did
  const standing = await call('GET', '/events/proposals/' + world.OPEN_PROPOSAL_TOKEN);
  check('the standing open proposal still reads', standing.status === 200 &&
    standing.body.isActionable === true, standing.status);
  const standingAccept = await call('POST', '/events/proposals/' + world.OPEN_PROPOSAL_TOKEN + '/accept',
    { acceptorName: 'Nina Nordmann', acceptorEmail: 'nina@nordane.test' });
  check('the standing proposal still accepts (its venue HAS the module)',
    standingAccept.status === 200 && standingAccept.body.acceptedVersionNo === 2, standingAccept);
  const standingEvent = await call('GET', '/events/admin/' + store + '/events/' + world.ADMIN_EVENT_ID, undefined, auth);
  check('the standing admin event still reads', standingEvent.status === 200 &&
    standingEvent.body.status === 'Confirmed', standingEvent.status);
  const standingSheet = await call('GET', '/events/admin/' + store + '/events/' + world.ADMIN_EVENT_ID + '/run-sheet', undefined, auth);
  check('the standing run sheet still reads', standingSheet.status === 200 &&
    standingSheet.body.versionNo === 3, standingSheet.status);

  process.stdout.write('\nPASS ' + ok.length + '\n' + ok.map(l => '  ok   ' + l).join('\n') + '\n');
  if (bad.length) {
    process.stdout.write('\nFAIL ' + bad.length + '\n' + bad.map(l => '  FAIL ' + l).join('\n') + '\n');
  }
  server.kill();
  process.exit(bad.length ? 1 : 0);
}

main().catch((error) => {
  process.stdout.write('THREW: ' + (error && error.stack) + '\n');
  server.kill();
  process.exit(2);
});
