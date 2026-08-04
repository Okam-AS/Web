// THE PROVENANCE OF A JOURNEY ARTIFACT.
//
// Every test in this file ATTEMPTS THE DISPLACEMENT. A test that asserts a fixture run and a live run
// write different filenames proves nothing about the defect this store exists for — the defect was
// that a weaker run took the strongest run's NAME, so each test here stands a strong record in the
// canonical slot, runs the weak one at it, and reads back what a reader would find. Delete the
// comparison in `canTakeCanonical` and these go red; that mutation was run.
//
// The three defects these cover, all observed on feature/restaurant-modules on 2026-08-02:
//   1. a fixture re-run of a `@live` journey overwrote the live pass at the shared canonical path;
//   2. an interrupted run wrote nothing, leaving its predecessor's pass reading as its own result;
//   3. `/health` answers "Healthy" for any API, so a stale world was indistinguishable from the current one.

const fs = require('fs');
const os = require('os');
const net = require('net');
const http = require('http');
const path = require('path');
const { execFileSync } = require('child_process');

const store = require('./e2e/support/artifact-store');

let dir;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'journey-artifacts-'));
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

const JOURNEY = 'workforce-flag-lever';

/** The shape `JourneyRecorder.toJSON` produces, trimmed to the fields the store rules on. */
function record (overrides) {
  return Object.assign({
    journey: JOURNEY,
    title: 'A manager is stopped by the module switch',
    status: 'passed',
    backend: 'live',
    apiBaseUrl: 'http://127.0.0.1:5961',
    commit: 'ddc27fa181e6fd557b8796b6e08b4db21c17827a',
    backendServed: 80,
    backendBuild: { id: 'OkamAPI@aaaaaaabbbbbbbcccccccddddddd0000000eeee', source: 'env:E2E_API_BUILD', short: 'aaaaaaa', detail: null },
    steps: []
  }, overrides);
}

const FIXTURE_RUN = { backend: 'fixture', apiBaseUrl: 'http://127.0.0.1:4010', backendServed: 45, backendBuild: null };

function canonical () {
  const file = path.join(dir, JOURNEY + '.playwright.json');
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
}

function ledger () {
  const file = path.join(dir, store.RUNS_DIRNAME, store.LEDGER_NAME);
  if (!fs.existsSync(file)) { return []; }
  return fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
}

describe('the canonical slot', () => {
  it('is not taken from a live pass by a fixture re-run of the same journey', () => {
    store.writeRun(dir, record());
    expect(canonical().backend).toBe('live');

    const filed = store.writeRun(dir, record(FIXTURE_RUN));

    // What a reader joining on artifacts/journeys/<name>.playwright.json finds.
    expect(canonical().backend).toBe('live');
    expect(canonical().backendServed).toBe(80);
    // And the fixture run is not lost — it is filed, and its own record says who holds the slot.
    expect(filed.canonical).toBe(false);
    expect(filed.heldBy).toBe('live-5961-aaaaaaa');
    expect(JSON.parse(fs.readFileSync(filed.runFile, 'utf8')).backend).toBe('fixture');
  });

  it('is not taken from a live pass by a live run against a DIFFERENT build on the same port', () => {
    store.writeRun(dir, record());
    const other = { backendBuild: { id: 'OkamAPI@9999999', source: 'env:E2E_API_BUILD', short: '9999999', detail: null } };

    const filed = store.writeRun(dir, record(other));

    expect(canonical().backendBuild.short).toBe('aaaaaaa');
    expect(filed.canonical).toBe(false);
    // The port is identical; only the build differs. Without build identity these two are one file.
    expect(filed.runFile).not.toBe(path.join(dir, store.RUNS_DIRNAME, JOURNEY + '.live-5961-aaaaaaa.playwright.json'));
    expect(fs.readdirSync(path.join(dir, store.RUNS_DIRNAME)).filter(f => f.endsWith('.json'))).toHaveLength(2);
  });

  it('IS taken by a live pass standing over a fixture pass, because live outranks fixture', () => {
    store.writeRun(dir, record(FIXTURE_RUN));
    expect(canonical().backend).toBe('fixture');

    const filed = store.writeRun(dir, record());

    expect(filed.canonical).toBe(true);
    expect(canonical().backend).toBe('live');
  });

  it('IS taken by a live run that names its build from one that could not', () => {
    store.writeRun(dir, record({ backendBuild: null }));
    expect(canonical().backendBuild).toBeNull();

    const filed = store.writeRun(dir, record());

    expect(filed.canonical).toBe(true);
    expect(canonical().backendBuild.id).toContain('OkamAPI@');
  });

  it('is handed back by its own backend when that backend starts failing', () => {
    store.writeRun(dir, record());

    // Same key: the same world, re-run, now red. A store that only ever accepted better news would
    // report a world as passing long after it had stopped.
    const filed = store.writeRun(dir, record({ status: 'failed', error: 'publish was refused' }));

    expect(filed.canonical).toBe(true);
    expect(canonical().status).toBe('failed');
  });

  it('is not taken by a WEAKER run even when that run is the most recent', () => {
    store.writeRun(dir, record());
    store.writeRun(dir, record(Object.assign({}, FIXTURE_RUN, { status: 'failed' })));

    expect(canonical().status).toBe('passed');
    expect(canonical().backend).toBe('live');
  });

  it('is re-elected freely once the file is deleted — the documented way to hand it over', () => {
    store.writeRun(dir, record());
    fs.rmSync(path.join(dir, JOURNEY + '.playwright.json'));

    const filed = store.writeRun(dir, record(FIXTURE_RUN));

    expect(filed.canonical).toBe(true);
    expect(canonical().backend).toBe('fixture');
  });
});

