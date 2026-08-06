```
RETURN: L-HOSTED-SERVICE-FLOOR
brief: 0b53d302
verdict: built
evidence: lanes/L-HOSTED-SERVICE-FLOOR/mutation-log.md
log:
Base 8e2b57de is real and is the tip, but of feature/restaurant-modules, not any integration/* ref.
No floor existed. Ten registrations confirmed: nine in Program.cs, tenth in the Margin helper.
Defect measured, not assumed: the containment guard asserts declared>0 over TYPES, so it stayed
GREEN with both money loops' registrations cut (witness-containment-blind.txt).
Built OUTSIDE the wire tier, forced not preferred: WireHost sets Registrations = services (same
reference) then strips hosted services from that very collection one line later. No host, no
container; the floor invokes Program.AddServices, verified pure registration (no config/env).
DEPARTURE, as the brief invited: AddServices has exactly ONE call site, so a throwaway-collection
guard dies the day that line goes. An extra fact walks the COMPILED IL of the entry point. M11
proves it was load-bearing: all ten per-loop cases stayed green under that deletion, only the
anchor red. Without it this lane ships a floor green in a world registering nothing.
27-run alternating matrix, all production mutants: each of the ten deleted SEPARATELY reds the one
case naming it; 14 pristine runs green 13/13; WebApi.dll (not WebApi.Tests.dll) moved all 27 runs.
Exemption list written, guarded both ways: unlisted service reds (M13), stale exemption reds (M12).
Container-free tier 4651/0/12 (Database!=SqlServer). No production file changed. Commit 6289de2f.
END RETURN
```
