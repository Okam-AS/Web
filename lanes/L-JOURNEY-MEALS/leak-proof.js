// IS ARM A3 REAL, OR DID THE MUTATION DO NOTHING?
//
//     node lanes/L-JOURNEY-MEALS/leak-proof.js
//
// Arm A3 of `mutation-proof.py` made the contact-mismatch refusal echo the invited person's email and
// `meals-guest-claim` STAYED GREEN. That is only a finding if the email really was on the wire; if the
// mutation had been a no-op, the green would prove nothing and reporting it would be exactly the kind
// of vacuous assertion this lane exists to catch. So this asks the fixture directly, over HTTP, twice:
// once clean, once mutated, and prints the refusal body both times.
//
// It starts its OWN fixture on its own port and restores `test/e2e/fixture/meals.js` in a `finally`.

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..', '..');
const FIXTURE = path.join(ROOT, 'test', 'e2e', 'fixture', 'meals.js');
const PORT = 4771;

// The forwarded-token case the control exists for: a code issued to marit@example.test, presented by
// somebody signed in as a different account. Both are seeded by test/e2e/fixture/world.js.
const GOOD_TOKEN = 'mealsinv_fixture_open';
const WRONG_ACCOUNT_PHONE = '+4790000001';
const WITHHELD = ['marit@example.test', 'marit', '99999999', 'Marit'];

const FIND = "        'This invitation was issued to a different contact.');";
const REPLACE = "        'This invitation was issued to a different contact.', { intendedContact: invitation.contactEmail });";

const sha = () => crypto.createHash('sha256').update(fs.readFileSync(FIXTURE)).digest('hex');

function waitFor (url, tries) {
  return new Promise((resolve, reject) => {
    const attempt = (left) => {
      fetch(url).then(() => resolve()).catch(() => {
        if (left <= 0) { return reject(new Error('fixture never answered ' + url)); }
        setTimeout(() => attempt(left - 1), 200);
      });
    };
    attempt(tries);
  });
}

async function refusalBody () {
  const base = 'http://127.0.0.1:' + PORT;
  // The fixture's auth wall: any seeded phone with the world OTP returns a bearer token.
  const world = require(path.join(ROOT, 'test', 'e2e', 'fixture', 'world.js'));
  const auth = await fetch(base + '/user/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ phoneNumber: WRONG_ACCOUNT_PHONE, token: world.OTP })
  });
  const authBody = await auth.json();
  const bearer = authBody.accessToken || authBody.token || (authBody.data && authBody.data.accessToken);
  if (!bearer) { throw new Error('no bearer from /user/login: ' + JSON.stringify(authBody).slice(0, 400)); }

  const res = await fetch(base + '/v1/meals/invitations/claim', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: 'Bearer ' + bearer,
      // Every Meals mutation carries one. Without it the request is refused at the idempotency guard
      // and never reaches the contact check — which is what the first draft of this script did, and
      // it reported "no leak" for a request that had not been allowed to leak anything.
      'idempotency-key': crypto.randomUUID()
    },
    body: JSON.stringify({ token: GOOD_TOKEN })
  });
  return { status: res.status, body: await res.text() };
}

async function once (label) {
  const child = spawn(process.execPath, [path.join(ROOT, 'test', 'e2e', 'fixture', 'api-server.js')], {
    cwd: ROOT, env: Object.assign({}, process.env, { E2E_FIXTURE_PORT: String(PORT) }), stdio: 'ignore'
  });
  try {
    await waitFor('http://127.0.0.1:' + PORT + '/__fixture/health', 50);
    const out = await refusalBody();
    const leaked = WITHHELD.filter(s => out.body.includes(s));
    console.log('---- ' + label + ' ----');
    console.log('  HTTP ' + out.status);
    console.log('  body: ' + out.body);
    console.log('  withheld values PRESENT ON THE WIRE: ' + (leaked.length ? JSON.stringify(leaked) : 'none'));
    console.log('');
    return leaked;
  } finally {
    child.kill('SIGTERM');
  }
}

(async () => {
  const original = fs.readFileSync(FIXTURE, 'utf8');
  const before = sha();
  console.log('fixture sha256 ' + before + '\n');

  const clean = await once('CLEAN — the refusal as shipped');

  let mutated;
  try {
    if (original.split(FIND).length - 1 !== 1) { throw new Error('clause not found exactly once'); }
    fs.writeFileSync(FIXTURE, original.replace(FIND, REPLACE), 'utf8');
    mutated = await once('MUTATED — the refusal echoes the intended contact');
  } finally {
    fs.writeFileSync(FIXTURE, original, 'utf8');
  }

  const after = sha();
  console.log('fixture restored: ' + after + (after === before ? ' (identical)' : ' *** NOT RESTORED ***'));
  console.log('');
  if (clean.length === 0 && mutated.length > 0) {
    console.log('CONCLUSION: the mutation is REAL — it put ' + JSON.stringify(mutated) + ' in the 403 body,');
    console.log('and `meals-guest-claim` still exited 0. The journey asserts on the RENDERED PAGE only,');
    console.log('so a server that discloses the invitee to a token holder ships green.');
  } else if (mutated.length === 0) {
    console.log('CONCLUSION: the mutation was a NO-OP — arm A3 proves nothing and must be withdrawn.');
  } else {
    console.log('CONCLUSION: the CLEAN refusal already leaks. That is a live defect, not a mutation result.');
  }
})().catch((err) => { console.error(err); process.exit(1); });