// The same-lineage rule is the one hole left in "a weaker run cannot displace the evidence": a world
// that has started failing must be able to say so, and the provisional `running` record is the weakest
// there is. It landed in practice on 2026-08-03 — `growth-newsletter-send-gate` failed at the branch
// tip before reaching a newsletter route and replaced its own passing record at BOTH the canonical
// path and `runs/`, leaving a ledger summary as the only trace the green run had existed.
//
// The displacement stays. The LOSS is what these cover.
describe('the record a run replaces with a worse one of its own backend', () => {
  it('is kept whole, and the run that replaced it says where', () => {
    store.writeRun(dir, record({ backendServed: 80 }));

    const filed = store.writeRun(dir, record({ status: 'failed', backendServed: 0, error: 'the app shell never settled' }));

    // What a reader joining on the canonical path finds: the failure, as it must.
    expect(canonical().status).toBe('failed');
    // And, in that same file, that a stronger run of this same world exists and exactly where it is.
    expect(canonical().artifact.supersedes.status).toBe('passed');
    expect(canonical().artifact.supersedes.key).toBe('live-5961-aaaaaaa');

    const kept = JSON.parse(fs.readFileSync(filed.supersededFile, 'utf8'));
    expect(kept.status).toBe('passed');
    expect(kept.backendServed).toBe(80);
    // Whole, not a summary — the ledger already had the summary and it was not enough to read.
    expect(kept.title).toBe(record().title);
    expect(canonical().artifact.supersedes.file).toContain(JOURNEY + '.live-5961-aaaaaaa.superseded.playwright.json');
  });

  it('is not itself lost when the SAME backend then fails again, or is killed mid-run', () => {
    store.writeRun(dir, record({ backendServed: 80 }));
    store.writeRun(dir, record({ status: 'failed', backendServed: 0 }));
    const supersededFile = path.join(dir, store.RUNS_DIRNAME, JOURNEY + '.live-5961-aaaaaaa.superseded.playwright.json');

    // A second red, then a run that begins and never reports. Neither outranks the pass, so neither
    // may take its place in the kept file — otherwise three bad days erase the good one by attrition.
    store.writeRun(dir, record({ status: 'failed', backendServed: 0 }));
    store.beginRun(dir, record({ status: 'running', backendServed: 0 }));

    expect(JSON.parse(fs.readFileSync(supersededFile, 'utf8')).status).toBe('passed');
    expect(JSON.parse(fs.readFileSync(supersededFile, 'utf8')).backendServed).toBe(80);
    expect(canonical().status).toBe('running');
  });

  it('is NOT written when the replacement is not weaker — that is an ordinary re-run', () => {
    store.writeRun(dir, record());
    const filed = store.writeRun(dir, record({ backendServed: 96 }));

    expect(filed.supersededFile).toBeNull();
    expect(filed.record.artifact.supersedes).toBeNull();
    expect(fs.readdirSync(path.join(dir, store.RUNS_DIRNAME)).filter(f => f.includes('superseded'))).toHaveLength(0);
    expect(canonical().backendServed).toBe(96);
  });

  it('is NOT written for a loser, which was never overwritten in the first place', () => {
    store.writeRun(dir, record());
    const filed = store.writeRun(dir, record(Object.assign({}, FIXTURE_RUN, { status: 'failed' })));

    expect(filed.canonical).toBe(false);
    expect(filed.supersededFile).toBeNull();
    expect(fs.readdirSync(path.join(dir, store.RUNS_DIRNAME)).filter(f => f.includes('superseded'))).toHaveLength(0);
  });

  it('names the kept file in the ledger too, so the append-only history points at it', () => {
    store.writeRun(dir, record());
    store.writeRun(dir, record({ status: 'failed' }));

    const lines = ledger();
    expect(lines[0].supersedes).toBeNull();
    expect(lines[1].supersedes).toContain(JOURNEY + '.live-5961-aaaaaaa.superseded.playwright.json');
  });
});

