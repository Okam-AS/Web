```
RETURN: L-THE-SAFE-BENCHMARK-ROWS-ARE-BUILT-GROWTH-AND-MARGIN
brief: 19f5ed08
verdict: fail-spec
spec_gap: GB1 and GB2 are both dispatched as VERIFIED-RED and both are already built - GrowthConsentTextSeed is wired at Program.cs:394 and cites PROOF-BENCHMARKS GB1 by name, and List-Unsubscribe has 17 hits across 9 files in Services/Growth against the row's "zero hits"
log:
FAIL-SPEC ON THE TWO ROWS THAT MATTER MOST, and I built nothing rather than build against them. You said four premises moved tonight; two of my seven had moved before I touched a file.
GB1 IS NOT VERIFIED-RED. The row says a guest cannot subscribe at all and a fresh database is the oracle. But Services/Growth/GrowthConsentTextSeed.cs exists and Program.cs:394 calls it at startup.
Its own doc comment cites PROOF-BENCHMARKS.md GB1 by name and says that until this seed landed, every writer of GrowthConsentTextVersions was a test fixture. The row was built after the triage.
The throw is still there but at GrowthSubscriptionService.cs:66, not :62 as dispatched, and it now guards a seeded baseline rather than walls it off. Whether a fresh DB answers 202 is a measurement.
GB2 IS NOT ZERO HITS. List-Unsubscribe and List-Unsubscribe-Post appear 17 times across 9 files in Services/Growth, including a dedicated GrowthUnsubscribeHeaders.cs.
That file declares ListUnsubscribe, ListUnsubscribePost and OneClickValue = "List-Unsubscribe=One-Click" - RFC 8058 by name - beside GrowthOneClickUnsubscribeLink.cs and a One-Click input formatter.
The dispatched POST target is also wrong: GrowthPreferenceController.cs:129 is inside a catch block returning GrowthError, not a route.
MB5's PREMISE HOLDS: MarginPriceResolver exists at Services/Margin/MarginPriceResolver.cs and no controller declares a price-impact route, so the read is unbuilt and the resolver is there to reuse.
I did not verify GB3, GB6, MB2 or MB3 as deeply. Three are marked BUILT and want pins rather than features, so their premises likelier held - but likelier is not verified and I claim nothing.
WHY I STOPPED RATHER THAN BUILD THE OTHER FIVE: the brief makes a moved premise a fail-spec, and two of the three rows it singled out had moved. A triage with two stale headline rows is one to re-run.
Building the remaining five against it would have produced work nobody asked for beside two rows that needed none, and the estate has paid for that shape twice tonight already.
WHAT A RE-DISPATCH NEEDS: re-run the triage against the current trunk before assigning rows, since PROOF-BENCHMARKS is 72512 bytes of state that at least two lanes have overtaken since it was written.
Then the useful GB1 and GB2 lanes are MEASUREMENT lanes - does a fresh database answer 202, and does the assembled MIME carry both headers - not build lanes.
The demo API on :5091 was left alone: I confirmed the listener, pid 31041, and never touched it. No money path was approached, MB1 WB1 and MB4 were not started.
Nothing built, nothing committed, no ref created or moved, no trunk touched. Backend trunk 6d5328004, 0 dirty, nothing pushed.
END RETURN
```
