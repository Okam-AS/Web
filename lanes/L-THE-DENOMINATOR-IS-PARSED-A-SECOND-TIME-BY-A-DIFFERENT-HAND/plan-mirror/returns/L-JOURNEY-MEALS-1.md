```
RETURN: L-JOURNEY-MEALS
brief: 4b6f411a
verdict: blocked
needs: +L-MEALS-RECONCILE-UI,+D-MEALS-FINALIZE-OWNER
evidence: lanes/L-JOURNEY-MEALS/ @ 8a773267 — evidence.md, mutation-proof.txt, leak-proof.txt (committed); the 2 captures are gitignored, copies in the lane dir
log:
Two walks green at e34977a (meals-admin-setup, meals-guest-claim); proof in lanes/L-JOURNEY-MEALS/evidence.md.
MUTATION WAS THE ONLY LEVER: Meals has no operator switch anywhere — fixture/meals.js calls ctx.flagEffective
ZERO times against events 7, margin 5, growth 3, training 3. Four arms, fixture restored and re-hashed around
each; three red at the right step, the fourth stayed GREEN at exit 0, and that is the finding. Making the
contact-mismatch 403 echo the invitee leaves the walk passing: clean body clean, mutated body carries
"intendedContact":"marit@example.test" (leak-proof.txt). It survives because the step "AND IT DOES NOT SAY
WHOSE INVITATION IT IS" reads RENDERED PAGE TEXT while the leak is a problem-document extension no Vue renders
— two enforcement points, and the walk watches only the one a token thief needn't defeat. Unfixed: spec shared.
THE FINDING UNDER IT: my first draft of that check reported "no leak" for a request refused at the idempotency
guard before it ever reached the contact test — an instrument measuring a request that never got there, which
would have cleared the leak as absent had I trusted it.
BLOCKED: MealsMonthClose.vue exists only on lane/fe-meals-reconcile-ui@fc1c7bc, nothing in utils/meals/ binds
draft or finalize, all 24 meals_mc_* keys absent; driving POST /finalize through a request context and calling
it a walk is what C3/C5 forbid. DEFECT: meals-statement-month.spec.js:72 hardcodes 4010, ignoring
E2E_FIXTURE_PORT where four siblings get it right; mine reddened it, superseded copy kept, restored on 4010.
END RETURN
```