describe('a run that never finishes', () => {
  it('leaves its own backend visibly unfinished rather than its predecessor passing', () => {
    store.writeRun(dir, record());
    expect(canonical().status).toBe('passed');

    // The whole of an interrupted run: it began, and nothing else. No teardown, no final write.
    store.beginRun(dir, record({ status: 'running', backendServed: 0 }));

    expect(canonical().status).toBe('running');
    expect(canonical().artifact.provisional).toBe(true);
    expect(canonical().backendServed).toBe(0);
  });

  it('cannot take the canonical slot from another backend merely by starting', () => {
    store.writeRun(dir, record());

    const began = store.beginRun(dir, record(FIXTURE_RUN));

    expect(began.canonical).toBe(false);
    expect(canonical().backend).toBe('live');
    expect(canonical().status).toBe('passed');
    // It is still on disk under its own key, so a reader can see that a fixture run was started here.
    expect(JSON.parse(fs.readFileSync(began.runFile, 'utf8')).status).toBe('running');
  });

  it('is replaced by its own final record when it does finish', () => {
    store.beginRun(dir, record({ status: 'running' }));
    store.writeRun(dir, record());

    expect(canonical().status).toBe('passed');
    expect(canonical().artifact.provisional).toBe(false);
  });
});

describe('the ledger', () => {
  it('keeps every run, including the ones that lost the slot and the one that never finished', () => {
    store.writeRun(dir, record());
    store.beginRun(dir, record(FIXTURE_RUN));
    store.writeRun(dir, record(FIXTURE_RUN));

    const lines = ledger();
    expect(lines).toHaveLength(3);
    expect(lines.map(l => l.canonical)).toEqual([true, false, false]);
    expect(lines.map(l => l.provisional)).toEqual([false, true, false]);
    expect(lines[0].build).toContain('OkamAPI@');
    expect(lines[2].buildSource).toBe('unknown');
  });
});

