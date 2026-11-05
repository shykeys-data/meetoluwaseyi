# ADR-0002: MySQL on the host instead of MongoDB Atlas

**Status:** Accepted, 5 Nov 2026 (decided by Oluwaseyi)

## Context

The brief planned MongoDB Atlas. Atlas needs a separate account, the free tier has no backups, and shared
hosts often block outgoing connections to port 27017. The host includes MySQL at no extra cost, covered
by its JetBackup backups.

## Decision

Use MySQL on the same host via `mysql2`, with hand-written SQL and `?` placeholders for every value.
Flexible parts of the content (the profile, case studies, project links) are JSON columns validated by the
shared Zod schemas, so the shape is still checked in one place.

## Alternatives considered

- **MongoDB Atlas:** keeps the "MERN" label; adds an account, a network dependency and a backup gap.
- **An ORM (Prisma, Drizzle):** convenient, but adds a build step and engine binaries for five tables.

## Consequences

- The stack is React, Express and Node with MySQL, the same family as Korrect Cars.
- Migrations are plain SQL in `src/server/db/migrations.ts`, applied in order and recorded.
- Both MySQL 8 and MariaDB work: JSON columns are parsed whichever form they come back in.
