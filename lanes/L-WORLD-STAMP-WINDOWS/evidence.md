# L-WORLD-STAMP-WINDOWS — the build stamp cannot name a commit the binary was not built from

Brief `35096b21`. Exit criterion: *the stamp records the process holding the socket and refuses when the
repository head has moved since the build, pinned by a test per window that reds if either guard is
removed.*

Both windows were closed **in `world-stamp.js`, not in `live-world.sh`** — deliberately. The wiring is
what nothing executes end to end, and that is precisely why both windows survived the review of the
module. A guard that lives in the shell is a guard nobody runs.

---

## W1 — the head moves between the build and the stamp

`writeStamp` asked git for `HEAD` **at stamp time**. A rebase or checkout in the API worktree between
the build and the stamp made the stamp name a commit the running binary was not built from — verified
alive, origin-matched, and confidently wrong. `resolveBackendBuild` would then have printed *"this
overrode E2E_API_BUILD"*, presenting the wrong answer as the guard working.

**The fix.** The caller must name the build it is stamping: `builtFrom`, the token
`world-stamp.js built <repo>` prints at the moment the binary is built. `writeStamp` recomputes that
token from the checkout and **refuses** if it differs. It is **required** — a caller cannot disable the
guard by quietly dropping an argument, which is the only way a guard in a writer gets lost when the
wiring goes unexecuted.

The token is `<sha>` or `<sha>+dirty`. `+dirty` is part of the identity, not noise: a tree that gained
an edit after the build is not the tree that was built, and a stamp naming `<sha>+dirty` for a binary
compiled from clean `<sha>` is the same lie in smaller print.

`live-world.sh` gained the other half, which no stamp-time check can do: it records the sha **before**
step 3 and re-reads it **after** `dotnet build`, and `die`s if the commit moved *during* the build —
the binary is then of a tree no commit names. That comparison is on the **sha only**, because a build
writes into `obj/` and `bin/` and a checkout that ever stopped ignoring those would flip the dirty flag
for a reason that has nothing to do with a head moving. Strictness is allocated by consequence: the
unambiguous signal kills the world, the finer one only loses the stamp.

## W2 — the stamped process was the launcher, not the server

`$!` after `nohup dotnet run …` is the **launcher**; `dotnet run` execs a child named plainly `WebApi`,
and that child holds the socket. (Step 1 of `live-world.sh` kills by port for exactly this reason.)
Liveness therefore proved *"the launcher is alive"*, not *"this origin is served by this build"* — a
dead server under a live launcher kept the stamp valid and answering the old build.

**The fix.** The caller passes `launchedPid` — what it started — and `writeStamp` resolves **the process
actually holding the socket** and stamps that one. The holder must be `launchedPid` or a **descendant**
of it; a holder that is neither is a stranger, and a stranger means no stamp at all. This is not a return
to interrogating the port: it happens **once**, at write time, by the party that built the world, at a
moment when the port was proven free beforehand, our own process was proven to have bound it, and
`/health` had answered. The **reader** still never touches the socket.

## The residual, in both directions

The reviewed lane recorded this residual in only its safe direction, and *"a residual recorded in one
direction reads as a bound; it is not one"* — which is how W2 survived its first writing. Stated whole
in the module header now:

- **safe** — the serving process dies, the stamp is refused, the run may be filed `-unidentified`. The
  answer is lost. Acceptable.
- **open** — the stamped process is still alive but has stopped serving this origin and something else
  took the port. Not closed. It is narrow for a reason worth stating rather than assuming: a server that
  releases its listener and keeps running is not a thing Kestrel does short of a crash, and a crash takes
  the process with it. Closing it would mean reading the socket **at read time**, which is the source
  this whole file exists not to depend on.

## The two smaller items from the same review

- `host === '::1'` was **dead code** in two files. Node's WHATWG URL returns `'[::1]'`, brackets
  included, so IPv6 loopback was silently treated as another machine. Both spellings are accepted now
  and key to one file; `artifact-store.js`'s two inline copies of the list are replaced by
  `worldStamp.isLoopbackHost`, so a wrong hostname spelling is now wrong once.
- `writeFileSync` is not atomic. The stamp is written to a pid-named sibling and **renamed** into place.
  Hardening rather than a hole: a half-written file read mid-write produced *"not readable JSON"*, which
  is a refusal and not a wrong answer.

`STAMP_VERSION` is **2**. A v1 stamp on disk was written by the writer that could be wrong — no
`builtFrom`, and a `pid` that may be a launcher — so it is refused rather than read leniently. Nothing
is lost: a stamp describes a process on this machine and never survives a rebuild.

---

## Evidence

| what | how | result |
|---|---|---|
| the two windows, pinned | `npx jest test/world-stamp-windows.test.js` | 10/10 — `jest-windows.txt` |
| **each guard reds when removed** | `node lanes/L-WORLD-STAMP-WINDOWS/mutation-proof.js` | both mutants caught — `mutation-proof.txt` |
| the wiring hands both guards over, and both refuse when opened | `npm run test:e2e:live-world-stamp` | 12/12 — `wiring-check.txt` |
| a live artifact still names the stamped build, in real Chromium | `node test/e2e/scripts/build-provenance-proof.js` | 5/5 arms — `provenance-arms/arm-*.json` |

