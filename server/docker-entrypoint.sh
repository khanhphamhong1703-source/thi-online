#!/bin/sh
set -e

attempt=1
until npx prisma db push --skip-generate; do
  if [ "$attempt" -ge 30 ]; then
    echo "Không thể đồng bộ schema sau 30 lần thử." >&2
    exit 1
  fi
  attempt=$((attempt + 1))
  sleep 2
done
node prisma/seed.js
exec node src/server.js
