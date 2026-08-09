#!/bin/sh
# The Ask Okam demo: a seeded world, the five flags on, and a browser pointed at the page.
#
# What it is FOR: making the walk in RUNBOOK.md a ten-minute act instead of an archaeology dig. The
# assistant is only interesting against a store that has products to reprice and flags that let it
# propose, and neither of those is the default — all five Assistant flags ship DENY-CLOSED, so a
# plain `demo-up.sh` gives you a working chat box that can never stage anything.
#
# Rules it holds itself to, inherited from scripts/drift-demo/demo.sh:
#   1. It never guesses a path. An input it cannot find is NAMED -- with the path it wanted and where
#      that path actually lives -- and the step that needed it is SKIPPED, never faked.
#   2. It never prints a PASS for a measurement it did not take. Every flag it claims to have set is
#      READ BACK from the server before it says so.
#   3. It borrows infrastructure, it does not seize it. It will use a SQL container that is already
#      running and it will NEVER start, stop or kill one it did not create -- this host OOM-kills
#      past about three mssql containers and a sibling lane's database is not this demo's to take.
#   4. It writes only to a LOCAL api. The guard is on the resolved address, not on a variable
#      somebody meant to set.
#
# exit: 0 every step ran · 1 a step failed · 2 refused to start
#       3 ran, but steps were skipped for inputs this checkout does not carry
#
# knobs, all optional:
#   ASK_DEMO_BACKEND   the OkamAPI checkout that carries Scripts/demo/  (default: ../OkamAPI-ask)
#   ASK_DEMO_API_PORT  the API port                                    (default: 5080)
#   ASK_DEMO_WEB_PORT  the admin web port                              (default: 3001)
#   ASK_DEMO_STORE     the store name to arm                           (default: Bryggen Bistro)
#   SQL_CONTAINER      an ALREADY-RUNNING mssql container              (default: okam-harness-sql-1)
#   SKIP_WORLD=1       do not rebuild the world; arm the API already on ASK_DEMO_API_PORT
#   NO_WEB=1           do not start the admin web; just print the command

set -u

WEB_SRC=$(CDPATH= cd -- "$(dirname -- "$0")/../.." 2>/dev/null && pwd)
if [ -z "$WEB_SRC" ] || [ ! -f "$WEB_SRC/scripts/ask-demo/demo.sh" ]; then
  echo "REFUSING: cannot identify the Web checkout this script is in."
  echo "  resolved: ${WEB_SRC:-<empty>}"
  echo "  wanted:   \$WEB_SRC/scripts/ask-demo/demo.sh (this file, seen from the repo root)"
  exit 2
fi

API_PORT=${ASK_DEMO_API_PORT:-5080}
WEB_PORT=${ASK_DEMO_WEB_PORT:-3001}
API_BASE="http://127.0.0.1:$API_PORT"
STORE_NAME=${ASK_DEMO_STORE:-Bryggen Bistro}
BACKEND=${ASK_DEMO_BACKEND:-$(CDPATH= cd -- "$WEB_SRC/../OkamAPI-ask" 2>/dev/null && pwd)}

MANAGER_PHONE=${MANAGER_PHONE:-+4799999999}
MANAGER_CODE=${MANAGER_CODE:-123123}

PASS=0; FAIL=0; SKIPPED=0
ok()   { PASS=$((PASS+1));       printf '   PASS  %s\n' "$1"; }
bad()  { FAIL=$((FAIL+1));       printf '   FAIL  %s\n' "$1"; }
skip() { SKIPPED=$((SKIPPED+1)); printf '   SKIP  %s\n' "$1"; printf '         wanted: %s\n' "$2"; }
act()  { printf '\n=== %s ===\n' "$1"; }

# THE HARD GUARD. The seeds write through the API, so it is the API's ADDRESS that has to be local:
# a localhost database behind a remote API would still be somebody else's world. The IPv6 arm is
# QUOTED -- unquoted, `[::1]` is a glob bracket expression matching one character from {:,1} and the
# guard rejects a perfectly local API while looking like it passed.
case "$API_BASE" in
  http://127.0.0.1:*|http://localhost:*|'http://[::1]:'*) ;;
  *) echo "REFUSING: API_BASE='$API_BASE' is not localhost. This demo only ever writes to a local API."; exit 2 ;;
