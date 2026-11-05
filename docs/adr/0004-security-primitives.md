# ADR-0004: Security built on Node's own crypto

**Status:** Accepted, 5 Nov 2026

## Decision
- **Passwords:** scrypt (N=2^15, r=8, p=1), with parameters stored in the hash so they can be raised later.
  The brief named argon2id; argon2 needs a native module compiled on the host, which shared hosting often
  can't do. scrypt is memory-hard and on OWASP's recommended list.
- **2FA:** TOTP (RFC 6238), tested against the RFC's own vectors. The secret is encrypted at rest with
  AES-256-GCM using a key derived from SESSION_SECRET, so a database leak alone can't produce codes.
- **Sessions:** an HMAC-signed, httpOnly, SameSite=Strict cookie, checked against `session_version` in the
  database on every admin request, so logging out ends every session at once.
- **CSRF:** a per-session token required in a header on every admin write.
- **Privacy:** IPs are never stored, only a salted HMAC.

## Consequences
No native dependencies and nothing to compile on the host; fewer packages to trust.
