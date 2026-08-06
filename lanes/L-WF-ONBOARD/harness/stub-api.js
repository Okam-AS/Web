// A stub of exactly the four endpoints the demo's join now calls, answering the REAL DTO shapes
// (WorkforceInvitationIssuedResponse, WorkforceClaimResponse, WorkforceStaffMembershipModel,
// WorkforceMeScheduleResponse) with Newtonsoft's StringEnumConverter casing.
//
// It exists to run the demo script's OWN text -- extracted by line range, never retyped -- so the
// jq paths, the header discipline and the assertions are exercised rather than eyeballed. MUT lets
// each assertion be driven red on demand; an assertion nothing can falsify is not an assertion.
const http = require('http');

const MUT = process.env.MUT || 'none';
const PORT = Number(process.env.PORT || 4311);
const MGR_TOKEN = 'manager-bearer-token';
const WRK_TOKEN = 'worker-bearer-token';
const NORA = '11111111-1111-1111-1111-111111111111';
const NORA_PERSON = '22222222-2222-2222-2222-222222222222';
const OTHER_PERSON = '99999999-9999-9999-9999-999999999999';
const RAW_TOKEN = 'RAWTOKEN-must-never-be-printed';

const observed = { issueAuth: null, claimAuth: null, memAuth: null, schedAuth: null, idem: {} };

function send(res, code, body) {
  const payload = JSON.stringify(body);
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(payload);
}

const server = http.createServer((req, res) => {
  let raw = '';
  req.on('data', (c) => { raw += c; });
  req.on('end', () => {
    const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
    const path = url.pathname;
    const auth = (req.headers.authorization || '').replace('Bearer ', '');
    const idem = req.headers['idempotency-key'] || null;

    // Issue (endpoint 6): manager-authenticated, Idempotency-Key required.
    if (req.method === 'POST' && /\/staff\/[^/]+\/invitations$/.test(path)) {
      observed.issueAuth = auth;
      observed.idem.issue = idem;
      if (!idem) return send(res, 400, { status: 400, detail: 'Idempotency-Key required' });
      if (MUT === 'issue-problem') return send(res, 404, { status: 404, title: 'workforce.staff-not-found' });
      return send(res, 200, {
        invitationId: '33333333-3333-3333-3333-333333333333',
        storeId: 42,
        staffMemberId: NORA,
        // A replay answers token=null; MUT reproduces that without needing a second call.
        token: MUT === 'no-token' ? null : RAW_TOKEN,
        expiresAtUtc: '2026-08-11T18:00:00Z',
        createdAtUtc: '2026-08-04T18:00:00Z',
      });
    }

    // Claim (endpoint 32): the CLAIMER authenticates, so this must carry the worker's token.
    if (req.method === 'POST' && path === '/workforce/me/invitations/claim') {
      observed.claimAuth = auth;
      observed.idem.claim = idem;
      const body = JSON.parse(raw || '{}');
      if (body.token !== RAW_TOKEN) return send(res, 404, { status: 404, title: 'workforce.invitation-invalid' });
      return send(res, 200, {
        staffMemberId: NORA,
        storeId: 42,
        workforcePersonId: MUT === 'wrong-person' ? OTHER_PERSON : NORA_PERSON,
        personState: MUT === 'wrong-state' ? 'Invited' : 'Claimed',
        capabilities: ['WorkforceSelf'],
      });
    }

    if (req.method === 'GET' && path === '/workforce/me/staff-memberships') {
      observed.memAuth = auth;
      if (MUT === 'empty-memberships') return send(res, 200, []);
      return send(res, 200, [{
        staffMemberId: NORA, storeId: 42, workforcePersonId: NORA_PERSON,
        displayName: 'Nora Berg', isActive: true, capabilityGrants: 'WorkforceSelf',
        legalEmployerId: '44444444-4444-4444-4444-444444444444',
        activeFromUtc: '2024-01-01T00:00:00Z', activeToUtc: null, roleNames: ['Servitor'],
      }]);
    }

    if (req.method === 'GET' && path === '/workforce/me/schedule') {
      observed.schedAuth = auth;
      return send(res, 200, {
        asOfUtc: '2026-08-04T18:00:00Z',
        fromUtc: url.searchParams.get('from'),
        toUtc: url.searchParams.get('to'),
        items: MUT === 'empty-schedule' ? [] : [{ shiftAssignmentId: '55555555-5555-5555-5555-555555555555', storeId: 42, staffMemberId: NORA }],
      });
    }

    if (path === '/__observed') return send(res, 200, { ...observed, MGR_TOKEN, WRK_TOKEN });
    send(res, 404, { status: 404, title: 'stub.no-such-route', path });
  });
});

server.listen(PORT, '127.0.0.1', () => console.log(`[stub] listening on ${PORT} MUT=${MUT}`));
