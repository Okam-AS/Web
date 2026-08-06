#!/usr/bin/env bash
#
# THE NEGATIVE. A run that only succeeds cannot tell the shipped claim apart from the raw UPDATE it
# replaced, because the UPDATE had no notion of a caller at all. So: ONE invitation token, issued once,
# presented TWICE -- first by the MANAGER, then by the WORKER. Nothing differs but the bearer.
#
# C7: the raw token is a credential. It stays in a shell variable, reaches curl over STDIN (never argv,
# so never the process table), is never echoed and never written to a file. The sweep at the end proves
# that against the real backend's own log rather than asserting it.
set -uo pipefail

API=http://127.0.0.1:5093
STORE=1

S() { docker exec -i okam-lwfodr-sql /opt/mssql-tools18/bin/sqlcmd \
        -S localhost -U sa -P 'Velkommen123!' -C -b -I -d OkamDemoWfRun -h -1 -W -Q "$1"; }

# Derived, never pasted: a rebuilt world mints new GUIDs, and a hardcoded id turns a real regression
# into "row not found" on the next run.
#
# LOWERCASED, and that is not cosmetic. sqlcmd renders a `uniqueidentifier` in UPPERCASE while the API
# serializes the same GUID in lowercase, so comparing them as strings makes an IDENTICAL id read as a
# mismatch -- this check reported a false RED until the fold was added.
guid() { S "$1" | tr -d ' \r\n' | tr 'A-Z' 'a-z'; }
NORA_STAFF="$(guid "SET NOCOUNT ON; SELECT CONVERT(varchar(50),s.StaffMemberId) FROM WorkforceStaffMembers s
                 JOIN WorkforcePersons p ON p.WorkforcePersonId=s.WorkforcePersonId WHERE p.DisplayName=N'Nora Berg';")"
NORA_PERSON="$(guid "SET NOCOUNT ON; SELECT CONVERT(varchar(50),WorkforcePersonId) FROM WorkforcePersons WHERE DisplayName=N'Nora Berg';")"
[ -n "$NORA_STAFF" ] && [ -n "$NORA_PERSON" ] || { echo "FAILED: no Nora in the world"; exit 1; }

login() { curl -sS -X POST "$API/User/login" -H 'Content-Type: application/json' \
            -d "{\"phoneNumber\":\"$1\",\"token\":\"$2\"}"; }

MGR_TOKEN="$(login '+4799999999' AppSettings__DemoVerificationCode__REDACTED | jq -r '.token')"
WRK_TOKEN="$(login '+4790000001' AppSettings__PowerUserVerificationCode__REDACTED | jq -r '.token')"
MGR_USER="$(S "SET NOCOUNT ON; SELECT CONVERT(varchar(50),ApplicationUserId) FROM WorkforcePersons WHERE DisplayName=N'Ingrid Moen';" | tr -d ' \r\n')"
WRK_USER="$(S "SET NOCOUNT ON; SELECT CONVERT(varchar(50),ApplicationUserId) FROM WorkforcePersons WHERE DisplayName=N'Nora Berg';" | tr -d ' \r\n')"
[ -n "$MGR_TOKEN" ] && [ -n "$WRK_TOKEN" ] || { echo "FAILED: no bearer"; exit 1; }
echo "manager user = $MGR_USER"
echo "worker  user = $WRK_USER"
echo

echo "== issue ONE fresh invitation for Nora's engagement (manager, endpoint 6)"
INV="$(curl -sS -X POST "$API/workforce/stores/$STORE/staff/$NORA_STAFF/invitations" \
        -H "Authorization: Bearer $MGR_TOKEN" -H 'Content-Type: application/json' \
        -H "Idempotency-Key: $(uuidgen)" -d '{}')"
RAW="$(printf '%s' "$INV" | jq -r '.token // empty')"
echo "   response (token removed): $(printf '%s' "$INV" | jq -c 'del(.token)')"
unset INV
[ -n "$RAW" ] || { echo "FAILED: no token issued"; exit 1; }
# A correlator that is NOT the credential: the same sha256 the server stores, so the row can be matched.
RAWHASH="sha256:$(printf '%s' "$RAW" | shasum -a 256 | cut -d' ' -f1)"
echo "   token issued; server-side hash = $RAWHASH"
echo "   row now: $(S "SET NOCOUNT ON; SELECT CONCAT(State,' hash=',TokenHash) FROM WorkforceInvitations WHERE TokenHash='$RAWHASH';")"
echo

