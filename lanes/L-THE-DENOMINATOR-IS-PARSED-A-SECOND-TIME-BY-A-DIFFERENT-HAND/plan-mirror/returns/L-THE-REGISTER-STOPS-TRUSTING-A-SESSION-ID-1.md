RETURN: L-THE-REGISTER-STOPS-TRUSTING-A-SESSION-ID
brief: 8134dc65
verdict: built
evidence: docs/plan/lanes/L-THE-REGISTER-STOPS-TRUSTING-A-SESSION-ID/FINDING.md
log:
Fixed: stateFromClockEvent keyed on clockSessionId alone, so a cross-engagement clock-in — AttendanceException carrying the OTHER employer's OPEN session id — computed SESSION_OPEN.
Three consequences on the till, not one: the badge read Stemplet inn, canClockIn(OPEN) greyed out Stemple inn, and the notice printed a start time off the other employer's openedUtc.
applyResponse carried the same id-shaped test and is fixed in the same commit. It was the second statement of the same lie, in a sentence rather than a badge.
The rule is corroboration: no id is an exception whatever the label claims, a declared AttendanceException is an exception, and a definite Open/Closed needs a folded session AND the outcome.
closedUtc is no longer consulted at all. It is the field that could not tell absent from running, which is where this whole defect family started.
An unrecognised state is UNKNOWN, both buttons live and the server deciding on the next press, so a fourth state added server-side cannot fall through into clocked-in.
The no-id guard is kept although the corrected wire no longer needs it: this client and the API deploy independently, so a till can still meet a pre-4d103ca8a server.
Mutation 2 proves that guard is load-bearing and not decorative: removing it reds the PRE-EXISTING screen test, which uses exactly that older body.
Mutations, 5 applied and 5 red: null-id rule reds 5, no-id guard removed reds 2, unknown-to-Open reds 2, nextState retention reds 1, id-shaped notice reds 1. Restored 25/25 green.
No test survived every mutation I could think of, so none was deleted.
Tier 168 suites / 4011 / 0, exit 0, zero FAIL lines. Trunk d4c308e reads 168/4007/0 and the +4 are this lane's; the brief's older 78ed84f figure was superseded.
C3 answered by tracing rather than assuming: PosTopBar:93 nav entry to PosShell:29 to ClockScreen to the badge, the buttons and the sentence. Visible in three places at once.
No new translation key was needed. posclk_note_no_session already said the true thing for this case and nothing was reaching it.
Header comment corrected in the same commit, plus a stale fixture comment and a test title. The old body is kept as a named staleNothingOpenResponse rather than deleted.
Still owed and not claimed: C5, a person walking the two-employer punch. Branch lane/register-stops-trusting-a-session-id @ 1c607fd off d4c308e, not pushed; worktree removed.
END RETURN
