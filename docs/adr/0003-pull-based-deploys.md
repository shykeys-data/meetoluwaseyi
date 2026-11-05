# ADR-0003: Pull-based deploys from a release branch

**Status:** Accepted, 5 Nov 2026

## Context
The host has no SSH and the workspace that writes the code cannot install packages. GitHub Actions can.

## Decision
GitHub Actions installs, lints, type-checks, tests (unit, MySQL integration, browser end-to-end), builds,
and pushes the built release to `deploy/staging` (every push to `dev`) or `deploy/production` (version tags,
after approval). A cron job on the server runs `deploy/pull.sh` every 5 minutes: when the version changes it
installs runtime packages, migrates, restarts, checks `/readyz`, and rolls back if the check fails.

## Alternatives considered
- **FTP from CI:** needs the hosting password stored in GitHub.
- **Manual uploads in the file manager:** slow and easy to get wrong.

## Consequences
- No server credentials live in GitHub. The repo is public; secrets live only in the host's settings.
- A deploy lands within about 5 minutes of CI finishing.
- Rollback is automatic on a failed health check, or manual by re-tagging an older release.
