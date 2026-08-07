# Deploying to EasyPanel

[EasyPanel](https://easypanel.io) runs Docker containers on your own VPS with a
web UI. This guide deploys **r2-drive** as an EasyPanel project from the git
repository.

## Prerequisites

- An EasyPanel instance (or the CLI) with a server that has at least 1 GB RAM.
- A git remote (GitHub, GitLab, Gitea, etc.) hosting this repository.
- Cloudflare R2 credentials:
  - Account ID (Cloudflare dashboard → your account → overview, right sidebar)
  - R2 API token with **Object Read & Write** permission
    (R2 → **Manage R2 API Tokens** → Create API token)
  - A bucket (the app lists all accessible buckets at runtime).

## 1. Generate your secrets

On any machine with this repo checked out:

```bash
npm install
node scripts/hash-password.mjs -- "your-strong-password"   # → APP_PASSWORD_HASH
node scripts/generate-secret.mjs                           # → SESSION_SECRET
```

EasyPanel passes values straight to the container as real environment variables,
so the **raw** bcrypt hash is used (no `\$` escaping needed).

## 2. Create the project

1. In EasyPanel, click **New Project** and give it a name (e.g. `r2-drive`).
2. Click **New Service** → **Image or build from source** → **Build from source**.
3. Fill in:
   - **Type**: `Dockerfile`
   - **Git repository**: your repo URL
   - **Branch**: the branch to deploy (e.g. `main`)
   - **Build mode**: `Standard`
4. In the **General** tab, set:
   - **Port**: `3000`
   - (Optional) Enable **HTTPS** — recommended. The session cookie is marked
     `Secure` in production and requires HTTPS. If you intentionally serve plain
     HTTP, add `COOKIE_SECURE=false` under **Environment**.

## 3. Environment variables

In the service's **Environment** tab, add:

| Variable                | Required | Value                                                                 |
| ----------------------- | :------: | --------------------------------------------------------------------- |
| `NODE_ENV`              |  yes     | `production`                                                          |
| `APP_USERNAME`          |  yes     | your login username                                                   |
| `APP_PASSWORD_HASH`     |  yes     | the raw bcrypt hash (starts with `$2b$...`)                           |
| `SESSION_SECRET`        |  yes     | the 64-character secret from `generate-secret.mjs`                    |
| `CLOUDFLARE_ACCOUNT_ID` |  yes*    | your Cloudflare account ID                                            |
| `R2_ACCESS_KEY_ID`      |  yes*    | your R2 access key                                                   |
| `R2_SECRET_ACCESS_KEY`  |  yes*    | your R2 secret key                                                   |
| `R2_ENDPOINT`           |  no      | custom endpoint (defaults to `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`) |
| `COOKIE_SECURE`         |  no      | set to `false` **only** when serving plain HTTP (not recommended)     |

\* Required for R2 access; without them the app runs but shows a "not
configured" state in **Settings**.

> Tip: set `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY` as **Secrets** in
> EasyPanel (the "lock" icon) so they are stored encrypted.

## 4. Deploy

Click **Deploy**. EasyPanel clones the repo, runs the multi-stage `Dockerfile`
(dependencies → build → slim runtime as a non-root user), and starts the app.

Open the generated domain/URL and log in with your `APP_USERNAME` and the
password you hashed.

## 5. Verify

- You see the dashboard after logging in.
- **Settings → Cloudflare R2 connection** shows *Configured*, a valid connection,
  and one or more accessible buckets. If not, click **Test connection** to see
  the error.

## Updates

Push to the configured branch, then click **Update / Redeploy** in EasyPanel.
The container rebuilds and restarts. Change `APP_*` values and redeploy to
rotate credentials.

## Troubleshooting

| Symptom | Likely cause / fix |
| --- | --- |
| Login fails with "Invalid username or password" | Wrong `APP_PASSWORD_HASH` or password. Regenerate the hash with `scripts/hash-password.mjs`. |
| Cookie not persisted / login loop | Served over plain HTTP without `COOKIE_SECURE=false`, or HTTPS wasn't enabled so the Secure cookie is dropped. Enable HTTPS. |
| Settings shows missing `CLOUDFLARE_ACCOUNT_ID` | Not set in Environment, or you used `R2_ACCOUNT_ID` (the app reads `CLOUDFLARE_ACCOUNT_ID`). |
| R2 connection invalid | Token lacks Object Read & Write permission, or the account ID/endpoint is wrong. Click **Test connection** for the error. |