claim() { # claim BEARER  -> prints "<http_code> <body>"
    printf '{"token":"%s"}' "$RAW" | curl -sS -o /tmp/claim_body.$$ -w '%{http_code}' \
        -X POST "$API/workforce/me/invitations/claim" \
        -H "Authorization: Bearer $1" -H 'Content-Type: application/json' \
        -H "Idempotency-Key: $(uuidgen)" --data-binary @-
    printf ' '; cat /tmp/claim_body.$$; rm -f /tmp/claim_body.$$
}

echo "== ATTEMPT 1 -- the MANAGER presents Nora's token"
A1="$(claim "$MGR_TOKEN")"
echo "   -> $A1"
CODE1="${A1%% *}"
echo "   Nora's person after attempt 1: $(S "SET NOCOUNT ON; SELECT CONCAT(State,' user=',ISNULL(CONVERT(varchar(50),ApplicationUserId),'<null>')) FROM WorkforcePersons WHERE WorkforcePersonId='$NORA_PERSON';")"
echo "   invitation after attempt 1  : $(S "SET NOCOUNT ON; SELECT CONCAT(State,' claimedBy=',ISNULL(CONVERT(varchar(50),ClaimedByApplicationUserId),'<null>')) FROM WorkforceInvitations WHERE TokenHash='$RAWHASH';")"
echo

echo "== ATTEMPT 2 -- the WORKER presents the SAME token"
A2="$(claim "$WRK_TOKEN")"
echo "   -> $A2"
CODE2="${A2%% *}"
BODY2="${A2#* }"
echo "   invitation after attempt 2  : $(S "SET NOCOUNT ON; SELECT CONCAT(State,' claimedBy=',ISNULL(CONVERT(varchar(50),ClaimedByApplicationUserId),'<null>')) FROM WorkforceInvitations WHERE TokenHash='$RAWHASH';")"
echo

echo "== VERDICT"
FAIL=0
[ "$CODE1" != "200" ] || { echo "   RED: the manager's token was ACCEPTED ($CODE1)"; FAIL=1; }
[ "$CODE1" = "200" ] || echo "   ok  manager REFUSED with $CODE1"
[ "$CODE2" = "200" ] || { echo "   RED: the worker's token was refused ($CODE2) -- the token was not valid, so attempt 1 proves nothing"; FAIL=1; }
[ "$CODE2" = "200" ] && echo "   ok  worker ACCEPTED with 200 on the SAME token -- only the bearer differed"
P2="$(printf '%s' "$BODY2" | jq -r '.workforcePersonId // empty')"
[ "$P2" = "$NORA_PERSON" ] && echo "   ok  bound person = Nora's ($P2)" || { echo "   RED: bound person '$P2' != Nora's '$NORA_PERSON'"; FAIL=1; }
FINAL="$(S "SET NOCOUNT ON; SELECT CONVERT(varchar(50),ClaimedByApplicationUserId) FROM WorkforceInvitations WHERE TokenHash='$RAWHASH';" | tr -d ' \r\n')"
[ "$FINAL" = "$WRK_USER" ] && echo "   ok  claimedBy = the WORKER's login, never the manager's" || { echo "   RED: claimedBy '$FINAL' is not the worker's '$WRK_USER'"; FAIL=1; }
echo

echo "== C7 sweep against the REAL backend"
LANE=/Users/svendaneel/okam/Web-modules/lanes/L-WF-ONBOARD-DEMO-RUN
# `grep -c` prints 0 AND exits 1 when it matches nothing, so `|| echo 0` appends a SECOND zero and every
# comparison below then fails against the literal "0\n0". Take grep's own count and default only an
# absent file to 0 -- a sweep that cries wolf is a sweep nobody reads.
count() { local n; n=$(grep -c -F "$1" "$2" 2>/dev/null || true); printf '%s' "${n:-0}"; }
N_LOG=$(count "$RAW" "$LANE/evidence/api.log")
N_EV=$(grep -rl -F "$RAW" "$LANE" 2>/dev/null | wc -l | tr -d ' ')
N_MGR=$(count "$MGR_TOKEN" "$LANE/evidence/api.log")
N_WRK=$(count "$WRK_TOKEN" "$LANE/evidence/api.log")
echo "   raw invitation token in api.log : $N_LOG   (must be 0)"
echo "   raw invitation token in lane dir: $N_EV files   (must be 0)"
echo "   manager bearer in api.log       : $N_MGR   (must be 0)"
echo "   worker  bearer in api.log       : $N_WRK   (must be 0)"
[ "$N_LOG" = "0" ] && [ "$N_EV" = "0" ] && [ "$N_MGR" = "0" ] && [ "$N_WRK" = "0" ] || FAIL=1
unset RAW MGR_TOKEN WRK_TOKEN
echo
[ "$FAIL" = "0" ] && echo "ALL GREEN" || echo "SOMETHING IS RED"
exit "$FAIL"
