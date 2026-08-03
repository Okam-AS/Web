#!/usr/bin/env node
//
// DOES THE E2E FIXTURE STILL REFUSE WHAT THE BACKEND REFUSES?
//
//   OKAM_API_REPO=/path/to/OkamAPI npm run test:e2e:fixture-divergence
//   npm run test:e2e:fixture-divergence -- --prove     (no checkout needed; see below)
//
// ---- WHY THIS EXISTS ---------------------------------------------------------------------------
//
// A fixture is a claim about a backend and nothing checked the claim. Twice in one day this one was
// found a release behind: the newsletter test-send guard checked address equality but NOT the
// confirmation flag that had just landed, answering `400 growth.test_address_not_own` where the API
// answers `403`; and two ported fixtures answered hard-coded flags, so the surfaces they stood in for
// could not refuse at all. Six journeys were once green for exactly that reason. The remedy so far
// was a lane noticing by hand, which is not a remedy.
//
// `refusal-shapes.js` holds the derivation and explains what a refusal shape is and why both sides
// are read out of source. This file is the runner: it prints what diverged and fails the process.
//
// ---- WHY IT TAKES A CHECKOUT RATHER THAN A COMMITTED SNAPSHOT ---------------------------------
//
// A snapshot of the API's refusals, committed here and compared against, would go green the moment
// the backend moved and nobody regenerated it — which is the failure this check exists to end, moved
// one file across. So the API is read live, from the same `OKAM_API_REPO` that `live-world.sh`
// already takes, and the commit it read is printed with the verdict. A result without a commit is
// not a measurement.
//
// THE ESTATE HAS NO SINGLE BACKEND, and that is a finding rather than an inconvenience: the module
// work lives across many worktrees at different commits, so "the backend" is whichever one you point
// at. Pointing at two and getting two answers is correct behaviour — it says the fixture is level
// with one branch and not another, which is exactly what a lane needs to know before it walks a
// journey.
//
// ---- --prove ----------------------------------------------------------------------------------
//
// A guard that cannot fail is worth nothing, and a guard that fails on everything is worth less. The
// proof arms both halves against stand-in trees built in a temp directory, so they need no checkout
// and no network:
//
//   1. level         a fixture that mirrors its backend is GREEN.
//   2. removed       delete one refusal from the fixture -> RED, naming that refusal.
//   3. restatused    keep the code, change the status -> RED as a status mismatch (the found defect).
//   4. invented      a refusal the backend cannot give -> RED the other way round.
//   5. benign-fixture   rename a helper, rewrite a message, reorder handlers, add a 200 field -> GREEN.
//   6. benign-backend   rewrite a message, add a method, add a WHOLE NEW ROUTE with refusals of its
//                       own -> GREEN, because a route the fixture does not anchor is not its claim.
//   7. stale-exemption  an exemption for a refusal the backend no longer has -> RED as stale.
//
// Arms 5 and 6 are the half that discriminates: without them this would pass identically as a diff of
// the two files, which is a guard people stop reading.
//
// Not wired into CI: no workflow in this repo runs any suite yet (`F-GUARD-PROOF-NOT-IN-CI`).

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const { deriveFixture, deriveBackend, compare } = require('./refusal-shapes');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const FIXTURE_DIR = path.join(REPO_ROOT, 'test', 'e2e', 'fixture');

function die (message) {
  process.stderr.write('\n  ' + message + '\n\n');
  process.exit(2);
}

