```
RETURN: L-SECRETS-READ-FROM-CONFIG
brief: e4a51cf8
verdict: built
evidence: /Users/svendaneel/okam/Web/.claude/worktrees/agent-aacb5251c46cd2751/lanes/L-SECRETS-READ-FROM-CONFIG/evidence.md
log:
NOT LANDED IN THE BACKEND REPO: git -C, cd+git and worktree add are all refused from this Web worktree. Worked from a source copy, per the brief.
Base feature/restaurant-modules 8e2b57de via git clone --local, push disabled. Local commit 14e86655; patch at lanes/L-SECRETS-READ-FROM-CONFIG/secrets-read-from-config.patch (git am).
../OkamAPI-modules NOT used: stale at lane/meals-grace-pins and it lacks OkamFunctionsDocumentRenderer.cs entirely. Credential sites cross-checked against the tip instead.
Helpers/RequiredCredentials.cs declares the four keys once; Program.Main enforces them beside the fiscal-journal KeyVault guard, before AddJWTAuthentication reads the signing key eagerly.
appsettings.json now holds only the "Set in Azure" placeholder for all four, and IsUnset REFUSES that spelling too, so copying the committed placeholder into an app setting does not satisfy the guard.
AppSettings:Secret and :PowerUserVerificationCode moved to appsettings.Development.json, which no deployed environment loads; they are INBOUND and are what every local sign-in and Scripts/demo types.
ExternalApi:EddaOrdersApiKey and DocumentRenderer:FunctionKey are OUTBOUND and are committed NOWHERE now. Unset, the anonymous store-orders route admits nobody and the renderer refuses, naming the key.
A FIFTH copy of the Edda key was found late in Bruno/Okam API/stores/stores-{storeId}-orders.bru, which a .cs/.json extension sweep walks past. It now reads a Bruno variable, and a derived test pins it.
RED FIRST: the two classes that compile against unmodified production code ran 5 failed / 17 passed before any wiring existed.
SUITE, non-SQL tier, no container touched: BASE 8e2b57de clean 4638/0/12 of 4650 -> AFTER 4672/0/12 of 4684. Delta +34, every one of them new, accounted for test by test in the evidence.
LITERAL-BACK MUTATIONS, one at a time, full builds: appsettings 1 FAIL; controller 1 FAIL; renderer 2 FAIL; guard deleted from Main 1 FAIL; dev code blanked 2 FAIL; Bruno file 1 FAIL. Restored, then 74/0.
The guard test BOOTS the real entry point in Staging rather than calling the guard, and satisfies the KassaSettings guard explicitly so it observes this guard's verdict and never that one's.
BREAKS NOTHING TODAY: demo-up.sh and the six seeds run Development and set neither value; the owner's :5971 world and the wire tier likewise; CI builds and tests but never runs the app.
DEPLOY PREREQUISITE, needs saying out loud: the App Service will REFUSE TO START until AppSettings__Secret, AppSettings__PowerUserVerificationCode, ExternalApi__EddaOrdersApiKey and DocumentRenderer__FunctionKey exist.
FLAG, not fixed: Bruno/Okam API/environments/OKAM - prod.bru commits a production PowerUserRole bearer token minted with AppSettings:Secret. Expired 2026-06-22, but the key that signs a fresh one has not been rotated.
END RETURN
```
