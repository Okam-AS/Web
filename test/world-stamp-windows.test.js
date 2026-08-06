// THE TWO WINDOWS IN WHICH A WORLD STAMP COULD HAVE INVENTED A WRONG ANSWER.
//
// `test/e2e/support/world-stamp.js` rests on one claim: *it can lose its answer; it cannot invent a
// wrong one*. A review on 2026-08-04 walked that claim and found it held everywhere except two places,
// both in the `live-world.sh` wiring that nothing executes end to end:
//
//   W1  THE HEAD MOVES BETWEEN THE BUILD AND THE STAMP. The script builds, then stamps, and the writer
//       asked git for HEAD at STAMP time. A rebase or checkout in the API worktree in between — routine
//       on this estate, where worktrees are shared and heads move under running lanes — made the stamp
//       name a commit the running binary was not built from. Verified-alive, origin-matched, wrong.
//   W2  THE STAMPED PROCESS IS THE LAUNCHER. `$!` after `nohup dotnet run …` is the launcher; the child
//       it execs is what holds the socket. Liveness then proved "the launcher is alive", not "this
//       origin is served by this build" — so a dead server under a live launcher kept the stamp valid.
//
// ---- WHAT MAKES EACH TEST BELOW A PROOF RATHER THAN A DESCRIPTION -----------------------------
//
// A refusal is only worth asserting when the WRONG ANSWER WAS AVAILABLE AND NAMEABLE, so every arm
// here first shows what the removed guard would have produced:
//
//   * W1's arms move the checkout for real — a second commit, or an edit — and name the token the
//     writer would have recorded had it asked git at stamp time.
//   * W2's arms stand a REAL child process on a REAL socket, with this jest process as its launcher,
//     so "the launcher" and "the server" are two different live pids on this machine and not a mock's
//     opinion. The launcher-shaped stamp is then constructed by hand and shown to still VERIFY —
//     which is the defect, demonstrated, next to the guard that prevents it.
//
// ---- THE AFFORDANCE ITS OWN MUTATION PROOF USES -----------------------------------------------
//
// `WORLD_STAMP_MODULE` points these tests at a COPY of the module, so a mutation proof can delete a
// guard from a copy in a temp directory and watch this file red — without editing a file in a checkout
// other lanes are reading. Unset, it is the real module. The same affordance
// `live-world-banner-check.js` gives itself with `--script`.
//
//   WORLD_STAMP_MODULE=/tmp/mutant.js npx jest test/world-stamp-windows.test.js

const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn, execFileSync } = require('child_process');

const MODULE_UNDER_TEST = process.env.WORLD_STAMP_MODULE || './e2e/support/world-stamp';
const worldStamp = require(MODULE_UNDER_TEST);

// Real checkouts, real child processes and real `lsof` calls; none of it is fast, and a 5s default
// would make this file flaky for a reason that has nothing to do with what it asserts.
jest.setTimeout(60000);