esac

# ------------------------------------------------------------------------------------ preflight --
# Every input is resolved and reported BEFORE the first step, because the failure this block exists
# for is silent: a step that quietly measures nothing and prints a verdict anyway.
have() { command -v "$1" >/dev/null 2>&1 && echo 1 || echo 0; }
HAS_CURL=$(have curl); HAS_JQ=$(have jq); HAS_NPM=$(have npm); HAS_DOCKER=$(have docker)

HAS_BACKEND=0
[ -n "${BACKEND:-}" ] && [ -f "$BACKEND/Scripts/demo/demo-up.sh" ] && HAS_BACKEND=1

HAS_NODE_MODULES=0; [ -d "$WEB_SRC/node_modules" ] && HAS_NODE_MODULES=1
HAS_CORE=0; [ -n "$(ls -A "$WEB_SRC/core" 2>/dev/null)" ] && HAS_CORE=1

SQL_CONTAINER=${SQL_CONTAINER:-okam-harness-sql-1}
HAS_SQL=0
if [ "$HAS_DOCKER" = 1 ]; then
  docker ps --format '{{.Names}}' 2>/dev/null | grep -qx "$SQL_CONTAINER" && HAS_SQL=1
fi

# The model credential. Without it the API comes up, the page renders, the composer accepts a
# question -- and every turn comes back as a technical error. That is the single most expensive way
# for this demo to fail, because everything LOOKS built.
HAS_MODEL_KEY=0
[ -n "${AskModel__Gemini__ApiKey:-}${AppSettings__GeminiApiKey:-}" ] && HAS_MODEL_KEY=1

printf '===============================================================\n'
printf '  ASK OKAM DEMO\n'
printf '===============================================================\n'
printf '  web checkout : %s\n' "$WEB_SRC"
printf '  backend      : %s\n' "${BACKEND:-<not found>}"
printf '  api          : %s\n' "$API_BASE"
printf '  admin web    : http://localhost:%s\n' "$WEB_PORT"
printf '  store        : %s\n' "$STORE_NAME"

ABSENT=0
absent() { ABSENT=$((ABSENT+1)); printf '\n  NOT IN THIS CHECKOUT: %s\n' "$1"; printf '    %s\n' "$2"; }
[ "$HAS_CURL" = 1 ] || absent "curl (on PATH)" "every API call is made with it."
[ "$HAS_JQ"   = 1 ] || absent "jq (on PATH)"   "the responses are read with it. brew install jq"
[ "$HAS_NPM"  = 1 ] || absent "npm (on PATH)"  "STEP 6 starts the admin web with it."
[ "$HAS_BACKEND" = 1 ] || absent "${BACKEND:-../OkamAPI-ask}/Scripts/demo/demo-up.sh" \
  "the world builder. It lives in the OkamAPI checkout on feature/ask-okam, which is a SIBLING repo
    and not part of this one. Point ASK_DEMO_BACKEND at it, or run it yourself and re-run with
    SKIP_WORLD=1."
[ "$HAS_SQL" = 1 ] || absent "a running mssql container named '$SQL_CONTAINER'" \
  "the world is built on a SQL server that is ALREADY UP -- this demo never starts one, because this
    host OOM-kills past about three and the one you have may be a sibling lane's. Start one, or set
    SQL_CONTAINER to one you own."
[ "$HAS_NODE_MODULES" = 1 ] || absent "$WEB_SRC/node_modules" \
  "run: npm ci   (in $WEB_SRC)"
