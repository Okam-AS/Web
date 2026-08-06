```
RETURN: L-TELEMETRY-INITIALIZER-FLOOR
brief: 42714c7c
verdict: built
evidence: lanes/L-TELEMETRY-INITIALIZER-FLOOR/mutation-log.md
log:
BASE 8e2b57de = feature/restaurant-modules tip, VERIFIED. Worktree wt-teleminit; commit
78a59ed6 on lane/telemetry-initializer-floor, parent exactly 8e2b57de. mig-stack-land untouched.
NO FLOOR EXISTED: PiiLogSweep calls the STATIC Redact; RequestBodyTelemetryPin derives by
assembly type-scan. Both stay green with the registration deleted. Required set = ONE.
6 facts, typeof-named, reading composition-root DESCRIPTORS and not source text. Five join the
existing wire collection (no new host, no server, no container) because the registration is
INLINE in Program.Main: a throwaway-collection guard stays green when the CALL is deleted.
The 6th is host-free AND collection-free -- the wire host blanks the AI connection string, so
TelemetryConfiguration.TelemetryInitializers reads 1 in EVERY world (plain 12, +blanking 1).
MUTANTS 4/4 red, full builds, WebApi.dll moved and WebApi.Tests.dll did not, restored green.
COUNT IS THE WRONG FLOOR, MEASURED: 10 SDK initializers, none redacts, so with ours deleted
the count fact stays GREEN while four others red. Neutered-redaction mutant reds ONLY the
behavioural fact; scoped mutant reds via ValidateOnBuild refusing the host (fail-closed).
NOT ABSORBED: IHostedService x10 -- WireHost REMOVES every app hosted service, so the wire
tier cannot floor them. SUITE 4656/4644/0/12 vs base 4650/4638/0/12; ev-dietary restored.
END RETURN
```
