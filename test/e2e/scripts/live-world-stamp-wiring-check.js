#!/usr/bin/env node
//
// DOES `live-world.sh` STILL HAND THE STAMP BOTH THINGS THE STAMP'S GUARDS NEED?
//
//   node test/e2e/scripts/live-world-stamp-wiring-check.js
//   npm run test:e2e:live-world-stamp
//
// ---- WHY THIS EXISTS --------------------------------------------------------------------------
//
// `test/e2e/support/world-stamp.js` refuses to name a commit the binary was not built from, and
// refuses to stamp a launcher instead of the process on the socket. Both refusals are pinned by
// `test/world-stamp-windows.test.js`, and both depend on `live-world.sh` PASSING THE RIGHT ARGUMENT:
//
//   builtFrom    the build token, read at the moment the binary was built. Handed over stale, or not
//                at all, and the stamp refuses — safe, but the world silently stops being nameable.
//   launchedPid  the pid this script started. Hand over something that is not an ancestor of the
//                socket holder and, again, no stamp.
//
// That wiring is EXACTLY what nothing executes. This script needs a SQL container, the migration chain
// and a real WebApi to run at all, so on the day the two windows were found it had never been run end
// to end — which is how both of them survived review of the module. A unit test cannot see a shell
// script, and a shell script nobody runs is where a guard goes to die quietly.
//
// So this file checks the two halves that CAN be checked without a database:
//
//   STRUCTURE   the script still reads the build token after it builds, and still hands both the token
//               and the launcher pid to `write`. Positions are read from the invocation, not assumed,
//               so reordering the CLI in one file and not the other reds.
//   BEHAVIOUR   the two windows, opened for real against the real CLI: a bash launcher whose CHILD
//               holds a socket (the shape `nohup dotnet run` produces), and a checkout whose head
//               moves between the build and the stamp.
//
// ---- WHAT IT CANNOT SEE -----------------------------------------------------------------------
//
//   • Not that `live-world.sh` works. Nothing here starts a database, applies a chain or runs WebApi.
//     It proves the CLI contract the script depends on, and that the script still speaks it.
//   • Not that the guards are correct. That is `test/world-stamp-windows.test.js`, whose own mutation
//     proof is in lanes/L-WORLD-STAMP-WINDOWS/.
//   • It reads a COPY of world-stamp.js in a temp directory, so the stamps it writes land beside that
//     copy and never in this checkout's artifacts/ — the same reason build-provenance-proof.js copies.

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, spawnSync, execFileSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const SCRIPT = path.join(REPO_ROOT, 'test', 'e2e', 'scripts', 'live-world.sh');
const MODULE = path.join(REPO_ROOT, 'test', 'e2e', 'support', 'world-stamp.js');

const results = [];
const add = (id, ok, detail) => results.push({ id, ok, detail });
function say (line) { process.stdout.write(line + '\n'); }

// ---- STRUCTURE ---------------------------------------------------------------------------------

// Continuation-joined, the way live-world-banner-check.js joins them: the `write` invocation is split
// across two lines with a trailing backslash, and asking "which arguments went to THIS call" without
// joining would mean guessing a line window.
function logicalLines (text) {
  const out = [];
  let buffer = null;
  text.split('\n').forEach(raw => {
    const line = raw.replace(/\s+$/, '');
    const continues = /\\$/.test(line);
    const piece = continues ? line.replace(/\\+$/, '') : line;
    buffer = buffer === null ? piece : buffer + ' ' + piece;
    if (!continues) { out.push(buffer); buffer = null; }
  });
  if (buffer !== null) { out.push(buffer); }
  return out;
}

