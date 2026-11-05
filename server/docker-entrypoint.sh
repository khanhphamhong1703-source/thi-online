#!/bin/sh
set -e

npx prisma db push --skip-generate
node prisma/seed.js
exec node src/server.js
