RETURN: L-THE-GIFT-CARD-REFUSAL-IS-PROVEN-OVER-HTTP
brief: 204e021e
verdict: built
evidence: /Users/svendaneel/okam/Web-modules/docs/plan/lanes/L-THE-GIFT-CARD-REFUSAL-IS-PROVEN-OVER-HTTP/evidence.md
log:
LANDED. Backend trunk 668590cbe -> 5c46187f3, tier 5002 / 0 / 11, exit 0, no abort line, WebApi.dll mtime asserted to move. Nothing pushed.
Landed with the ATOMIC guard: the trunk was re-read in the SAME command as the move and would have refused had it differed from the merge base. It matched, so the move was safe.
NOT BLOCKED, but the harness answer is not the one the brief expected. It can build principals two ways, and a test could mint a third -- but the OAuth shape does not reach this controller at all, so minting it would test fiction.
THE RECORDED JUSTIFICATION FOR ActorClaims IS WRONG AT THIS ENDPOINT. "For the OAuth principal Identity.Name is a phone number" is true of the OAuth LOGIN COOKIE (OAuthLoginController:128), scheme OkamOAuthLogin.
That cookie is an internal step of the authorization-server handshake, read only by OAuthAuthorizationController. It never authenticates an API call. The bare [Authorize] here resolves to JwtBearer.
The application own token carries unique_name = the user id, so Identity.Name IS the user id; the OpenIddict access token sets name = DisplayName with the phone in preferred_username, under a separate scheme used by MCP.
So no principal reaching GiftcardController has Name = a phone number. The resolver is still correct and still the right call -- the reason given for it is what is wrong, and the test drives the principal that occurs.
FIVE ARMS, NAMED FROM A --logger trx rather than read off a green summary: holder-gets-past, non-holder-refused, unknown-id-refused, same-bytes, and cannot-learn-from-status. All Passed.
THE BYTE-EQUAL ARM IS THE SECURITY PROPERTY: both refusing is not the guarantee. A prober learns nothing only if the two refusals are the SAME refusal, asserted on status AND body.
A fifth arm extends that to a card that EXISTS but is in a refusing status -- which is what makes the ownership check position above the status guard a property of the HTTP surface rather than a comment.
THE HOLDER ARM ASSERTS A DIFFERENCE, NOT A 200, and that is deliberate. A transfer has preconditions past ownership this file does not stand up, so asserting 200 would assert a fixture rather than the guarantee.
It asserts the holder body is NOT the stranger body. Without it a guard that refuses EVERYONE passes every other arm -- indistinguishable from one that works.
MUTATION KILLED on the exit criterion own mutation: passing null instead of the resolved caller gives total=5 failed=1, count held at 5 both runs so neither is an INVALID-RUN, restored byte-for-byte via finally AND atexit.
It reds under the CALLER-RESOLUTION mutation specifically, not only under a combined one -- a stronger result than the brief anticipated. The holder arm is the one that reds.
DECISION CHECK made before merging via each open decision blocks: field; none names this lane or the gift-card surface. Worktree created with --detach, torn down, both run-sheet artifacts restored, nothing holds the trunk.
END RETURN
