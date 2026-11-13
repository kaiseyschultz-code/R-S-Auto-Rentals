#!/usr/bin/env bash
# Applies supabase/migrations + seed to a throwaway Postgres 17 container
# (with a small shim standing in for Supabase's auth schema and roles),
# then runs checks.sql. Each check's label says what result to expect.
# Needs Docker running. Usage: bash db-tests/run.sh
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"; ROOT="$HERE/.."
NAME=rs-crm-test
docker rm -f $NAME >/dev/null 2>&1
docker run -d --name $NAME -e POSTGRES_PASSWORD=test postgres:17-alpine >/dev/null
for i in $(seq 1 30); do docker exec $NAME pg_isready -U postgres -q 2>/dev/null && break; sleep 1; done; sleep 2
run() { docker exec -i $NAME psql -U postgres -q -v ON_ERROR_STOP=1 -f - < "$1" && echo "OK   $(basename "$1")" || { echo "FAIL $(basename "$1")"; docker rm -f $NAME >/dev/null; exit 1; }; }
run "$HERE/supabase-shim.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do run "$f"; done
run "$ROOT/supabase/seed.sql"
docker exec -i $NAME psql -U postgres -f - < "$HERE/checks.sql"
docker rm -f $NAME >/dev/null
