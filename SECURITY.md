## Security Policy

### Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | Yes                |
| < 1.0   | No                 |

### Reporting a Vulnerability

If you discover a security vulnerability in R2 Drive, please report it responsibly.

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, please email the maintainer directly or use
[GitHub's private vulnerability reporting](https://github.com/saurabhdiwate/r2-drive/security/advisories/new)
if available.

You should receive a response within 7 days. If the vulnerability is confirmed,
a fix will be prioritized and released as a patch update.

### Security Model

R2 Drive is designed with the following security controls:

#### Credentials

- All Cloudflare R2 credentials (`CLOUDFLARE_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
  `R2_SECRET_ACCESS_KEY`) are kept **server-side only**. They are never exposed
  to the browser bundle or client-side code.
- Credentials are injected at runtime via environment variables and never
  committed to the repository.

#### Authentication

- Single admin account with bcrypt password hashing (cost factor 12).
- HMAC-SHA256 signed session cookies with `HttpOnly`, `SameSite=lax`, and
  `Secure` (in production) attributes.
- Configurable session duration (default: 7 days).
- In-memory rate limiting on failed login attempts (per IP + username).

#### Authorization

- All API routes (except `/api/health`) require an authenticated session.
- Session verification occurs server-side on every request.
- UI controls are backed by server-side authorization, not client-side hiding.

#### CSRF Protection

- Every state-changing API route validates the `Origin`/`Host` header as a
  defense-in-depth measure alongside `SameSite=Lax` cookies.

#### Path Safety

- User-supplied object keys and names are validated using `assertSafeKey` and
  `assertSafeName` to prevent path traversal attacks.
- Destructive operations (delete, move, copy) validate inputs before execution.

#### Presigned URLs

- Upload and download URLs are short-lived presigned URLs with configurable
  expiry (default: 1 hour for uploads, 30 minutes for downloads).
- The server generates signed URLs; the browser transfers file bytes directly
  to/from R2 without passing through the Next.js server.

#### Content Security

- Markdown previews are sanitized with DOMPurify before rendering.
- No user-controlled content is rendered as raw HTML.

#### Error Handling

- API error responses provide useful messages without exposing:
  - Credentials or secret keys
  - Internal stack traces
  - Sensitive infrastructure details

### Responsible Disclosure

We ask that you:

1. Give us reasonable time to investigate and address the issue before public
   disclosure.
2. Do not access or modify data that does not belong to you.
3. Do not exploit the vulnerability beyond what is necessary to demonstrate it.

### Scope

This security policy applies to the R2 Drive application code in this
repository. It does not cover:

- Cloudflare R2 infrastructure (covered by Cloudflare's security)
- Third-party dependencies (monitored via Dependabot and CodeQL)
- Deployment infrastructure (your responsibility to secure)