[ "$HAS_CORE" = 1 ] || absent "$WEB_SRC/core (the Core submodule, EMPTY in this checkout)" \
  "the admin web will not BUILD without it -- store/index.js, plugins/global-mixin.js and a dozen
    pages import from ~/core. Fix with:
        git -c protocol.file.allow=always submodule update --init core
    If that cannot reach the pinned commit, borrow it from a sibling worktree's submodule gitdir:
        git -c protocol.file.allow=always \\
            -c submodule.core.url=<repo>/.git/worktrees/<sibling>/modules/core \\
            submodule update core"
[ "$HAS_MODEL_KEY" = 1 ] || absent "a model credential in the environment" \
  "AskModel__Gemini__ApiKey (or AppSettings__GeminiApiKey). WITHOUT IT EVERY QUESTION FAILS while the
    whole page still looks built and healthy -- the composer accepts the question and the turn comes
    back as a technical error. Export one before running, or expect to walk only the inbox half."

[ "$ABSENT" -gt 0 ] && printf '\n  %s input(s) absent -- the steps that need them will SKIP, not guess.\n' "$ABSENT"

if [ "$HAS_CURL" = 0 ] || [ "$HAS_JQ" = 0 ]; then
  echo
  echo "REFUSING: curl and jq are needed by every step. Nothing to do."
  exit 2
fi

