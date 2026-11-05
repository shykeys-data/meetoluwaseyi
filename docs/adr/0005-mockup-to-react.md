# ADR-0005: Generating page markup from the approved mockup

**Status:** Accepted, 5 Nov 2026

## Context

The approved mockup is about 390 KB of hand-tuned markup and CSS across 8 pages. Re-typing it into React
would take weeks and drift from what was approved.

## Decision

`scripts/dc2jsx.py` converts each mockup page into a typed React view (`src/web/mockup/*View.tsx`) and
extracts its CSS (`page-css.ts`). Logic and real data live in hand-written page files
(`src/web/pages/*`). A short, explicit list of patches (mode links, the chat's email field) is applied by
the script, so re-running it keeps them.

## Consequences

- The site matches the mockup closely, including motion and reduced-motion behaviour.
- The views keep the mockup's inline styles. They are readable and editable by hand, but a future
  clean-up could move repeated styles into classes.
- Each page gets only its own CSS (inlined by the server) and only its own JavaScript chunk.
