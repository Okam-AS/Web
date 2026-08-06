#!/usr/bin/env bash
# Wait for the fixture port to come up during a run, then record WHICH PROCESS answered it:
# pid, cwd, command line, and the port the server itself reports through /__fixture/health.
#
# WHY: CI=1 plus a private port is not proof of isolation. The composition lane set out believing it
# was isolated and was served for its whole tier by pid 73160 (cwd /Users/svendaneel/okam/wt-jwf),
# whose api-server.js is 368 lines divergent from the composed one. A receipt that does not name the
# fixture that served it cannot be compared with any other receipt.
#
# /__fixture/health answers with the port the server is actually listening on, so it is an oracle
# that a reused foreign server cannot fake: a spec pointed at 4010 gets {"port":4010} back even when
# the run was given 4889.
PORT="$1"; OUT="$2"
for _ in $(seq 1 300); do
  if lsof -iTCP:"$PORT" -sTCP:LISTEN -P -n >/dev/null 2>&1; then
    PID=$(lsof -tiTCP:"$PORT" -sTCP:LISTEN -P -n 2>/dev/null | head -1)
    {
      echo "--- FIXTURE PROVENANCE (port $PORT) ---"
      echo "pid:     $PID"
      echo "cwd:     $(lsof -p "$PID" -a -d cwd -Fn 2>/dev/null | grep '^n' | sed 's/^n//')"
      echo "command: $(ps -o command= -p "$PID" 2>/dev/null)"
      echo "started: $(ps -o lstart= -p "$PID" 2>/dev/null)"
      echo "health:  $(curl -s -m 5 "http://127.0.0.1:$PORT/__fixture/health")"
      echo "foreign-4010 still up (never touched): $(curl -s -m 3 http://127.0.0.1:4010/__fixture/health || echo 'no answer')"
      echo "--- END FIXTURE PROVENANCE ---"
    } > "$OUT"
    exit 0
  fi
  sleep 1
done
echo "--- FIXTURE PROVENANCE: port $PORT never came up ---" > "$OUT"
