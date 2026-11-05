# Implementation plan

The six phases from the developer brief, with what is built, how it is checked, and what still needs a
person. A phase is done when every box is ticked on staging.

## Phase 1 · Project architecture
Built: single-package repo (ADR-0001), TypeScript strict, ESLint, Prettier, Vitest, Playwright, config
checked with Zod at start-up (refuses to start when anything required is missing), dev defaults so a
fresh clone runs, CI on every push, Dependabot weekly.
- [x] CI: install, lint, format, typecheck, unit + MySQL integration tests, build, smoke test, browser tests, audit
- [ ] Staging serves behind its password (needs the staging app created on the host)

## Phase 2 · Database and schema
Built: MySQL tables `profile`, `projects`, `project_slug_history`, `messages`, `admins`, `settings`
with unique slug, unique repo id, listing and inbox indexes (ADR-0002). Idempotent seed from the mockup
content; refuses production without `--force`.
- [x] Duplicate slug and bad email rejected (tests)
- [x] Seed twice gives identical results (test)
- [ ] Backup restore drill on staging (JetBackup, monthly)

## Phase 3 · Backend API
Built: `/api/v1` routes → services → SQL. One response shape. Contact (validate, honeypot, Turnstile,
rate limits, save, then email + WhatsApp in the background with retries, failures recorded on the message).
Admin auth with password + TOTP, lockout after 5 failures, session version, CSRF. Projects CRUD with slug
history and 301s, profile update, messages inbox with CSV export, signed Cloudinary uploads, GitHub sync
with ETag, Cloudflare purge, `/healthz`, `/readyz`, `sitemap.xml`, `robots.txt`, `llms.txt`.
- [x] Good input, bad input and unauthorised access tested per endpoint group
- [x] Sixth wrong password locked; old slug 301s (tests)
- [ ] Real email and WhatsApp alert received on staging (needs Resend and Meta keys)

## Phase 4 · Frontend
Built: every mockup page as React (ADR-0005), both modes, the playful intro first on a first visit, then
the playful home. Real contact form with every state; Privacy, Thanks, 404 and 500 pages; admin
(login with 2FA, dashboard, projects with image upload, profile, inbox). Per-page JS chunks: the playful
home ships about 82 KB gzipped; validation rules load only on submit.
- [x] No console errors, no hydration warnings, one H1, no sideways scroll at 390 and 1440 px
- [ ] Lighthouse mobile on staging: Performance 90+, Accessibility 100, SEO 100
- [ ] Side-by-side check against the mockup on a real phone

## Phase 5 · Connecting front and back end
Built: Express reads the mode cookie, calls services directly, renders React with the data, embeds it
for hydration. Mode cookie + localStorage, synced across tabs. `?mode=` and `?intro=1`. Contact works
with JavaScript off.
- [x] Playwright: intro at 10:00 and 21:00, return visit, `?mode=serious`, mode carries across pages and
      tabs, contact success/errors/no-JS, admin 2FA login and publish, 404 in both modes

## Phase 6 · Security and production
Built: Helmet with a nonce-based CSP, HSTS, frame-ancestors none, Referrer-Policy, Permissions-Policy
(camera, microphone, location off). 50 KB body cap, rate limits (300/min everywhere, contact 5/15 min and
20/day, login 5/15 min), structured JSON logs with emails/IPs masked, graceful shutdown, pull-based deploy
with automatic rollback (ADR-0003), RUNBOOK.md.
- [ ] securityheaders.com A+, Mozilla Observatory A, SSL Labs A+ (after DNS on Cloudflare)
- [ ] UptimeRobot on `/healthz` and `/readyz`
- [ ] Sentry (optional, needs a DSN)

## Needs Oluwaseyi
1. Create the two Node.js apps and databases on the host (staging first).
2. Keys when ready: Resend, WhatsApp Cloud API, Cloudflare Turnstile, Cloudinary, Cloudflare API token.
3. Booking tool (Cal.com or Calendly) and the Safety Bot write-up.
