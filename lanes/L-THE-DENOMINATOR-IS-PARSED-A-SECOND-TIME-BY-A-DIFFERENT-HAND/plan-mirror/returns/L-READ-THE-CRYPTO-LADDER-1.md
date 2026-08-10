RETURN: L-READ-THE-CRYPTO-LADDER
brief: c9439770
verdict: built
evidence: docs/plan/reviews/L-READ-THE-CRYPTO-LADDER.md
log: APPROVE lane/the-guard-stops-crashing-on-the-case-it-guards 1e48b95 — land as-is, zero changes named.
No rung mints a weak or repeatable key: every rung is CSPRNG, Math.random exists only in a comment, a stub Node crypto falls to the named throw, and no shared state lets one-tick calls collide.
The throw is last, a named Error with an actionable message; proven in the EMITTED web bundle (vm sandbox, no crypto/require/module): message matches, not ReferenceError, no mint.
Two mutations applied and restored: Math.random rung 3 reds 2/14; constant-key-instead-of-throw reds 1/14 — the suite bites on both threats the brief names.
Bundler claim re-measured with the repo's webpack 4.46.0: 2 modules (second is buildin/harmony-module.js) / 2,669 min bytes vs 208 modules for literal require('crypto') — module counts exact.
One commit figure mixes levels: "1.36 MB" is the PRE-minify stat size (1,364,096 B exact); minified it is 642,776 B. Direction and magnitude of the claim hold; not blocking.
Terser md4 cache hash crashes on OpenSSL 3/Node 24, so a naive re-measure reports pre-minify sizes and emits nothing; measured with a cache-free minimizer.
Node/SSR path intact: target-node emitted bundle with globalThis.crypto deleted (node-16 simulation) mints distinct valid v4s via __non_webpack_require__.
RULED: the generate step CANNOT reach newGuid — the data() callers sit behind v-if flags false in initial SSR state at all four render sites; the method sites are user-event driven, mounted()-only.
So the node-16 risk was unreachable pre-fix and is moot post-fix: rung 3 serves the server bundle and node 16's crypto module has randomUUID (added 14.17).
No environment regresses to throwing: IE11 msCrypto-only would get the named Error where trunk threw ReferenceError; engines 22.x excludes the ESM-on-old-Node case.
Scope check: utils/guid.js is the only app-source mint site; no ninth key path bypasses the ladder.
Lane suite re-run in a detached worktree: 14/14 green; no setupFiles change, confirmed against jest.config.js.
Worktrees removed: wt-crypto-ladder (scratchpad) — probe artifacts, coverage and node_modules symlink deleted first; worktree list shows zero residue; no container, no port, no install.
END RETURN
