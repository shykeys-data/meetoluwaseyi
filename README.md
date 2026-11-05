# meetoluwaseyi.com

Personal site of Oluwaseyi Oshunwusi: community manager, business developer and data analyst.
React (server-rendered) + Express + Node.js + MySQL. Two moods: playful (default, after a short intro on
the first visit) and serious.

## Run locally
Needs Node 20.10+ and a MySQL database.
```
npm install
cp .env.example .env        # set DATABASE_URL to your local MySQL
npm run build && node dist/jobs/cli.js seed
npm run dev                 # http://localhost:3000
```

## Checks
```
npm run check               # lint, format, typecheck, unit tests
TEST_DATABASE_URL=mysql://root:root@127.0.0.1:3306/test npm test   # + MySQL integration tests
npm run build && npm run test:e2e                                    # browser tests
```

## Layout
```
src/shared      validation rules and types used by both sides
src/server      Express app, routes → services → SQL, jobs CLI
src/web         React: pages (logic), mockup (views generated from the approved design), admin
e2e             Playwright tests
deploy          pull-based deploy script for the host
docs            plan and architecture decisions (docs/adr)
```

See `docs/PLAN.md` for status and `RUNBOOK.md` for operations.
