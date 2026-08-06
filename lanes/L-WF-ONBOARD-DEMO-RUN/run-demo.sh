#!/usr/bin/env bash
# Run the Workforce demo against MY OWN SQL container, from MY OWN worktree at de0811f6.
# The other five module seeds are skipped: this lane's clause is the workforce join, and each skipped
# seed is failure surface that is not mine to carry.
set -uo pipefail

LANE=/Users/svendaneel/okam/Web-modules/lanes/L-WF-ONBOARD-DEMO-RUN
REPO=/Users/svendaneel/okam/wt-L-WF-ONBOARD-DEMO-RUN

export PATH="$HOME/.dotnet/tools:$PATH"

SQL_CONTAINER=okam-lwfodr-sql \
SQL_PORT=15437 \
SQL_SA_PASSWORD='Velkommen123!' \
DB_NAME=OkamDemoWfRun \
API_PORT=5093 \
REDIS=localhost:16379 \
LOG="$LANE/evidence/api.log" \
SKIP_MARGIN=1 SKIP_EVENTS=1 SKIP_GROWTH=1 SKIP_MEALS=1 SKIP_TRAINING=1 \
    bash "$REPO/Scripts/demo/demo-up.sh" 2>&1
echo "=== demo-up.sh exit: $? ==="
