```
RETURN: L-EV-URI-RELATIVE
brief: b8f27a66
verdict: built
evidence: lane/ev-uri-relative @ 6a7bf75b (wt-evuri) · artifacts/lanes/L-EV-URI-RELATIVE/RUN.md
log:
Brief verified, not assumed: on this host `new Uri("/events"+"/events/deposit/{tok}", Absolute)` throws
  nothing — it returns file:///events/events/deposit/{tok}, scheme=file. Fix NOT on feature/restaurant-modules.
Ported EventsGuestLink.cs BYTE-IDENTICAL from lane/ev-vipps-fallback @9e3a607b (unmerged, parked) so the
  add/add merges clean. It checks SCHEME, not absoluteness — absoluteness is what file:// already satisfies.
Not insufficient, but that lane's pins sit inside EventsDepositVippsFallbackTests, entangled with the Vipps
  adapter and an HTTP stub. Mine stand alone, so the refusal survives whichever lane lands — or neither.
M1 (check deleted = literally the shipped code): 9 red. "/events", "/", "file://" come back Delivered==TRUE
  on the mail path: the guest IS sent the file link. Exit criterion, measured rather than asserted.
M2 (label quotes the composed address): 7 red. M2b (label clean, only the LOG carries it): 2 red — run
  separately because M2 short-circuits on the label assert, leaving Assert.All(log.Entries) unproven.
Clean tier Database!=SqlServer: 4379 passed / 0 failed / 12 skipped. Started no container; the SQL one on
  the host is wt-evrefund's live run, untouched. No migration authored.
FLAG 1: only ONE guest-link path exists on this branch — "both paths" holds only once ev-vipps-fallback
  lands; DepositPagePrefix/ProposalPagePrefix have no production caller here until it does.
FLAG 2: a suite run rewrites committed artifacts/journeys/ev-dietary/run-sheet.* with today's date, so no full run leaves a clean tree and real edits can hide in that churn.
END RETURN
```
