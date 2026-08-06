// KILL-PROOF for test/kitchen-and-board-resume-after-login.test.js
//
// The exit criterion for this lane is "a test that reds when either starter is skipped". A test that
// merely passes over a fix proves nothing — this repository has shipped nineteen assertion shapes
// that could not fail — so this script deletes each starter from the recovery path, one at a time,
// and records whether the suite noticed. A mutation the suite does not notice is a hole in the test,
// not a success.
//
// Arm 0 is the unmutated control and must be GREEN. Every other arm must be RED.
//
// Named `.probe.js`, not `.spec.js` or `.test.js`, on purpose: jest's default `testMatch` collects
// `*.test.js` and `*.spec.js` anywhere under the root, and `lanes/` is not reliably excluded on
// every branch this runs from. Nothing here should ever be collected as a test — it RUNS jest.
//
// It edits two files in the shared checkout for roughly a second per arm and restores them from
// pristine copies taken before the first arm. The restore runs from `finally` and from SIGINT /
// SIGTERM / uncaughtException, so an interrupted run does not leave a page mutated for whoever is
// working in this checkout next. No server, no container, no git command that writes.

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const LANE_DIR = __dirname;
const ROOT = path.resolve(LANE_DIR, '..', '..');
const KITCHEN = path.join(ROOT, 'pages', 'admin', 'kitchen.vue');
const ONGOING = path.join(ROOT, 'pages', 'admin', 'ongoing.vue');
const SUITE = 'test/kitchen-and-board-resume-after-login.test.js';

const pristine = new Map([[KITCHEN, fs.readFileSync(KITCHEN, 'utf8')], [ONGOING, fs.readFileSync(ONGOING, 'utf8')]]);

function restore () {
  for (const [file, content] of pristine) {
    if (fs.readFileSync(file, 'utf8') !== content) { fs.writeFileSync(file, content); }
  }
}
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(signal, () => { restore(); process.exit(130); });
}
process.on('uncaughtException', (error) => { restore(); console.error(error); process.exit(1); });

// Each arm names ONE thing the recovery path does and removes it. `find` must appear exactly once in
// the file, so a rename upstream fails the arm loudly instead of silently mutating nothing and
// reporting a green that means "the deletion never happened".
const ARMS = [
  {
    name: '0 control — nothing mutated',
    expect: 'green',
    file: null
  },
  {
    name: '1 kitchen: the per-second clock is not started',
    expect: 'red',
    file: KITCHEN,
    find: '      this.startClock()\n',
    replace: ''
  },
  {
    name: '2 kitchen: the fullscreen listener is not attached',
    expect: 'red',
    file: KITCHEN,
    find: "      document.addEventListener('fullscreenchange', this.onFullscreenChange)\n",
    replace: ''
  },
  {
    name: '3 kitchen: the board poll is not started',
    expect: 'red',
    file: KITCHEN,
    find: '      this.startAutoRefresh()\n      this.startClock()',
    replace: '      this.startClock()'
  },
  {
    name: '4 kitchen: the sign-in handler goes back to its own partial copy of the list (the defect verbatim)',
    expect: 'red',
    file: KITCHEN,
    find: '        this.startLiveBoard()\n',
    replace: '        this.isLoading = true\n        this.refresh()\n        this.startAutoRefresh()\n'
  },
  {
    name: '5 kitchen: the clock is started without clearing the previous one',
    expect: 'red',
    file: KITCHEN,
    find: '    startClock () {\n      this.stopClock()\n',
    replace: '    startClock () {\n'
  },
  {
    name: '6 ongoing: the 7s poll is not started',
    expect: 'red',
    file: ONGOING,
    find: '      this.startAutoRefresh();\n    },\n    stopLiveBoard',
    replace: '    },\n    stopLiveBoard'
  },
  {
    name: '7 ongoing: adminStores is left empty, so transfer has nowhere to send an order',
    expect: 'red',
    file: ONGOING,
    find: '      this.adminStores = (this.$store.state.currentUser && this.$store.state.currentUser.adminIn) || [];\n',
    replace: ''
  },
  {
    name: '8 ongoing: the sign-in handler goes back to loadOrders() alone (the defect verbatim)',
    expect: 'red',
    file: ONGOING,
    find: '        this.startLiveBoard();\n',
    replace: '        this.loadOrders();\n'
  },
  {
    name: '9 ongoing: the poll is started without clearing the previous one',
    expect: 'red',
    file: ONGOING,
    find: '    startAutoRefresh () {\n      this.stopAutoRefresh();\n',
    replace: '    startAutoRefresh () {\n'
  }
];

function runSuite () {
  const result = spawnSync('npx', ['jest', SUITE, '--coverage=false'], { cwd: ROOT, encoding: 'utf8' });
  return { code: result.status, output: (result.stdout || '') + (result.stderr || '') };
}

// The test names the arm turned red, so a reader can see WHICH assertion caught WHICH deletion
// rather than only that the count went down.
function failedTests (output) {
  return output.split('\n').filter(line => line.includes('✕')).map(line => line.trim().replace(/\s*\(\d+ ms\)$/, ''));
}

const lines = [];
function say (text) { lines.push(text); console.log(text); }

let verdict = 0;
try {
  say('KILL-PROOF  ' + SUITE);
  say('root        ' + ROOT);
  say('');

  for (const arm of ARMS) {
    if (arm.file) {
      const before = pristine.get(arm.file);
      const occurrences = before.split(arm.find).length - 1;
      if (occurrences !== 1) {
        say('ARM ' + arm.name);
        say('  ABORT: the anchor appears ' + occurrences + ' times in ' + path.basename(arm.file) + ', expected exactly 1');
        verdict = 1;
        continue;
      }
      fs.writeFileSync(arm.file, before.replace(arm.find, arm.replace));
    }

    const { code, output } = runSuite();
    const got = code === 0 ? 'green' : 'red';
    const ok = got === arm.expect;
    if (!ok) { verdict = 1; }

    say('ARM ' + arm.name);
    say('  expected ' + arm.expect + ', got ' + got + '  ' + (ok ? 'OK' : '<<<< THE SUITE DID NOT NOTICE'));
    for (const name of failedTests(output)) { say('    red: ' + name); }
    say('');

    restore();
  }

  say(verdict === 0
    ? 'VERDICT: every starter in the recovery path is load-bearing — deleting any one of them reds the suite'
    : 'VERDICT: INCONCLUSIVE — at least one deletion passed unnoticed');
} finally {
  restore();
  fs.writeFileSync(path.join(LANE_DIR, 'kill-proof.txt'), lines.join('\n') + '\n');
}

process.exit(verdict);