describe('backend identity', () => {
  it('takes the build a world script declared, over anything it could infer', () => {
    const build = store.resolveBackendBuild({
      E2E_API_BUILD: 'OkamAPI@ddc27fa181e6fd557b8796b6e08b4db21c17827a',
      OKAM_API_REPO: path.resolve(__dirname, '..')
    });

    expect(build.source).toBe('env:E2E_API_BUILD');
    expect(build.short).toBe('ddc27fa');
  });

  it('asks the named checkout for its own HEAD when nothing declared one', () => {
    const build = store.resolveBackendBuild({ OKAM_API_REPO: path.resolve(__dirname, '..') });

    expect(build.source).toMatch(/^git:/);
    expect(build.id).toMatch(/@[0-9a-f]{40}(\+dirty)?$/);
    expect(build.short).toMatch(/^[0-9a-f]{7}(-dirty)?$/);
  });

  // The source that needs nobody's cooperation, and the one that carries this estate: `live-world.sh`
  // exports nothing about the tree it built, and the run command it prints does not carry OKAM_API_REPO
  // into the runner's shell. Proven against a real listening process rather than a mocked `lsof` —
  // a mock here would only assert that the parser parses what the mock was told to say.
  it('asks whoever is holding the port what directory they are running from', async () => {
    const server = http.createServer((_req, res) => res.end('ok'));
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    try {
      // This jest process runs from this repo, so that is the checkout it should be found to be in.
      const build = store.resolveBackendBuild({}, 'http://127.0.0.1:' + port);

      expect(build).not.toBeNull();
      expect(build.source).toBe('process:127.0.0.1:' + port);
      expect(build.id).toMatch(/^Web-modules@[0-9a-f]{40}(\+dirty)?$/);
      // The checkout's name identifies it; its absolute path is the laptop's business and stays out of
      // a file that gets pasted into reviews.
      expect(JSON.stringify(build)).not.toContain(path.resolve(__dirname, '..'));
    } finally {
      await new Promise(resolve => server.close(resolve));
    }
  });

  it('does not inspect a process it has no business inspecting, nor a port nobody holds', async () => {
    // A remote origin's local port holder is a different machine's business, and answering about THIS
    // machine would be a confident lie rather than a missing answer.
    expect(store.buildFromListeningProcess('https://api.okam.no/')).toBeNull();
    expect(store.buildFromListeningProcess('not a url')).toBeNull();

    const free = await new Promise((resolve) => {
      const probe = net.createServer();
      probe.listen(0, '127.0.0.1', () => {
        const p = probe.address().port;
        probe.close(() => resolve(p));
      });
    });
    expect(store.buildFromListeningProcess('http://127.0.0.1:' + free)).toBeNull();
  });

  it('is null rather than guessed when nothing can say — and null is not this repo\'s commit', () => {
    expect(store.resolveBackendBuild({})).toBeNull();
    expect(store.resolveBackendBuild({ OKAM_API_REPO: '/no/such/checkout' })).toBeNull();
  });

  it('keys a live backend by origin AND build, so one port cannot hold two builds at one name', () => {
    const one = store.backendKeyFor({ backend: 'live', apiBaseUrl: 'http://127.0.0.1:5951', build: { short: 'ddc27fa' } });
    const two = store.backendKeyFor({ backend: 'live', apiBaseUrl: 'http://127.0.0.1:5951', build: { short: '174a550' } });
    const none = store.backendKeyFor({ backend: 'live', apiBaseUrl: 'http://127.0.0.1:5951', build: null });

    expect(one).toBe('live-5951-ddc27fa');
    expect(two).toBe('live-5951-174a550');
    expect(none).toBe('live-5951-unidentified');
    // The fixture is one world whatever this repo's commit is; keying it per commit would file a
    // record per commit for no reader's benefit.
    expect(store.backendKeyFor({ backend: 'fixture', apiBaseUrl: 'http://127.0.0.1:4010', build: null })).toBe('fixture');
  });

  // The fixture used to answer this question with `null`, deliberately, so that a fixture run could not
  // put the FRONTEND's commit in a field a reader takes for the API's. The danger was real and silence
  // was the wrong remedy: it left nineteen of the twenty-two artifacts standing on this branch with no
  // answer at all, so "does this artifact say which build answered it?" was unreadable for most of the
  // evidence. The remedy is the NAME.
  it('lets the fixture answer for itself, under a name no reader can mistake for an API build', () => {
    const build = store.fixtureBuild(path.resolve(__dirname, '..'));

    expect(build.id).toMatch(/^fixture@[0-9a-f]{40}(\+dirty)?$/);
    expect(build.id).not.toContain('Web-modules@');
    expect(build.source).toBe('fixture:test/e2e/fixture/api-server.js');
    expect(build.detail).toContain('not an API build');
    // The same null every other source returns when it cannot say, rather than an invented id.
    expect(store.fixtureBuild('/no/such/checkout')).toBeNull();
  });

  it('does not let a fixture run outrank a live one just because it can now name its build', () => {
    const named = { id: 'fixture@' + 'b'.repeat(40), source: 'fixture:test/e2e/fixture/api-server.js', short: 'bbbbbbb', detail: null };
    store.writeRun(dir, record());

    const filed = store.writeRun(dir, record(Object.assign({}, FIXTURE_RUN, { backendBuild: named })));

    expect(canonical().backend).toBe('live');
    expect(filed.canonical).toBe(false);
    // And it is still ONE fixture file, not one per frontend commit.
    expect(store.backendKeyFor({ backend: 'fixture', apiBaseUrl: 'http://127.0.0.1:4010', build: named })).toBe('fixture');
  });

  it('keeps `+dirty` in the key, so a modified tree cannot overwrite the clean commit it sits on', () => {
    const clean = 'OkamAPI@' + 'c'.repeat(40);

    expect(store.shortOfBuild(clean)).toBe('ccccccc');
    expect(store.shortOfBuild(clean + '+dirty')).toBe('ccccccc-dirty');
    // The two routes to the same answer must agree: `live-world.sh` declares `<repo>@<head>+dirty`
    // through E2E_API_BUILD, and `buildFromCheckout` derives the same tree as `<head>-dirty`. Before
    // this they keyed differently, and a clean and a dirty build keyed IDENTICALLY.
    expect(store.backendKeyFor({ backend: 'live', apiBaseUrl: 'http://127.0.0.1:5951', build: store.resolveBackendBuild({ E2E_API_BUILD: clean + '+dirty' }) }))
      .toBe('live-5951-ccccccc-dirty');
    expect(store.backendKeyFor({ backend: 'live', apiBaseUrl: 'http://127.0.0.1:5951', build: store.resolveBackendBuild({ E2E_API_BUILD: clean }) }))
      .toBe('live-5951-ccccccc');
  });

  // ---- THE WORLD STAMP -------------------------------------------------------------------------
  //
  // Every test below is written so that the WRONG answer is available and nameable. That is the whole
  // discipline of this block: a stamp is only worth having if the run would otherwise have said
  // something else, so each arm stands a real listening process (whose checkout is THIS repo) against
  // a stamp naming a different real checkout, and reads which one came back. An assertion that the
  // field is merely populated would pass against a store that resolved everything to `Web-modules`.
  describe('the world stamp', () => {
    // Real checkouts, not fixtures of one: `writeStamp` asks git for the HEAD and whether the tree is
    // dirty, and a stubbed git would only prove that the stub was read.
    function checkout (name) {
      const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'world-' + name + '-'));
      const run = (...args) => execFileSync('git', args, {
        cwd: repo,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
        env: Object.assign({}, process.env, {
          GIT_AUTHOR_NAME: 'lane',
          GIT_AUTHOR_EMAIL: 'lane@example.invalid',
          GIT_COMMITTER_NAME: 'lane',
          GIT_COMMITTER_EMAIL: 'lane@example.invalid'
        })
      });
      run('init', '-q', '-b', 'main');
      fs.writeFileSync(path.join(repo, 'Program.cs'), '// ' + name + '\n');
      run('add', 'Program.cs');
      run('commit', '-q', '-m', 'the build ' + name + ' was made from', '--no-gpg-sign');
      return { repo, name: path.basename(repo), head: run('rev-parse', 'HEAD').trim() };
    }

    let stamps;
    let listener;
    let origin;
    const made = [];

    beforeEach(async () => {
      stamps = fs.mkdtempSync(path.join(os.tmpdir(), 'world-stamps-'));
      // A REAL process on a REAL port, so that "the port would have said something else" is a fact
      // about this machine and not a mock's opinion. It is this jest process, whose cwd is this
      // checkout — so the port's answer is `Web-modules@…` and a stamp's answer must not be.
      listener = http.createServer((_req, res) => res.end('ok'));
      await new Promise(resolve => listener.listen(0, '127.0.0.1', resolve));
      origin = 'http://127.0.0.1:' + listener.address().port;
    });

    afterEach(async () => {
      await new Promise(resolve => listener.close(resolve));
      fs.rmSync(stamps, { recursive: true, force: true });
      while (made.length) { fs.rmSync(made.pop(), { recursive: true, force: true }); }
    });

    function stamp (from, overrides) {
      made.push(from.repo);
      const written = store.writeWorldStamp({ apiBaseUrl: origin, repo: from.repo, pid: process.pid }, stamps);
      if (overrides) {
        fs.writeFileSync(written.file, JSON.stringify(Object.assign(written.stamp, overrides), null, 2) + '\n');
      }
      return written;
    }

    it('names the checkout the world script recorded, not the one holding the port', () => {
      const api = checkout('alpha');
      stamp(api);

      const build = store.resolveBackendBuild({}, origin, stamps);

      expect(build.id).toBe(api.name + '@' + api.head);
      expect(build.source).toBe('stamp:127-0-0-1-' + listener.address().port + '.json');
      expect(build.short).toBe(api.head.slice(0, 7));
      // Where a REAL run reads it from — the path live-world.sh's banner names and this test's
      // temporary directory stands in for. Pinned here because it is a contract with that script.
      expect(require('./e2e/support/world-stamp').fileFor('http://127.0.0.1:5951'))
        .toMatch(/\/artifacts\/world\/live\/127-0-0-1-5951\.json$/);
      // The stamp's directory is this laptop's business and stays out of a file read in reviews.
      expect(JSON.stringify(build)).not.toContain(stamps);
      // The answer the port would have given, and the one this run must NOT have taken: this process
      // is running out of the Web-modules checkout and holds that socket.
      expect(store.buildFromListeningProcess(origin).id).toMatch(/^Web-modules@/);
      expect(build.id).not.toMatch(/^Web-modules@/);
    });

    it('records a DIFFERENT build when a different checkout built the world', () => {
      const alpha = checkout('alpha');
      stamp(alpha);
      const first = store.resolveBackendBuild({}, origin, stamps);

      const beta = checkout('beta');
      stamp(beta);
      const second = store.resolveBackendBuild({}, origin, stamps);

      expect(first.id).toBe(alpha.name + '@' + alpha.head);
      expect(second.id).toBe(beta.name + '@' + beta.head);
      expect(second.id).not.toBe(first.id);
      // …and the two runs are filed apart, which is the point of putting the build in the key.
      expect(store.backendKeyFor({ backend: 'live', apiBaseUrl: origin, build: first }))
        .not.toBe(store.backendKeyFor({ backend: 'live', apiBaseUrl: origin, build: second }));
    });

    it('is refused when the world it describes is gone, and the run falls through to the port', () => {
      const api = checkout('alpha');
      // A pid that is not running. `writeStamp` refuses to record one, so this is the state a stamp
      // reaches by OUTLIVING its world — which is every stamp, eventually.
      const dead = stamp(api, { pid: 2147483646, processStartedAt: 'Mon Aug  4 02:31:07 2026' });

      const read = store.readWorldStamp(origin, stamps);
      expect(read.ok).toBe(false);
      expect(read.reason).toContain('the world it describes is gone');
      expect(store.buildFromWorldStamp(origin, stamps)).toBeNull();

      // Refused, not repaired and not believed anyway: the next source gets its turn.
      const build = store.resolveBackendBuild({}, origin, stamps);
      expect(build.source).toBe('process:127.0.0.1:' + listener.address().port);
      expect(fs.existsSync(dead.file)).toBe(true);
    });

    it('is refused when its pid has been reused by a process it did not stamp', () => {
      const api = checkout('alpha');
      // This pid IS alive — it is this test — but it started at a different time, which is exactly
      // what a recycled pid looks like. A stamp verified by pid alone would answer here.
      stamp(api, { processStartedAt: 'Mon Jan  1 00:00:00 2001' });

      const read = store.readWorldStamp(origin, stamps);
      expect(read.ok).toBe(false);
      expect(read.reason).toContain('is not the one that was stamped');
      expect(store.resolveBackendBuild({}, origin, stamps).source).toMatch(/^process:/);
    });

    it('is refused when it is about a different origin, however it got that filename', () => {
      const api = checkout('alpha');
      stamp(api, { origin: 'http://127.0.0.1:5951' });

      const read = store.readWorldStamp(origin, stamps);
      expect(read.ok).toBe(false);
      expect(read.reason).toContain('is about http://127.0.0.1:5951');
    });

    it('outranks a declared build that disagrees, and says in the artifact what it overrode', () => {
      const api = checkout('alpha');
      stamp(api);
      // The shape this ordering exists for: a run command copied from the world that was up an hour
      // ago. The declaration is checked against nothing; the stamp is checked against this origin and
      // against a process that is still running.
      const stale = 'OkamAPI@' + 'f'.repeat(40);

      const build = store.resolveBackendBuild({ E2E_API_BUILD: stale }, origin, stamps);

      expect(build.id).toBe(api.name + '@' + api.head);
      expect(build.source).toMatch(/^stamp:/);
      expect(build.detail).toContain('this overrode E2E_API_BUILD="' + stale + '"');
    });

    it('records that the declaration agreed, when it did', () => {
      const api = checkout('alpha');
      stamp(api);

      const build = store.resolveBackendBuild({ E2E_API_BUILD: api.name + '@' + api.head }, origin, stamps);

      expect(build.detail).toContain('agrees with E2E_API_BUILD');
      expect(build.detail).not.toContain('overrode');
    });

    it('leaves the declared build in charge when there is no stamp to prefer', () => {
      const declared = 'OkamAPI@' + 'd'.repeat(40);

      const build = store.resolveBackendBuild({ E2E_API_BUILD: declared }, origin, stamps);

      expect(build.source).toBe('env:E2E_API_BUILD');
      expect(build.id).toBe(declared);
    });

    it('is neither written nor read for an origin on another machine', () => {
      const api = checkout('alpha');
      made.push(api.repo);

      expect(() => store.writeWorldStamp({ apiBaseUrl: 'https://api.okam.no', repo: api.repo, pid: process.pid }, stamps))
        .toThrow(/loopback/);
      expect(store.buildFromWorldStamp('https://api.okam.no', stamps)).toBeNull();
      // A pid is a statement about THIS machine; a stamp asserting one about a remote world would be
      // the confident wrong answer this whole mechanism exists to refuse.
      expect(store.readWorldStamp('https://api.okam.no', stamps).reason).toBe('not a loopback origin');
    });

    it('refuses to stamp a world whose process is not running, rather than writing an unverifiable one', () => {
      const api = checkout('alpha');
      made.push(api.repo);

      expect(() => store.writeWorldStamp({ apiBaseUrl: origin, repo: api.repo, pid: 2147483646 }, stamps))
        .toThrow(/no process 2147483646 is running/);
      expect(() => store.writeWorldStamp({ apiBaseUrl: origin, repo: '/no/such/checkout', pid: process.pid }, stamps))
        .toThrow(/not a git checkout/);
      expect(fs.readdirSync(stamps)).toEqual([]);
    });

    it('records who wrote it, rather than claiming an authorship it does not have', () => {
      const api = checkout('alpha');
      made.push(api.repo);

      const byScript = store.writeWorldStamp(
        { apiBaseUrl: origin, repo: api.repo, pid: process.pid, writtenBy: 'test/e2e/scripts/live-world.sh' }, stamps);
      expect(byScript.stamp.writtenBy).toBe('test/e2e/scripts/live-world.sh');
      // It travels into the artifact, so a reader of a live artifact learns where the claim came from.
      expect(store.buildFromWorldStamp(origin, stamps).detail).toContain('stamped by test/e2e/scripts/live-world.sh');

      // …and a caller that does not say gets the program that actually ran. A constant here would put
      // that script's name on every stamp this repo's own harnesses write.
      const byNobody = store.writeWorldStamp({ apiBaseUrl: origin, repo: api.repo, pid: process.pid }, stamps);
      expect(byNobody.stamp.writtenBy).not.toBe('test/e2e/scripts/live-world.sh');
    });

    it('keys a stamped dirty tree the same way every other route keys it', () => {
      const api = checkout('alpha');
      made.push(api.repo);
      fs.writeFileSync(path.join(api.repo, 'Program.cs'), '// edited after the build\n');
      const written = store.writeWorldStamp({ apiBaseUrl: origin, repo: api.repo, pid: process.pid }, stamps);

      const build = store.buildFromWorldStamp(origin, stamps);

      expect(written.stamp.build.id).toBe(api.name + '@' + api.head + '+dirty');
      expect(build.short).toBe(api.head.slice(0, 7) + '-dirty');
      // The same tree declared through E2E_API_BUILD must produce the SAME key, or one build gets two
      // artifact files and neither reader can tell they are the same world.
      expect(store.shortOfBuild(build.id)).toBe(build.short);
    });
  });

  it('reads a legacy artifact — one written before builds were recorded — as unidentified, not as a match', () => {
    // Exactly the shape of the artifacts standing in artifacts/journeys/ before this change.
    const legacy = { backend: 'live', apiBaseUrl: 'http://127.0.0.1:5961', status: 'passed', commit: 'ddc27fa' };

    expect(store.keyOfRecord(legacy)).toBe('live-5961-unidentified');
    // …and a run that CAN name its build outranks it, so real live evidence can take the slot back.
    expect(store.compareRank(record(), legacy)).toBe(1);
  });
});