Arm 1's artifact, produced by the new writer and read back through the unchanged reader:

```json
"backendBuild": {
  "id": "okamapi-alpha@c1b97d683fdc6322c3fdf41e53e434c353dda25d",
  "source": "stamp:artifacts/world/live/127-0-0-1-59871.json",
  "detail": "branch main, stamped by build-provenance-proof.js at 2026-08-04T21:23:58.991Z,
             pid 89618 (which was serving this origin) still running"
}
```

The wrong answer was live and nameable in every arm: the port would have said
`Web-modules@e34977ac…+dirty` — the **frontend's** commit presented as the API's build — and arm 3
invalidates the stamp and requires the artifact to change to exactly that.
| nothing else moved | `npx jest --coverage=false` | 2920 passed, 0 failed |

### The window was opened deliberately, not asserted from reading

- **W1, at the module** — `test/world-stamp-windows.test.js` makes a real git checkout, takes the build
  token, then lands a **real second commit** in it and shows the writer refusing. The wrong answer is
  named first (`buildTokenOf(repo)` after the move) so the refusal is not vacuous.
- **W1, through the real CLI** — wiring check `B3`: the head moves under a running world and
  `world-stamp.js write` exits non-zero, writes nothing, and names both commits. `B5` then stamps the
  same world at its rebuilt commit, so `B3` is a refusal and not a breakage.
- **W2, at the module** — a real child process holds a real socket with the jest process as its
  launcher, so *launcher* and *server* are two different live pids on this machine. After the server is
  killed, the test **constructs the launcher-shaped stamp by hand and shows it still verifies** — the
  defect demonstrated next to the guard that prevents it.
- **W2, through the real CLI** — wiring check `B1`/`B2`: a `bash -c 'node "$0" & wait'` launcher whose
  child holds the port (the shape `nohup dotnet run` produces), and the stamp records pid *child*,
  `launchedPid` *launcher*.

### The mutation proof does not edit the checkout

`test/world-stamp-windows.test.js` reads `WORLD_STAMP_MODULE`, so the proof deletes a guard from a
**copy** in a temp directory and watches the spec red. Same affordance `live-world-banner-check.js`
gives itself with `--script`, and for the same reason: other lanes are reading these files.

```
MUTANT W1 — the build is read at STAMP time again
  red as required   refuses when the checkout has been rebased onto a different commit since the build
  red as required   refuses when the tree merely gained an edit after the build
  red as required   will not stamp at all when nobody says which build it is stamping
MUTANT W2 — the launcher pid is stamped again
  red as required   records the process serving the port, not the launcher that started it
  red as required   loses its answer when the server dies — even though the launcher is still alive
  red as required   refuses when the port is held by a process this run did not start
  red as required   refuses when nothing is listening on the origin at all
```

## What was NOT proved

- **`live-world.sh` was not run.** It needs a SQL container, the migration chain and a real WebApi, and
  this lane was granted no container. What is proved is the CLI contract it depends on (`B0`–`B5`) and
  that the script still speaks it (`S0`–`S5`), which is the half that carries both guards.
- **Not the product.** Nothing here touches an application code path.

## For the orchestrator — the probe handover the brief flagged

`json:$.backendBuild.source` **cannot read a forged value** — only a verified stamp produces `stamp:`.
But it **can keep reading `process:127.0.0.1:5961`** after a correctly stamped world has run, because
the standing canonical artifact is of **equal rank** and equal rank from a different key does not
displace. Any probe on that key must carry the handover step or it will go red against correct code.
This lane did not touch the ranking, and could not have fixed that from here.

## Pre-existing, not caused here

`npx jest` reports 5 failed **suites** with 0 failed tests: other lanes' Playwright specs under
`lanes/**` (`L-JOURNEY-PORT-HARDCODED`, `L-TRAIN-PUBLISH-UNCLICKABLE`, `L-TRAIN-READONLY-VISIBLE`,
`L-WF-PIVOT-DEFECTS` ×2) that jest collects and that die on `require('@playwright/test')` outside a
Playwright runner. `jest.config.js` ignores `test/e2e/` but not `lanes/`. Untouched by this lane.

## Files

| path | what |
|---|---|
| `test/e2e/support/world-stamp.js` | both guards, the `built` CLI, the loopback list, atomic write, `STAMP_VERSION` 2 |
| `test/e2e/support/artifact-store.js` | the two `'::1'` dead comparisons replaced by `isLoopbackHost` |
| `test/e2e/scripts/live-world.sh` | reads the token after the build, refuses a head that moved during it, hands over both arguments, banner and operator lines corrected |
| `test/e2e/scripts/live-world-stamp-wiring-check.js` | **new** — the structure/behaviour guard, `npm run test:e2e:live-world-stamp` |
| `test/world-stamp-windows.test.js` | **new** — a test per window, with the `WORLD_STAMP_MODULE` affordance |
| `test/journey-artifact-store.test.js` | existing stamp block moved to the new signature |
| `test/e2e/scripts/build-provenance-proof.js` | same |
| `package.json` | the new check is runnable by name |
