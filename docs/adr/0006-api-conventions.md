# 0006: API conventions

## Status

Accepted (2026-11-07)

## Context

The API serves one site and one admin, both ours. It still needs a written contract so changes stay
deliberate, and a check in CI so the contract and the code don't drift apart.

## Decision

- **Contract:** `docs/openapi.yaml` (OpenAPI 3.1), linted in CI with Redocly's recommended rules.
- **Versioning:** everything under `/api/v1`. A breaking change ships as `/api/v2`; v1 keeps working
  for at least 6 months and sends a `Deprecation` header. Adding optional fields is not breaking.
- **Names:** camelCase in JSON; plural nouns in paths; no verbs except the two actions that aren't
  resources (`/admin/projects/reorder`, `/admin/github/sync`).
- **Success:** `{ "data": ... }`. Paged lists add `{ "page": { "next": cursor | null } }`.
- **Paging:** keyset (`before=<id>`, newest first), not offset, so pages stay correct while new
  messages arrive and each page is one index range scan. The public project list is not paged: it is
  a short, curated list rendered in full on /work.
- **Errors:** `{ "error": { "code", "message", "fields"? } }` with the right HTTP status.

## Alternatives considered

- **RFC 7807 problem+json for errors.** It carries the same facts (status, stable type, human detail,
  field errors) under different names. Switching would change every client for no gain in safety or
  clarity on a single-owner API, so we keep our shape and document its stable `code` values instead.
  If the API ever opens to third parties, v2 adopts RFC 7807.
- **Offset paging.** Simpler, but skips or repeats rows when new messages arrive between pages, and
  gets slower as the offset grows.

## Consequences

- The spec has to change in the same commit as the route; review checks both.
- The admin inbox loads 50 at a time with "Show older messages".
