```
RETURN: L-DEV-DEFAULT-FAILS-CLOSED
brief: 2c2accf6
verdict: built
evidence: /Users/svendaneel/okam/Web-modules/lanes/L-DEV-DEFAULT-FAILS-CLOSED/run.md
log:
Measured on lane/focustrap-teardown 8ac6f63, not the shipped tip; nuxt.config.js:45 is identical on both. Nothing committed, nothing pushed, no container, no foreign port.
CHOSE REFUSE, not localhost. A localhost default starts, fetches nothing and hides which backend it picked - the same silence being fixed. Every harness here already names the target.
The old line was a no-op ternary: both arms returned the deployed API. It read as if dev were handled and was not, which is why a reader checking would move on satisfied.
RED, no packet sent: dev on 3873, unset, /vilkar-store?id=1, every off-origin request ABORTED in-browser, host+path only recorded. GET /stores/1 -> okamapi.azurewebsites.net x2.
GREEN same probe, server restarted per arm: unset -> exit 1, nothing listening on 3873; API_BASE_URL=http://127.0.0.1:4873 -> GET /stores/1 addressed there, zero to the deployed host.
DISCRIMINATOR IS NOT "UNSET" - unset is exactly what both deploys are. It is nuxt command OR NODE_ENV!==production; cli-index.js:536-539 sets production before the config is read.
SWISS BUILD UNCHANGED. vercel.json runs generate at OKAM_EDITION=ch with no API_BASE_URL; two real builds (no + ch) exit 0, 11 of 221 client assets carry the deployed host, 0 localhost.
Both prod builds wrote to a lane-local buildDir via a config that moves ONLY buildDir/generate.dir, so the .nuxt shared by ~124 worktrees was never overwritten. 141MB deleted after the greps.
test/nuxt-config-api-base-url.test.js: 8 passed, one fresh child process per case, holding BOTH halves - refusal and the two deploy paths - because a guard on one half invites the other failure.
Mutated both ways: restore the old unconditional default -> 2 red (fail-closed cases); delete the deployed fallback -> 3 red (okam.no, okam-swiss.ch, build/start). Restored byte-wise, 8/8.
test/e2e/scripts/dev-server.js booted unchanged on 3874 and served HTTP 200 - it sets API_BASE_URL on the compiling process itself, so no sibling lane's journey meets the guard.
No jest test and no script requires nuxt.config outside node_modules, so the throw cannot surprise a suite. eslint nuxt.config.js: 15 problems before, 15 after, none on new lines.
README now carries the variable on the dev command plus a "Which backend am I talking to?" section naming both deploys - the lever has to be readable where the reader already is.
The loader started in test/support/ and was MOVED OUT: that directory is untracked and belongs to an unlanded sibling, so a file left there dies if that lane rolls back.
RESIDUAL, named: a LOCAL npm run build/start still defaults to the deployed API. Telling a laptop's production build from a deploy's needs CI markers, and Procfile hints at a deploy not on that list.
END RETURN
```
