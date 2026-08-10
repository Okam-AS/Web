RETURN: L-AN-ACCEPTANCE-NAMES-SOMEBODY
brief: b2b37cfc
verdict: built
evidence: /Users/svendaneel/okam/OkamAPI-acceptname/WebApi.Tests/Wire/EventsAcceptanceIdentityWireTests.cs
log:
base feature/restaurant-modules 8e2b57de8; worktree /Users/svendaneel/okam/OkamAPI-acceptname on lane/an-acceptance-names-somebody at 86142430c, not pushed.
route read before calling it: POST /events/proposals/{token:guid}/accept, [AllowAnonymous], body EventsProposalAcceptRequest { AcceptorName, AcceptorEmail }, neither required.
guard is EventsProposalDraftBuilder.RequireAcceptorIdentity, called once from EventsProposalService.AcceptAsync; new registry code EVENTS_ACCEPTOR_REQUIRED at 400.
boundary kept as recorded: either a name or a contact address passes. whitespace counts as absent. nothing validates the shape of an address, which is a different claim.
refused, never defaulted: no placeholder acceptor is written, so a visible absence is not traded for an invisible fiction.
placed after the version-status switch, so an already-accepted token still replays a bodiless retry rather than refusing it (the receipt it hands back already names somebody).
placed ahead of both write paths: T5 and the T17 amendment accept build the same receipt from the same body, and the amendment opens a transaction before it gets there.
the same helper normalizes what the receipt records, so a blank cannot clear the guard and then be stored as a present-looking value.
proof at the wire tier over the real pipeline with an anonymous client: three unnamed shapes (absent, null, whitespace) refused 400 EVENTS_ACCEPTOR_REQUIRED on one token.
each refusal read back: no acceptance-receipt row, version still Sent, event still ProposalSent. the same token then accepted on a name with no address, receipt trimmed, email null.
second subject accepted on a contact address with no name, so a stricter rule demanding both would red here rather than ship.
non-vacuity: the guard call removed makes that fact fail; restored, rebuilt and green again, and the green after the rebuild is itself the proof the binary recompiled.
fast tier Database!=SqlServer over the whole suite: 4640 passed, 0 failed, 12 skipped, 6 m 15 s. no migration authored, no SQL container taken, nothing pushed.
frontend untouched and none owed: utils/events/guest.js already refuses the unnamed body and the guest client surfaces the problem code and detail.
for the clerk: Web-modules lanes/L-JOURNEY-EVENTS/wire-rehearsal.js posts an empty body as a post-acceptance replay; the placement above keeps that answering 200.
END RETURN
