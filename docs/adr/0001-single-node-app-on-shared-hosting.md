# ADR-0001: One Node.js app on the existing shared host

**Status:** Accepted, 5 Nov 2026

## Context
The site has one owner, a handful of pages, a contact form and a small admin. Oluwaseyi already pays for
hosting at genuss.ng (DirectAdmin with CloudLinux "Setup Node.js App"), which offers Node.js up to 20.10,
MySQL databases, cron jobs and file management, but no SSH access.

## Decision
Run one Express app that server-renders the React pages and serves the API, on the existing host,
behind Cloudflare. Staging (staging.meetoluwaseyi.com) and production are two apps on the same account,
each with its own database.

## Alternatives considered
- **A VPS or container platform:** more control, but another bill and more to maintain.
- **Static site + serverless functions:** cheap, but splits the code and the admin across services.
- **Next.js:** good SSR, but its newer versions need Node 18.18+ features and a heavier runtime than the
  host's Node app manager handles well; plain Express + React SSR is smaller and easier to reason about.

## Consequences
- Node 20.10 is the ceiling, so tooling is pinned to versions that support it (Vite 6, not 7).
- The host starts apps with `require()`, so `app.cjs` hands over to the ES module build.
- No SSH means deploys are pulled by the server (ADR-0003).
