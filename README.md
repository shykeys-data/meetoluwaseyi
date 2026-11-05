# meetoluwaseyi.com

Personal brand site for **Oluwaseyi Oshunwusi**: Web3 community & growth, business development, data, and building.
One site, two moods: **playful** (the front door for everyone) and **serious** (one tap away).

The full specification is the developer brief; the visual reference is the animated mockup. This repo follows the
brief's six-phase build plan. **Current phase: 1 · Project architecture setup.**

## Stack

npm workspaces monorepo, Node 22 LTS, TypeScript (strict).

| Package           | What it is                                                                                    |
| ----------------- | --------------------------------------------------------------------------------------------- |
| `apps/server`     | Express 5: REST API under `/api/v1` (Phase 3) and server rendering of the React pages         |
| `apps/web`        | React 19 + Vite, React Router (library mode), plain CSS with two theme token files            |
| `packages/shared` | Zod schemas and types used by both sides, so validation rules are written once                |

No UI kit, no CSS framework, no meta-framework. New dependencies need a reason in the pull request.

## Run it locally

```bash
nvm use            # Node 22
npm install
npm run dev        # http://localhost:3000, with hot reload
```

No `.env` is needed for development: safe local defaults are built in. To override anything, copy
`.env.example` to `.env`.

## Scripts

| Command                | Does                                                         |
| ---------------------- | ------------------------------------------------------------ |
| `npm run dev`          | Server + Vite in one process, hot reload                     |
| `npm run build`        | Builds the web app (client + server render) and the server   |
| `npm start`            | Runs the production build                                    |
| `npm run check`        | Lint, formatting, typecheck and tests (what CI runs first)   |
| `npm test`             | Vitest                                                       |

A pre-commit hook runs lint and typecheck.

## Environments

| Environment | Address                             | Notes                                              |
| ----------- | ----------------------------------- | -------------------------------------------------- |
| local       | http://localhost:3000               | defaults built in                                  |
| staging     | https://staging.meetoluwaseyi.com   | password-protected, `noindex`, its own database    |
| production  | https://meetoluwaseyi.com           | deployed only from a tagged release that passed staging |

Configuration is checked at start-up (`apps/server/src/config.ts`). On staging and production the app **refuses
to start** if a required variable is missing or malformed, and prints every problem at once.

## Branches and CI

`main` is production, `dev` is staging. Every push and pull request runs: install, lint, format check, typecheck,
tests, build and `npm audit` (fails on high severity). Pushes to `dev` deploy to staging and run a smoke test once
the staging host is configured (see `.github/workflows/ci.yml`).

## Phase 1 checklist (from the brief)

- [ ] A fresh clone runs locally with `npm install && npm run dev`
- [ ] CI is green on the empty app, and a broken lint or test blocks the merge
- [ ] Staging serves a page behind its password, and the app refuses to start with a missing variable