function describeCommit (repo) {
  try {
    const sha = execFileSync('git', ['-C', repo, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();
    const branch = execFileSync('git', ['-C', repo, 'rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf8' }).trim();
    const dirty = execFileSync('git', ['-C', repo, 'status', '--porcelain', '--untracked-files=no'], { encoding: 'utf8' }).trim();
    return sha + ' [' + branch + ']' + (dirty ? ' + uncommitted changes' : '');
  } catch (error) {
    return '(not a git checkout)';
  }
}

/** Runs the comparison and returns `{ findings, fixture, backend }`. Exported for the Jest arms. */
function run (fixtureDir, apiRepo) {
  const fixture = deriveFixture(fixtureDir);
  const backend = deriveBackend(apiRepo);
  for (const route of Object.keys(fixture.routes)) {
    const entry = backend.routes[route];
    if (entry) { entry.refusals = backend.refusalsFor(route); }
  }
  const { findings, compared } = compare(fixture, backend);
  return { findings, compared, fixture, backend };
}

// ---- the report ---------------------------------------------------------------------------------

const KIND_HEADING = {
  'status-mismatch': 'ANSWERED AT THE WRONG STATUS — the same code, a different number',
  'fixture-behind': 'THE FIXTURE IS BEHIND — the API refuses and the fixture does not',
  'fixture-ahead': 'THE FIXTURE IS AHEAD — the fixture refuses and the API does not',
  'unknown-route': 'ANCHORED TO A ROUTE THAT IS NOT THERE',
  'stale-exemption': 'AN EXEMPTION THAT HAS OUTLIVED ITS REASON'
};

function report (result, apiRepo) {
  const lines = [];
  lines.push('');
  lines.push('  fixture   ' + path.relative(REPO_ROOT, result.fixture.dir) + '  (' +
    result.fixture.anchorCount + ' anchored routes)');
  lines.push('  backend   ' + apiRepo);
  lines.push('            ' + describeCommit(apiRepo) + ', ' +
    Object.keys(result.backend.routes).length + ' routes, ' +
    result.backend.exceptionClasses.length + ' typed error families');
  lines.push('');

  if (result.fixture.malformed.length) {
    lines.push('  ANNOTATIONS THAT DID NOT PARSE');
    for (const bad of result.fixture.malformed) { lines.push('    ' + bad); }
    lines.push('');
  }
  if (result.fixture.loose.length) {
    lines.push('  note: an annotation token that does not open a comment line is ignored —');
    for (const stray of result.fixture.loose) { lines.push('    ' + stray); }
    lines.push('');
  }
  if (result.fixture.bypasses.length) {
    lines.push('  note: a non-2xx answered without a refusal helper carries no code to compare —');
    for (const bypass of result.fixture.bypasses) { lines.push('    ' + bypass); }
    lines.push('');
  }

  const byKind = {};
  for (const finding of result.findings) { (byKind[finding.kind] = byKind[finding.kind] || []).push(finding); }
  for (const kind of Object.keys(KIND_HEADING)) {
    if (!byKind[kind]) { continue; }
    lines.push('  ' + KIND_HEADING[kind]);
    for (const finding of byKind[kind]) {
      lines.push('    ' + finding.route);
      lines.push('      ' + finding.where + '  ' + finding.detail);
    }
    lines.push('');
  }
  return lines.join('\n');
}

// ---- the proof ----------------------------------------------------------------------------------

const STAND_IN_EXCEPTION = `
namespace WebApi.Services.Probe
{
    public sealed class ProbeApiException : System.Exception
    {
        public string Code { get; }
        public int StatusCode { get; }
        public ProbeApiException(string code, int statusCode, string message) : base(message)
        { Code = code; StatusCode = statusCode; }

        public static ProbeApiException BadRequest(string code, string message)
            => new ProbeApiException(code, 400, message);
        public static ProbeApiException Forbidden(string code = "probe.forbidden", string message = "No.")
            => new ProbeApiException(code, 403, message);
        public static ProbeApiException NotFound()
            => new ProbeApiException("probe.not_found", 404, "Not found.");
        public static ProbeApiException Conflict(string code, string message)
            => new ProbeApiException(code, 409, message);
    }
}
`;

const STAND_IN_SERVICE = `
using WebApi.Services.Probe;
namespace WebApi.Services.Probe
{
    public sealed class ProbeService
    {
        public void SendAsync(string address)
        {
            if (address == null)
            {
                throw ProbeApiException.BadRequest("probe.address_required", "An address is required.");
            }
            RequireOwnAddress(address);
        }

        private void RequireOwnAddress(string address)
        {
            throw ProbeApiException.Forbidden("probe.address_not_own", "Only your own address.");
        }
    }
}
`;

const STAND_IN_CONTROLLER = `
using Microsoft.AspNetCore.Mvc;
using WebApi.Services.Probe;
namespace WebApi.Controllers
{
    [ApiController]
    [Route("v1/probe")]
    public class ProbeController : ControllerBase
    {
        private readonly ProbeService _probe;

        [HttpPost("stores/{storeId:int}/sends")]
        public IActionResult Send(int storeId, [FromBody] string address)
        {
            if (!Authorize(storeId))
            {
                return Error(ProbeApiException.NotFound());
            }
            _probe.SendAsync(address);
            return Ok();
        }

        private bool Authorize(int storeId) => true;
        private IActionResult Error(ProbeApiException ex) => StatusCode(ex.StatusCode);
    }
}
`;

const STAND_IN_FIXTURE = `
function probeError (ctx, status, code, message) {
  ctx.send(status, { error: { code, message } });
  return true;
}

function probeNotFound (ctx) {
  return probeError(ctx, 404, 'probe.not_found', 'Not found.');
}

function route (ctx) {
  // @backend-preamble
  if (!ctx.caller) {
    return probeNotFound(ctx);
  }

  // @backend POST /v1/probe/stores/{storeId}/sends
  if (ctx.path === '/v1/probe/sends' && ctx.method === 'POST') {
    if (!ctx.body.address) {
      return probeError(ctx, 400, 'probe.address_required', 'An address is required.');
    }
    if (ctx.body.address !== ctx.caller.email) {
      return probeError(ctx, 403, 'probe.address_not_own', 'Only your own address.');
    }
    ctx.send(200, { status: 'Sent' });
    return true;
  }

  return false;
}

module.exports = { route };
`;

function standInWorld (root) {
  fs.mkdirSync(path.join(root, 'api', 'Controllers'), { recursive: true });
  fs.mkdirSync(path.join(root, 'api', 'Services', 'Probe'), { recursive: true });
  fs.mkdirSync(path.join(root, 'fixture'), { recursive: true });
  fs.writeFileSync(path.join(root, 'api', 'Services', 'Probe', 'ProbeApiException.cs'), STAND_IN_EXCEPTION);
  fs.writeFileSync(path.join(root, 'api', 'Services', 'Probe', 'ProbeService.cs'), STAND_IN_SERVICE);
  fs.writeFileSync(path.join(root, 'api', 'Controllers', 'ProbeController.cs'), STAND_IN_CONTROLLER);
  fs.writeFileSync(path.join(root, 'fixture', 'probe.js'), STAND_IN_FIXTURE);
  return { api: path.join(root, 'api'), fixture: path.join(root, 'fixture') };
}

const FIXTURE_FILE = 'probe.js';
const SERVICE_FILE = path.join('Services', 'Probe', 'ProbeService.cs');
const CONTROLLER_FILE = path.join('Controllers', 'ProbeController.cs');

/** The arms. Each mutates one side, states what it expects, and is checked against what happened. */
const ARMS = [
  {
    name: 'level',
    expect: 'green',
    describe: 'a fixture that mirrors its backend'
  },
  {
    name: 'removed',
    expect: 'fixture-behind',
    describe: 'one refusal deleted from the fixture',
    fixture: source => source.replace(
      / {4}if \(ctx\.body\.address !== ctx\.caller\.email\) \{[\s\S]*?\n {4}\}\n/,
      '')
  },
  {
    name: 'restatused',
    expect: 'status-mismatch',
    describe: 'the refusal kept, answered at 400 instead of 403 (the defect that was found)',
    fixture: source => source.replace(
      "probeError(ctx, 403, 'probe.address_not_own'",
      "probeError(ctx, 400, 'probe.address_not_own'")
  },
  {
    name: 'invented',
    expect: 'fixture-ahead',
    describe: 'a refusal the backend cannot give',
    fixture: source => source.replace(
      "    ctx.send(200, { status: 'Sent' });",
      "    if (ctx.body.mood === 'bad') { return probeError(ctx, 409, 'probe.invented', 'No.'); }\n" +
      "    ctx.send(200, { status: 'Sent' });")
  },
  {
    name: 'benign-fixture',
    expect: 'green',
    describe: 'helper renamed, message rewritten, handlers reordered, a field added to the 200',
    fixture: source => source
      .replace(/probeError/g, 'refuse')
      .replace(/'An address is required\.'/g, "'Vi trenger en adresse.'")
      .replace("ctx.send(200, { status: 'Sent' });", "ctx.send(200, { status: 'Sent', at: 'now' });")
      .replace(
        / {4}if \(!ctx\.body\.address\) \{\n(.*\n) {4}\}\n {4}if \(ctx\.body\.address !== ctx\.caller\.email\) \{\n(.*\n) {4}\}\n/,
        '    if (ctx.body.address !== ctx.caller.email) {\n$2    }\n    if (!ctx.body.address) {\n$1    }\n')
  },
  {
    name: 'benign-backend',
    expect: 'green',
    describe: 'backend message rewritten, a helper added, a whole new route with its own refusals',
    backend: source => source
      .replace('"An address is required."', '"En adresse er pakrevd."')
      .replace('        private void RequireOwnAddress', `        public string Describe() => "probe";

        private void RequireOwnAddress`),
    // A route the fixture does not anchor is not the fixture's claim, so its refusals — however many
    // — must not reach the verdict. This is the arm that separates a divergence check from a diff.
    controller: source => source.replace('        private bool Authorize', `        [HttpPost("stores/{storeId:int}/quarantine")]
        public IActionResult Quarantine(int storeId)
        {
            if (!Authorize(storeId))
            {
                return Error(ProbeApiException.NotFound());
            }
            throw ProbeApiException.Conflict("probe.quarantined", "Not while quarantined.");
        }

        private bool Authorize`)
  },
  {
    name: 'stale-exemption',
    expect: 'stale-exemption',
    describe: 'an exemption naming a refusal the backend does not have',
    fixture: source => source.replace(
      '  // @backend-preamble',
      '  // @backend-unmodelled 503 probe.never — this refusal does not exist anywhere\n  // @backend-preamble')
  }
];

function prove () {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fixture-divergence-proof-'));
  const failures = [];
  const lines = [];
  try {
    for (const arm of ARMS) {
      const armRoot = path.join(root, arm.name);
      const world = standInWorld(armRoot);
      if (arm.fixture) {
        const file = path.join(world.fixture, FIXTURE_FILE);
        const before = fs.readFileSync(file, 'utf8');
        const after = arm.fixture(before);
        if (after === before) { failures.push(arm.name + ': the fixture mutation changed nothing'); }
        fs.writeFileSync(file, after);
      }
      if (arm.backend) {
        const file = path.join(world.api, SERVICE_FILE);
        const before = fs.readFileSync(file, 'utf8');
        const after = arm.backend(before);
        if (after === before) { failures.push(arm.name + ': the backend mutation changed nothing'); }
        fs.writeFileSync(file, after);
      }
      if (arm.controller) {
        const file = path.join(world.api, CONTROLLER_FILE);
        const before = fs.readFileSync(file, 'utf8');
        const after = arm.controller(before);
        if (after === before) { failures.push(arm.name + ': the controller mutation changed nothing'); }
        fs.writeFileSync(file, after);
      }

      const result = run(world.fixture, world.api);
      const kinds = [...new Set(result.findings.map(f => f.kind))].sort();
      const got = kinds.length === 0 ? 'green' : kinds.join('+');
      const ok = got === arm.expect;
      if (!ok) {
        failures.push(arm.name + ': expected ' + arm.expect + ', got ' + got +
          (result.findings.length ? ' — ' + result.findings.map(f => f.detail).join(' | ') : ''));
      }
      lines.push('  ' + (ok ? 'ok  ' : 'FAIL') + '  ' + arm.name.padEnd(16) + got.padEnd(18) + arm.describe);
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
  return { failures, lines };
}

// ---- entry --------------------------------------------------------------------------------------

function main () {
  if (process.argv.includes('--prove')) {
    const { failures, lines } = prove();
    process.stdout.write('\n  SEVEN ARMS AGAINST A STAND-IN WORLD\n\n' + lines.join('\n') + '\n\n');
    if (failures.length) {
      process.stdout.write('  the proof itself is broken:\n    ' + failures.join('\n    ') + '\n\n');
      process.exit(1);
    }
    process.stdout.write('  the check reds on divergence in three directions and stays green through' +
      ' benign change on both sides.\n\n');
    return;
  }

  const apiRepo = process.env.OKAM_API_REPO;
  if (!apiRepo) {
    die('OKAM_API_REPO is not set. Point it at the OkamAPI checkout this fixture claims to stand in\n' +
      '  for — the same variable `test/e2e/scripts/live-world.sh` takes:\n\n' +
      '      OKAM_API_REPO=/Users/you/okam/OkamAPI npm run test:e2e:fixture-divergence\n\n' +
      '  There is no default and no committed snapshot on purpose: a claim about a backend has to name\n' +
      '  the backend it was checked against. Run `-- --prove` to exercise the check without one.');
  }
  if (!fs.existsSync(path.join(apiRepo, 'WebApi.csproj'))) {
    die('no WebApi.csproj under OKAM_API_REPO=' + apiRepo);
  }

  const result = run(FIXTURE_DIR, apiRepo);
  process.stdout.write(report(result, apiRepo));

  if (result.fixture.anchorCount === 0) {
    die('no anchored routes were found. This check examined nothing, which is not the same as' +
      ' finding nothing.');
  }
  if (result.fixture.malformed.length) {
    process.stdout.write('  an annotation that does not parse is an unchecked claim.\n\n');
    process.exit(1);
  }
  if (result.findings.length) {
    process.stdout.write('  ' + result.findings.length + ' divergence(s) across ' +
      result.fixture.anchorCount + ' anchored routes.\n\n');
    process.exit(1);
  }
  process.stdout.write('  ' + result.fixture.anchorCount +
    ' anchored routes refuse exactly what that checkout refuses.\n\n');
}

if (require.main === module) { main(); }

module.exports = { run, prove, report, ARMS };