const scriptText = fs.readFileSync(SCRIPT, 'utf8');
const joined = logicalLines(scriptText);
const code = joined.filter(line => !/^\s*#/.test(line));

// The `write` call: the one that is not a comment and not the usage text.
const writeCall = code.find(line => /world-stamp\.js["']?\s+\\?\s*write\s/.test(line) || /world-stamp\.js"?\s.*\bwrite\s+"\$API_BASE"/.test(line));
add('S0', !!writeCall, writeCall ? 'found the write invocation' : 'NO `world-stamp.js write` invocation in ' + path.basename(SCRIPT));

let args = [];
if (writeCall) {
  const after = writeCall.slice(writeCall.indexOf('write ') + 'write '.length);
  const tokens = (after.match(/"[^"]*"|\S+/g) || []);
  // Arguments stop at the first redirection or the closing of the command substitution the call sits
  // in; without that the shell's own `2>&1)"` and `then` are counted as arguments to `write`.
  const end = tokens.findIndex(t => /^[0-9]*[<>]/.test(t) || /\)/.test(t) || t === '|' || t === ';');
  args = (end === -1 ? tokens : tokens.slice(0, end)).map(a => a.replace(/^"|"$/g, ''));
}
// write <apiBaseUrl> <apiRepo> <launchedPid> <builtFrom> [writtenBy]
add('S1', args.length >= 4,
  'write is handed ' + args.length + ' argument(s): ' + args.join(' | ') + (args.length >= 4 ? '' : ' — the CLI needs at least four'));

const launchedArg = args[2] || '';
const builtArg = args[3] || '';

// The pid argument must be the variable the script assigned from `$!`. Anything else and the stamp is
// being told the wrong process started this world.
const dollarBang = /^([A-Z_][A-Z0-9_]*)=\$!\s*$/m.exec(scriptText);
const pidVar = dollarBang ? dollarBang[1] : null;
add('S2', !!pidVar && launchedArg === '$' + pidVar,
  pidVar
    ? 'launchedPid is ' + (launchedArg || '<missing>') + ' and `$!` was captured into $' + pidVar
    : 'nothing in the script captures `$!`, so no pid can be the one it started');

// The build token must come from a variable assigned by `world-stamp.js built` — one implementation of
// "which build", not a second one spelled out in shell that could drift from it.
const builtAssign = /^([A-Z_][A-Z0-9_]*)="\$\(node[^\n]*world-stamp\.js"?\s+built\s/m.exec(scriptText);
const builtVar = builtAssign ? builtAssign[1] : null;
const builtArgName = /^\$\{?([A-Z_][A-Z0-9_]*)/.exec(builtArg);
add('S3', !!builtVar && !!builtArgName && builtArgName[1] === builtVar,
  builtVar
    ? 'builtFrom is ' + (builtArg || '<missing>') + ' and $' + builtVar + ' comes from `world-stamp.js built`'
    : 'no variable is assigned from `world-stamp.js built`, so the token is not read from the one implementation of it');

// …and it must be read AFTER the binary exists. Read before the build and it names a tree that may
// have been replaced by the time `dotnet build` ran, which is the very window the token exists to close.
const buildLine = scriptText.split('\n').findIndex(l => /dotnet build\s/.test(l));
const tokenLine = scriptText.split('\n').findIndex(l => builtVar && new RegExp('^' + builtVar + '="\\$\\(node').test(l));
add('S4', buildLine >= 0 && tokenLine > buildLine,
  buildLine < 0 ? 'no `dotnet build` line to order against'
    : 'the token is read on line ' + (tokenLine + 1) + ', after `dotnet build` on line ' + (buildLine + 1));

// And the head is checked for movement ACROSS the build, which is the half no stamp-time check can do.
add('S5', /rev-parse HEAD/.test(scriptText) && /moved WHILE it was being built/.test(scriptText),
  'the script refuses a build whose commit moved while it was running');

// ---- BEHAVIOUR: THE TWO WINDOWS, AGAINST THE REAL CLI ------------------------------------------

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lws-wiring-'));
// A copy at the SAME DEPTH it lives at in a checkout: world-stamp.js derives its repo root from its
// own `__dirname` three levels up, so a copy dropped anywhere else writes its stamps three levels
// above wherever it landed — outside this temp root, into somebody's directory. Depth is not cosmetic
// here, it is where the file goes.
const harness = path.join(root, 'harness');
const supportDir = path.join(harness, 'test', 'e2e', 'support');
fs.mkdirSync(supportDir, { recursive: true });
const cli = path.join(supportDir, 'world-stamp.js');
fs.copyFileSync(MODULE, cli);

function git (repo, ...argv) {
  return execFileSync('git', argv, {
    cwd: repo,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    env: Object.assign({}, process.env, {
      GIT_AUTHOR_NAME: 'wiring', GIT_AUTHOR_EMAIL: 'wiring@example.invalid',
      GIT_COMMITTER_NAME: 'wiring', GIT_COMMITTER_EMAIL: 'wiring@example.invalid'
    })
  }).trim();
}

function makeCheckout (name) {
  const repo = path.join(root, name);
  fs.mkdirSync(repo, { recursive: true });
  git(repo, 'init', '-q', '-b', 'main');
  fs.writeFileSync(path.join(repo, 'Program.cs'), '// ' + name + '\n');
  git(repo, 'add', 'Program.cs');
  git(repo, 'commit', '-q', '-m', 'the build', '--no-gpg-sign');
  return repo;
}

function cliRun (...argv) {
  const ran = spawnSync(process.execPath, [cli, ...argv], { encoding: 'utf8', timeout: 60000 });
  return { code: ran.status, out: String(ran.stdout || '').trim(), err: String(ran.stderr || '').trim() };
}

function stampFileFor (port) {
  return path.join(harness, 'artifacts', 'world', 'live', '127-0-0-1-' + port + '.json');
}

async function main () {
  const repo = makeCheckout('okamapi');
  const built = cliRun('built', repo);
  add('B0', built.code === 0 && /^[0-9a-f]{40}$/.test(built.out), '`built` printed ' + (built.out || built.err));

  // THE LAUNCH SHAPE `nohup dotnet run` PRODUCES: a launcher process whose CHILD holds the socket.
  // `& wait` rather than a bare command, because bash exec-optimises `bash -c 'node x'` into one
  // process and there would then be no launcher/child distinction left to prove anything about.
  const listener = path.join(root, 'listener.js');
  fs.writeFileSync(listener,
    "const s = require('http').createServer((q, r) => r.end('ok'));\n" +
    "s.listen(0, '127.0.0.1', () => process.stdout.write('port ' + s.address().port + '\\n'));\n");

  const launcher = spawn('bash', ['-c', 'node "$0" & wait', listener], { stdio: ['ignore', 'pipe', 'ignore'] });
  const port = await new Promise((resolve, reject) => {
    let seen = '';
    const giveUp = setTimeout(() => reject(new Error('the launcher never announced a port')), 20000);
    launcher.stdout.on('data', chunk => {
      seen += String(chunk);
      const match = /port (\d+)/.exec(seen);
      if (match) { clearTimeout(giveUp); resolve(Number(match[1])); }
    });
    launcher.on('error', error => { clearTimeout(giveUp); reject(error); });
  });
  const origin = 'http://127.0.0.1:' + port;
  const holder = Number(spawnSync('lsof', ['-nP', '-iTCP:' + port, '-sTCP:LISTEN', '-t'], { encoding: 'utf8' }).stdout.trim().split('\n')[0]);

  add('B1', holder !== launcher.pid,
    'the launcher (pid ' + launcher.pid + ') is not the process on :' + port + ' (pid ' + holder + ') — the shape `$!` gets wrong');

  // W2 — the CLI is handed the LAUNCHER, exactly as live-world.sh hands it `$API_PID`.
  const wrote = cliRun('write', origin, repo, String(launcher.pid), built.out, 'test/e2e/scripts/live-world.sh');
  let stamped = null;
  try { stamped = JSON.parse(fs.readFileSync(stampFileFor(port), 'utf8')); } catch (e) { /* reported below */ }
  add('B2', wrote.code === 0 && !!stamped && stamped.pid === holder && stamped.launchedPid === launcher.pid,
    stamped
      ? 'the stamp records pid ' + stamped.pid + ' (the socket holder), launched by ' + stamped.launchedPid
      : 'no stamp was written: ' + (wrote.err || wrote.out));

  // W1 — the head moves under the running world, and the same command is issued again.
  fs.writeFileSync(path.join(repo, 'Program.cs'), '// somebody rebased this worktree\n');
  git(repo, 'add', 'Program.cs');
  git(repo, 'commit', '-q', '-m', 'a commit this binary was never built from', '--no-gpg-sign');
  const moved = git(repo, 'rev-parse', 'HEAD');

  fs.rmSync(stampFileFor(port), { force: true });
  const afterMove = cliRun('write', origin, repo, String(launcher.pid), built.out, 'test/e2e/scripts/live-world.sh');
  add('B3', afterMove.code !== 0 && /moved since the build/.test(afterMove.err) && !fs.existsSync(stampFileFor(port)),
    afterMove.code !== 0
      ? 'refused, and wrote nothing: ' + afterMove.err.split('\n')[0]
      : 'IT STAMPED ANYWAY: ' + afterMove.out);
  add('B4', !afterMove.out.includes(moved),
    'the refusal never names ' + moved.slice(0, 7) + ', the commit the binary was not built from');

  // …and the world is still stampable at the build it really is, so B3 is a refusal and not a breakage.
  const rebuilt = cliRun('built', repo);
  const afterRebuild = cliRun('write', origin, repo, String(launcher.pid), rebuilt.out, 'test/e2e/scripts/live-world.sh');
  add('B5', afterRebuild.code === 0 && afterRebuild.out.includes(moved),
    afterRebuild.code === 0 ? 'a world rebuilt at ' + moved.slice(0, 7) + ' stamps normally' : afterRebuild.err);

  launcher.kill('SIGKILL');
  try { process.kill(holder, 'SIGKILL'); } catch (e) { /* already gone with its launcher */ }
}

main()
  .catch(error => { add('B!', false, 'the behaviour half could not run: ' + ((error && error.message) || error)); })
  .then(() => {
    fs.rmSync(root, { recursive: true, force: true });
    say('live-world stamp wiring check');
    say('  script : ' + SCRIPT);
    say('  module : ' + MODULE + '\n');
    results.forEach(r => say('  ' + (r.ok ? 'PASS' : 'FAIL') + '  ' + r.id + '  ' + r.detail));
    const bad = results.filter(r => !r.ok).length;
    say('');
    if (bad) {
      say(bad + ' of ' + results.length + ' — live-world.sh and world-stamp.js no longer agree, or a window is open.');
      process.exit(1);
    }
    say('OK ' + results.length + '/' + results.length + ' — the script hands over both guards, and both refuse when opened.');
  });