api() { # api METHOD PATH [BODY]
  if [ $# -ge 3 ]; then
    curl -sS -X "$1" "$API_BASE$2" -H "Authorization: Bearer $TOKEN" \
      -H 'Content-Type: application/json' -d "$3"
  else
    curl -sS -X "$1" "$API_BASE$2" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json'
  fi
}

# ==================================================================== STEP 1: the world ==========
act "STEP 1  the seeded world"
if [ -n "${SKIP_WORLD:-}" ]; then
  skip "world build skipped (SKIP_WORLD is set) -- arming whatever is already on :$API_PORT" \
       "nothing; this was asked for"
elif [ "$HAS_BACKEND" = 1 ] && [ "$HAS_SQL" = 1 ]; then
  echo "   delegating to $BACKEND/Scripts/demo/demo-up.sh on port $API_PORT"
  echo "   (it rebuilds the database from EMPTY, so the whole migration chain is re-proved)"
  if API_PORT="$API_PORT" SQL_CONTAINER="$SQL_CONTAINER" sh "$BACKEND/Scripts/demo/demo-up.sh"; then
    ok "world built and the API is up on $API_BASE"
  else
    bad "the world builder failed -- its output is above. Nothing below can run against a world
         that was not built, so this demo stops here."
    printf '\n  failures: %s   skipped: %s\n' "$FAIL" "$SKIPPED"
    exit 1
  fi
else
  skip "no world was built" "$BACKEND/Scripts/demo/demo-up.sh plus a running '$SQL_CONTAINER'"
fi

# ==================================================================== STEP 2: sign in ============
act "STEP 2  sign in as the manager and find the store"
LOGIN=$(curl -sS -X POST "$API_BASE/User/login" -H 'Content-Type: application/json' \
  -d "{\"phoneNumber\":\"$MANAGER_PHONE\",\"token\":\"$MANAGER_CODE\"}" 2>/dev/null)
TOKEN=$(printf '%s' "$LOGIN" | jq -r '.token // empty' 2>/dev/null)
if [ -z "$TOKEN" ]; then
  bad "manager login returned no token. Is the API up on $API_BASE?
         response: $(printf '%s' "$LOGIN" | head -c 300)"
  printf '\n  failures: %s   skipped: %s\n' "$FAIL" "$SKIPPED"
  exit 1
fi
# The store comes from the TOKEN's own admin list, never from SQL: a seed that queries the catalog
# for a store name has to be told the database; one that reads the token's adminIn cannot be pointed
# at the wrong world.
STORE_ID=$(printf '%s' "$LOGIN" | jq -r --arg n "$STORE_NAME" '.adminIn[]? | select(.name==$n) | .id' | head -1)
if [ -z "$STORE_ID" ]; then
  bad "no store named '$STORE_NAME' in this manager's adminIn.
         The Workforce seed is the one that creates it: $BACKEND/Scripts/demo/seed-workforce-demo.sh
         Or set ASK_DEMO_STORE to one of: $(printf '%s' "$LOGIN" | jq -r '[.adminIn[]?.name] | join(", ")')"
  printf '\n  failures: %s   skipped: %s\n' "$FAIL" "$SKIPPED"
  exit 1
fi
ok "signed in as $MANAGER_PHONE, store '$STORE_NAME' is id $STORE_ID"

# ==================================================================== STEP 3: the five flags =====
act "STEP 3  arm the assistant (five flags, all deny-closed by default)"
# THIS IS THE STEP THE DEMO EXISTS FOR. Every one of these ships false, and the gate ANDs them:
#   MayStage   = Assistant.Module AND Assistant.Actions AND the per-kind flag
#   MayApprove =                      Assistant.Actions AND the per-kind flag
# With any of them off, the chat box still answers questions perfectly well and simply never offers
# to change anything -- which reads as "the feature is not built" rather than "it is switched off".
#
# Set through the REAL OPERATOR LEVER (PUT /stores/{id}/feature-flags), not a SQL insert: that
# endpoint is deny-closed on the shared catalog, so a typo'd or withheld key is REFUSED here rather
# than silently persisted as a switch that does nothing.
#
# StoreHoursChange is armed here with the other two kinds, and it is the one that most needs to be:
# it is the only kind with NO staging path except live chat — no MCP tool and no HTTP route stages
# it — so a walker who has to arm it by hand discovers that at the point where the closure case was
# supposed to happen. Its flag is a declared catalog entry
# (`AssistantActionFlags.Declared`, module "Assistant"), so the deny-closed PUT accepts it and the
# read-back below is a real measurement rather than an assumption.
FLAG_FAIL=0
for FLAG in Assistant.Module Assistant.Actions Assistant.Actions.MenuPriceChange Assistant.Actions.DiscountCreate Assistant.Actions.StoreHoursChange; do
  OUT=$(api PUT "/stores/$STORE_ID/feature-flags" \
    "$(jq -nc --arg k "$FLAG" '{flagKey:$k, enabled:true, note:"ask-demo"}')")
  EFFECTIVE=$(printf '%s' "$OUT" | jq -r '.effective // empty' 2>/dev/null)
  if [ "$EFFECTIVE" = "true" ]; then
    printf '   flag %-38s on\n' "$FLAG"
  else
    printf '   flag %-38s REFUSED: %s\n' "$FLAG" "$(printf '%s' "$OUT" | head -c 200)"
    FLAG_FAIL=1
  fi
done
if [ "$FLAG_FAIL" = 0 ]; then
  ok "all five flags report effective=true (read back from the server, not assumed)"
else
  bad "at least one flag did not resolve on -- the assistant will answer but never propose"
fi

# ==================================================================== STEP 4: something to sell ==
act "STEP 4  give the assistant something worth repricing"
# "Raise all pizzas 25%" needs pizzas. `amount` is DERIVED server-side from wholeAmount +
# fractionAmount; posting `amount` directly is silently ignored and lands a 0-price dish, which then
# reads downstream as "this dish has no menu price" -- so each one is verified after it is created.
mkdish() { # mkdish NAME KRONER ORE
  OUT=$(api POST "/Products" "$(jq -nc --arg n "$1" --argjson s "$STORE_ID" --argjson w "$2" --arg f "$3" \
    '{storeId:$s, name:$n, currency:"NOK", wholeAmount:$w, fractionAmount:$f, tax:15, hide:false}')")
  GOT=$(printf '%s' "$OUT" | jq -r '.amount // empty')
  if [ "$GOT" = "$2$3" ]; then
    printf '   %-28s kr %s,%s\n' "$1" "$2" "$3"
    return 0
  fi
  printf '   %-28s NOT CREATED: %s\n' "$1" "$(printf '%s' "$OUT" | head -c 160)"
  return 1
}
DISH_FAIL=0
mkdish "Pizza Margherita" 189 "00" || DISH_FAIL=1
mkdish "Pizza Capricciosa" 219 "00" || DISH_FAIL=1
mkdish "Pizza Bryggen"     245 "00" || DISH_FAIL=1
# Deliberately NOT a pizza. It is here so the walk can show that a scoped instruction changed three
# rows and left this one alone -- a reprice that hit everything would look identical on a menu where
# everything is a pizza.
mkdish "Tiramisu"          95  "00" || DISH_FAIL=1
if [ "$DISH_FAIL" = 0 ]; then
  ok "four dishes on the menu: three pizzas and one that must NOT move"
else
  bad "at least one dish was not created -- the reprice walk will be thinner than the runbook says"
fi

# ==================================================================== STEP 5: a week to close ====
act "STEP 5  give the assistant a week it can actually change"
# RUNBOOK § 4 closes Mondays, and a closure is only a CHANGE if the day is open to begin with. A store
# with no OpeningHour rows reads as closed on every weekday -- the hours executor treats a missing
# weekday as closed -- so "vi holder stengt på mandager" would be refused as a no-op, no card would
# appear, and the most important walk in the runbook would dead-end looking like a broken feature.
# Nothing else seeds these: the world builder does not, and neither did this script until it had a
# walk that needed them.
HOURS=$(jq -nc '{openingHours: [range(0;7) | {dayOfWeek: ., open: true, openingTime: "11:00", closingTime: "22:00"}]}')
api PUT "/stores/$STORE_ID/openinghours" "$HOURS" >/dev/null 2>&1
OPEN_DAYS=$(api GET "/stores/$STORE_ID" | jq '[.openingHours[]? | select(.open == true)] | length' 2>/dev/null)
if [ "$OPEN_DAYS" = "7" ]; then
  ok "seven days open 11:00-22:00 (read back), so closing Monday is a real change"
else
  bad "opening hours did not read back as seven open days (got: ${OPEN_DAYS:-nothing}).
         RUNBOOK § 4 would be refused as a no-op, because a store with no hours is already
         closed every day -- which looks identical to the feature being broken."
fi

# ==================================================================== STEP 6: the admin web ======
act "STEP 6  the admin web"
if [ -n "${NO_WEB:-}" ]; then
  skip "not starting the web (NO_WEB is set)" "nothing; this was asked for"
elif [ "$HAS_NPM" = 1 ] && [ "$HAS_NODE_MODULES" = 1 ] && [ "$HAS_CORE" = 1 ]; then
  printf '   starting: API_BASE_URL=%s PORT=%s npm run dev\n' "$API_BASE" "$WEB_PORT"
  printf '   (foreground -- Ctrl-C stops it; the API keeps running)\n\n'
  cat <<EOF
---------------------------------------------------------------------------
  Sign in at  http://localhost:$WEB_PORT/admin      $MANAGER_PHONE / $MANAGER_CODE
  Then open   http://localhost:$WEB_PORT/admin/assistant

  The walk is in $WEB_SRC/scripts/ask-demo/RUNBOOK.md
---------------------------------------------------------------------------
EOF
  cd "$WEB_SRC" || exit 1
  API_BASE_URL="$API_BASE" PORT="$WEB_PORT" npm run dev
else
  MISSING=""
  [ "$HAS_NPM" = 1 ] || MISSING="$MISSING npm"
  [ "$HAS_NODE_MODULES" = 1 ] || MISSING="$MISSING node_modules"
  [ "$HAS_CORE" = 1 ] || MISSING="$MISSING core/"
  skip "the admin web was not started (missing:$MISSING)" \
       "start it yourself with:
             cd $WEB_SRC && API_BASE_URL=$API_BASE PORT=$WEB_PORT npm run dev
         then sign in at http://localhost:$WEB_PORT/admin as $MANAGER_PHONE / $MANAGER_CODE"
fi

printf '\n===============================================================\n'
printf '  passed: %s   failures: %s   skipped for absent inputs: %s\n' "$PASS" "$FAIL" "$SKIPPED"
printf '===============================================================\n'
[ "$FAIL" -gt 0 ] && exit 1
[ "$SKIPPED" -gt 0 ] && exit 3
exit 0
