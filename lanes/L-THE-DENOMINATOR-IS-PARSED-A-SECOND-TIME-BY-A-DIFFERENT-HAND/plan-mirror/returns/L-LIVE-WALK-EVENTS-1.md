```
RETURN: L-LIVE-WALK-EVENTS
brief: cb06dc6f
verdict: blocked
evidence: /Users/svendaneel/okam/Web-modules-wt/L-LIVE-WALK-EVENTS/lanes/L-LIVE-WALK-EVENTS/evidence.md
needs: +F-SQL-HEADROOM
log:
THE WIRE. EventsController is its OWN IActionFilter (Controllers/EventsController.cs:67-75): every /events route, public AND admin, 404s EVENTS_DISABLED while EventsModuleGate.IsEnabled is false.
IsEnabled reads config Events:Enabled, default FALSE (EventsModuleGate.cs:57,66). Declared in NEITHER appsettings.json:182 nor .Development.json:44 — Growth has that field, Events has none.
live-world.sh sets no module config, so on any live world this branch builds the walk's FIRST act — anonymous POST /events/inquiries, before anyone signs in — 404s. Step one, not settlement.
WHY IT STOOD: live-world.sh said "Events:Enabled would change nothing here" — true of the 3 journeys that existed, neither of whose surfaces calls /events. The flag catalog composes unconditionally.
So all 18 rows incl. every Events.* render on the board with the module dark behind them; events-deposit-precondition passes live while arming a flag on a store whose /events routes all 404.
FIXTURE HIDES IT, third time for this shape: it models store-scoped Events.Core, has NO outer master, and the master's refusal IS the EVENTS_DISABLED sentence the walk asserts must not appear.
CLOSED as live-world.sh's header instructed: Events__Enabled=true on the launch line, plus two read-only probes so the switch is measured rather than trusted. Neither probe writes anything.
Probe 1: GET /events/proposals/<uuid> must answer EVENTS_PROPOSAL_NOT_FOUND, not EVENTS_DISABLED (deployed vs dark). Probe 2: GET /events/admin/{store}/events must STILL be EVENTS_DISABLED.
WALK UNCHANGED. The venue moved to support/venue.js, asked out of band BEFORE the browser opens over the same lowercase /user/login the login modal posts, so the enquiry still precedes sign-in.
The header's own remedy — sign in first to find the store — was rejected: it pays for the venue with the finding. A dark pipeline is not a STRANGER's enquiry landing in one. Tag is now @live.
PROVEN: rerunnability guard 33/33; venue.js returns "42" against a real fixture, so fixture mode is behaviour-identical; falsified both ways (401 throws, no body leaked; dead origin throws).
NOT PROVEN: no live world stood up. The probes have NEVER executed and nothing downstream of the enquiry is verified against .NET. One gate was hidden; I claim nothing about the others.
Independent backend recon agrees Events:Enabled is the ONLY non-HTTP-reachable requirement — no Events seed row blocks this walk. Watch reconcile: a PosCheck line lands Discrepancy in a bare world.
NOT RUN: I hold no SQL slot (class node) and started no container. Headroom is NOT the constraint — docker stats read 1.28GiB of 7.65GiB, ~6.3GiB free. The block is the slot grant, not RAM.
Ports: bound 4986 only, ~90s, then freed; 4010/4971/4973 never touched. Worktree on lane/live-walk-events 40b4884 off 8ac6f63; backend read-only at 8e2b57de. Nothing pushed.
END RETURN
```
