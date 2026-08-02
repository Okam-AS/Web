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

  it('reads a legacy artifact — one written before builds were recorded — as unidentified, not as a match', () => {
    // Exactly the shape of the artifacts standing in artifacts/journeys/ before this change.
    const legacy = { backend: 'live', apiBaseUrl: 'http://127.0.0.1:5961', status: 'passed', commit: 'ddc27fa' };

    expect(store.keyOfRecord(legacy)).toBe('live-5961-unidentified');
    // …and a run that CAN name its build outranks it, so real live evidence can take the slot back.
    expect(store.compareRank(record(), legacy)).toBe(1);
  });
});