describe('the world stamp cannot name a commit the binary was not built from', () => {
  let dir;
  const madeRepos = [];
  const madeChildren = [];

  // A REAL git checkout, because `buildTokenOf` asks git and a stubbed git would only prove the stub
  // was read. Returns the token as well as the sha: they differ the moment the tree is edited.
  function checkout (name) {
    const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'wsw-' + name + '-'));
    madeRepos.push(repo);
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
    return { repo, name: path.basename(repo), head: run('rev-parse', 'HEAD').trim(), run };
  }

  // A separate process that holds a socket. This is what makes W2 a fact about this machine: the
  // launcher (this jest process) and the server (the child) are two different live pids, exactly as
  // `dotnet run` and its `WebApi` child are.
  function spawnListener () {
    const child = spawn(process.execPath, ['-e',
      "const s = require('http').createServer((q, r) => r.end('ok'));" +
      "s.listen(0, '127.0.0.1', () => process.stdout.write('port ' + s.address().port + '\\n'));"
    ], { stdio: ['ignore', 'pipe', 'ignore'] });
    madeChildren.push(child);
    return new Promise((resolve, reject) => {
      let seen = '';
      const giveUp = setTimeout(() => reject(new Error('the listener child never announced a port')), 20000);
      child.on('error', error => { clearTimeout(giveUp); reject(error); });
      child.stdout.on('data', chunk => {
        seen += String(chunk);
        const match = /port (\d+)/.exec(seen);
        if (match) {
          clearTimeout(giveUp);
          resolve({ child, pid: child.pid, port: Number(match[1]), origin: 'http://127.0.0.1:' + match[1] });
        }
      });
    });
  }

  function stop (child) {
    return new Promise(resolve => {
      if (child.exitCode !== null || child.signalCode !== null) { return resolve(); }
      child.on('exit', () => resolve());
      child.kill('SIGKILL');
    });
  }

  // A process that is alive and has nothing to do with any socket — the "stranger's launcher".
  function spawnIdle () {
    const child = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 60000);'], { stdio: 'ignore' });
    madeChildren.push(child);
    return child;
  }

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wsw-stamps-'));
  });

  afterEach(async () => {
    while (madeChildren.length) { await stop(madeChildren.pop()); }
    fs.rmSync(dir, { recursive: true, force: true });
    while (madeRepos.length) { fs.rmSync(madeRepos.pop(), { recursive: true, force: true }); }
  });

  // ---- W1 --------------------------------------------------------------------------------------

  describe('W1 — the head moves between the build and the stamp', () => {
    it('refuses when the checkout has been rebased onto a different commit since the build', async () => {
      const api = checkout('alpha');
      const listener = await spawnListener();
      const builtFrom = worldStamp.buildTokenOf(api.repo);
      expect(builtFrom).toBe(api.head);

      // THE MOVE. This is the hazard, performed rather than described: a second commit lands in the
      // API worktree while the binary built from the first one is up and serving.
      fs.writeFileSync(path.join(api.repo, 'Program.cs'), '// somebody else rebased this worktree\n');
      api.run('add', 'Program.cs');
      api.run('commit', '-q', '-m', 'a commit this binary was never built from', '--no-gpg-sign');
      const moved = worldStamp.buildTokenOf(api.repo);

      // The wrong answer is available and nameable: a writer that asked git at stamp time would have
      // recorded THIS, and it is a real commit that really is this checkout's head.
      expect(moved).not.toBe(builtFrom);

      expect(() => worldStamp.writeStamp(
        { apiBaseUrl: listener.origin, repo: api.repo, launchedPid: process.pid, builtFrom }, dir))
        .toThrow(/moved since the build/);
      // Lost, not invented: nothing on disk, so the run falls through to a weaker source and may be
      // filed unidentified. That is the acceptable direction.
      expect(fs.readdirSync(dir)).toEqual([]);
      expect(worldStamp.buildFromWorldStamp(listener.origin, dir)).toBeNull();
    });

    it('refuses when the tree merely gained an edit after the build, because that is not the tree that was built', async () => {
      const api = checkout('alpha');
      const listener = await spawnListener();
      const builtFrom = worldStamp.buildTokenOf(api.repo);

      fs.writeFileSync(path.join(api.repo, 'Program.cs'), '// edited while the world was coming up\n');

      expect(worldStamp.buildTokenOf(api.repo)).toBe(api.head + '+dirty');
      expect(() => worldStamp.writeStamp(
        { apiBaseUrl: listener.origin, repo: api.repo, launchedPid: process.pid, builtFrom }, dir))
        .toThrow(/moved since the build/);
      expect(fs.readdirSync(dir)).toEqual([]);
    });

    it('will not stamp at all when nobody says which build it is stamping', async () => {
      const api = checkout('alpha');
      const listener = await spawnListener();

      // The guard cannot be switched off by a caller quietly dropping an argument — which is the only
      // way a guard that lives in the writer gets lost, since the wiring is what goes unexecuted.
      expect(() => worldStamp.writeStamp(
        { apiBaseUrl: listener.origin, repo: api.repo, launchedPid: process.pid }, dir))
        .toThrow(/must name the build it is stamping/);
      expect(fs.readdirSync(dir)).toEqual([]);
    });

    it('stamps the build it was told about, so the refusals above are not a stamp that never works', async () => {
      const api = checkout('alpha');
      const listener = await spawnListener();
      const builtFrom = worldStamp.buildTokenOf(api.repo);

      const written = worldStamp.writeStamp(
        { apiBaseUrl: listener.origin, repo: api.repo, launchedPid: process.pid, builtFrom }, dir);

      expect(written.stamp.build.builtFrom).toBe(builtFrom);
      expect(written.stamp.build.id).toBe(api.name + '@' + api.head);
      expect(worldStamp.readStamp(listener.origin, dir).ok).toBe(true);
      // Written by rename, so no half-file and no leftovers beside it.
      expect(fs.readdirSync(dir)).toEqual([path.basename(written.file)]);
    });
  });

  // ---- W2 --------------------------------------------------------------------------------------

  describe('W2 — the launcher is not the process holding the socket', () => {
    it('records the process serving the port, not the launcher that started it', async () => {
      const api = checkout('alpha');
      const listener = await spawnListener();

      const written = worldStamp.writeStamp({
        apiBaseUrl: listener.origin,
        repo: api.repo,
        launchedPid: process.pid,            // what `live-world.sh` has in `$!`
        builtFrom: worldStamp.buildTokenOf(api.repo)
      }, dir);

      // The two pids are genuinely different live processes on this machine, and the stamp took the
      // one on the socket. `$!` would have given the other.
      expect(written.stamp.pid).toBe(listener.pid);
      expect(written.stamp.pid).not.toBe(process.pid);
      expect(written.stamp.launchedPid).toBe(process.pid);
      expect(worldStamp.socketHolder(listener.port, process.pid)).toBe(listener.pid);
    });

    it('loses its answer when the server dies — even though the launcher is still alive', async () => {
      const api = checkout('alpha');
      const listener = await spawnListener();
      const written = worldStamp.writeStamp({
        apiBaseUrl: listener.origin,
        repo: api.repo,
        launchedPid: process.pid,
        builtFrom: worldStamp.buildTokenOf(api.repo)
      }, dir);
      expect(worldStamp.readStamp(listener.origin, dir).ok).toBe(true);

      // The server dies. The launcher — this jest process — does not.
      await stop(listener.child);

      const read = worldStamp.readStamp(listener.origin, dir);
      expect(read.ok).toBe(false);
      expect(read.reason).toContain('the world it describes is gone');
      expect(worldStamp.buildFromWorldStamp(listener.origin, dir)).toBeNull();

      // AND THE DEFECT, DEMONSTRATED NEXT TO THE GUARD. A stamp shaped the way `$!` shaped it — the
      // launcher's pid and start time — is still perfectly verifiable at this moment, and would answer
      // this build for a socket nothing of ours is on. That is what "the launcher is alive" is worth.
      const launcherShaped = Object.assign({}, written.stamp, {
        pid: process.pid,
        processStartedAt: worldStamp.processStartedAt(process.pid),
        launchedPid: null
      });
      fs.writeFileSync(written.file, JSON.stringify(launcherShaped, null, 2) + '\n');
      expect(worldStamp.readStamp(listener.origin, dir).ok).toBe(true);
    });

    it('refuses when the port is held by a process this run did not start', async () => {
      const api = checkout('alpha');
      const listener = await spawnListener();
      const stranger = spawnIdle();   // alive, and no ancestor of the process on that socket

      expect(() => worldStamp.writeStamp({
        apiBaseUrl: listener.origin,
        repo: api.repo,
        launchedPid: stranger.pid,
        builtFrom: worldStamp.buildTokenOf(api.repo)
      }, dir)).toThrow(/a process this run did not start/);
      expect(fs.readdirSync(dir)).toEqual([]);
    });

    it('refuses when nothing is listening on the origin at all', async () => {
      const api = checkout('alpha');
      // A port this machine has just released, so it is free and nothing answers on it.
      const probe = http.createServer(() => {});
      await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
      const origin = 'http://127.0.0.1:' + probe.address().port;
      await new Promise(resolve => probe.close(resolve));

      expect(() => worldStamp.writeStamp({
        apiBaseUrl: origin,
        repo: api.repo,
        launchedPid: process.pid,
        builtFrom: worldStamp.buildTokenOf(api.repo)
      }, dir)).toThrow(/nothing is listening/);
      expect(fs.readdirSync(dir)).toEqual([]);
    });

    it('never accepts init as the ancestor, which would make every process on the machine "ours"', () => {
      expect(worldStamp.isSelfOrDescendant(process.pid, 1)).toBe(false);
      expect(worldStamp.isSelfOrDescendant(process.pid, 0)).toBe(false);
      expect(worldStamp.isSelfOrDescendant(process.pid, process.pid)).toBe(true);
    });
  });

  // ---- THE TWO SMALLER ITEMS FROM THE SAME REVIEW -----------------------------------------------

  describe('the loopback list', () => {
    it('spells IPv6 loopback the way Node actually reports it', () => {
      // The reason the old `host === "::1"` arm could never be true, pinned so nobody rewrites it back.
      expect(new URL('http://[::1]:5951').hostname).toBe('[::1]');

      expect(worldStamp.isLoopbackHost('[::1]')).toBe(true);
      expect(worldStamp.isLoopbackHost('::1')).toBe(true);
      expect(worldStamp.isLoopbackHost('10.0.0.4')).toBe(false);
      expect(worldStamp.originKey('http://[::1]:5951')).toBe('ipv6-loopback-5951');
      // …and the IPv4 key is untouched: `live-world.sh`'s banner names that file by hand.
      expect(worldStamp.originKey('http://127.0.0.1:5951')).toBe('127-0-0-1-5951');
    });
  });
});
