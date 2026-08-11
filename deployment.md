# SGS Test Platform — Step-by-Step Deployment Guide

---

## Prerequisites

Install these tools before starting:

```bash
# Node.js 20+
node --version   # must be v20 or higher

# Wrangler CLI (Cloudflare)
npm install -g wrangler

# Authenticate with Cloudflare
wrangler login
```

You also need:
- A **Cloudflare account** (free tier works)
- A **Supabase account** (free tier works) → https://supabase.com

---

## Overview

```
Step 1 → Create D1 database
Step 2 → Deploy the CF Worker (API)
Step 3 → Set up Supabase (auth)
Step 4 → Deploy the CF Pages dashboard
Step 5 → Add your first app via the form
Step 6 → (Optional) Wire up CI/CD auto-trigger
```

---

## Step 1 — Create the D1 Database

```bash
cd sgs-test-platform/worker

# Install worker dependencies
npm install

# Create the D1 database
wrangler d1 create sgs-tests
```

You will see output like:

```
✅ Successfully created DB 'sgs-tests'
[[d1_databases]]
binding = "DB"
database_name = "sgs-tests"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"   ← copy this
```

Open `worker/wrangler.toml` and paste the `database_id`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "sgs-tests"
database_id = "PASTE_YOUR_ID_HERE"         # ← replace this line
```

Apply the schema to the database:

```bash
# Local (for dev)
wrangler d1 execute sgs-tests --file=../schema.sql

# Remote (production — run this one)
wrangler d1 execute sgs-tests --remote --file=../schema.sql
```

Expected output:

```
🌀 Executing on remote database sgs-tests ...
✅ Successfully executed 6 statements
```

---

## Step 2 — Deploy the CF Worker

Still inside `sgs-test-platform/worker/`:

### 2a — Set the ingest token

This token protects all write routes (create apps, trigger tests, push CI results).
It is stored in Cloudflare Secrets Store and bound to the worker via `wrangler.toml`.

```toml
[[secrets_store_secrets]]
binding = "INGEST_TOKEN"
store_id = "2556bcd9458349f6b4ff2a3fc93bdba1"
secret_name = "INGEST_TOKEN"
```

Make sure the secret `INGEST_TOKEN` exists in your Cloudflare Secrets Store
(store ID `2556bcd9458349f6b4ff2a3fc93bdba1`) before deploying.

### 2b — Update the dashboard origin (do this after Step 4 once you know your Pages URL)

Open `worker/wrangler.toml` and update:

```toml
[vars]
DASHBOARD_ORIGIN = "https://tests.stellarglobalsupplies.com"   # ← update after Step 4
```

### 2c — Deploy

```bash
npm run deploy
```

You will see:

```
✅ Deployed sgs-test-api
   https://sgs-test-api.YOUR_SUBDOMAIN.workers.dev
```

**Save this URL** — you need it in Step 4.

### 2d — Verify the worker is live

```bash
curl https://sgs-test-api.YOUR_SUBDOMAIN.workers.dev/health
# Expected: {"ok":true,"ts":1234567890}
```

---

## Step 3 — Set Up Supabase

### 3a — Create a project

1. Go to https://supabase.com → **New project**
2. Choose a name (e.g. `sgs-test-platform`), set a strong DB password, pick a region
3. Wait ~2 minutes for the project to spin up

### 3b — Disable public sign-ups

You do NOT want anyone to be able to create an account.

1. In your Supabase project → **Authentication** → **Providers**
2. Click **Email**
3. Toggle **Enable email confirmations** → OFF (makes login easier for internal tools)
4. Toggle **Allow new users to sign up** → **OFF**
5. Click **Save**

### 3c — Create user accounts manually

For each person who needs dashboard access:

1. Go to **Authentication** → **Users**
2. Click **Add user** → **Create new user**
3. Enter their email and a temporary password
4. Click **Create user**

Repeat for every team member.

### 3d — Get your Supabase credentials

Go to **Project Settings** → **API**:

- Copy **Project URL** → looks like `https://abcdefgh.supabase.co`
- Copy **anon public** key → long JWT string starting with `eyJ...`

**Save both** — needed in Step 4.

---

## Step 4 — Deploy the CF Pages Dashboard

```bash
cd sgs-test-platform/dashboard
npm install
```

### 4a — Create your local env file

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in all four values:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...YOUR_ANON_KEY...
VITE_WORKER_URL=https://sgs-test-api.YOUR_SUBDOMAIN.workers.dev
VITE_INGEST_TOKEN=YOUR_INGEST_TOKEN_FROM_STEP_2
```

### 4b — Build and deploy

```bash
npm run build
npm run deploy
```

Wrangler will ask you to create a new Pages project on first run:

```
? Create a new project? Yes
? Project name: sgs-tests
? Production branch: main
```

You will see:

```
✅ Successfully deployed!
   https://tests.stellarglobalsupplies.com
```

**Save this URL.**

### 4c — Add environment variables in Cloudflare dashboard

The `VITE_*` variables must also be set in Cloudflare so future deployments
(via `npm run deploy` or GitHub Actions) pick them up automatically.

1. Go to https://dash.cloudflare.com
2. **Pages** → **sgs-tests** → **Settings** → **Environment variables**
3. Under **Production**, add all four:

   | Variable name          | Value                          |
   |------------------------|--------------------------------|
   | `VITE_SUPABASE_URL`    | your Supabase project URL      |
   | `VITE_SUPABASE_ANON_KEY` | your Supabase anon key       |
   | `VITE_WORKER_URL`      | your worker URL from Step 2    |
   | `VITE_INGEST_TOKEN`    | your ingest token from Step 2  |

4. Click **Save**

### 4d — Update the worker's allowed origin (back to Step 2)

Now that you have the Pages URL, update the worker:

```bash
cd sgs-test-platform/worker
```

Open `wrangler.toml` and set:

```toml
[vars]
DASHBOARD_ORIGIN = "https://tests.stellarglobalsupplies.com"
```

Redeploy the worker:

```bash
npm run deploy
```

### 4e — Verify the dashboard

Open https://tests.stellarglobalsupplies.com in your browser.

You should see the SGS login screen. Log in with one of the Supabase users
you created in Step 3c.

---

## Step 5 — Add Your First Application

Once logged in to the dashboard:

1. Click the **Applications** tab (top nav)
2. Click **Add application**
3. Fill in the form:

   **App Details**
   - Name: `sgs-portal` (or whatever your app is called)
   - Environment: `production`

   **① Page Up**
   - URL: `https://your-app.pages.dev`

   **② Worker Up**
   - Worker Base URL: `https://your-app-api.YOUR_SUBDOMAIN.workers.dev`
   - *(Your worker must have a `GET /health` route that returns `{ "ok": true }`)*

   **③ API Routes** — add each route you want to check:
   - `/health` → `200`
   - `/runs` → `200`
   - `/nonexistent` → `404`

   **④ Auth Test** — toggle ON if needed:
   - Login URL: `https://YOUR_PROJECT.supabase.co/auth/v1/token?grant_type=password`
   - Body fields: `email: testuser@example.com`, `password: testpassword`
   - Expected JSON key: `access_token`
   - Expected status: `200`

4. Click **Create app**
5. Click **Run now** on the app card — results appear immediately

---

## Step 6 — (Optional) CI/CD Auto-Trigger After Deployment

If you want tests to run automatically after every Cloudflare deployment:

### 6a — Add GitHub secrets

In your GitHub repository → **Settings** → **Secrets and variables** → **Actions**:

| Secret name            | Value                                         |
|------------------------|-----------------------------------------------|
| `WORKER_URL`           | `https://sgs-test-api.YOUR_SUBDOMAIN.workers.dev` |
| `INGEST_TOKEN`         | your ingest token from Step 2                 |
| `TEST_LOGIN_EMAIL`     | test account email for auth test              |
| `TEST_LOGIN_PASSWORD`  | test account password                         |

### 6b — Make sure the workflow file is in your repo

The file `.github/workflows/post-deploy-tests.yml` is already included
in the `test-runner/` folder. Copy it to your main app repo:

```bash
cp sgs-test-platform/.github/workflows/post-deploy-tests.yml \
   YOUR_APP_REPO/.github/workflows/post-deploy-tests.yml
```

This workflow fires automatically on `deployment_status: success` events,
which Cloudflare Pages/Workers triggers via the GitHub integration.

### 6c — Onboard the app in apps.config.ts

Edit `test-runner/apps.config.ts` to match what you set up in Step 5.
The test runner uses this config when triggered from CI.

### 6d — Manual trigger from GitHub

You can also run tests manually:

1. Go to your repo on GitHub
2. **Actions** → **Post-Deploy Tests**
3. Click **Run workflow**
4. Optionally enter a specific app name to test just one
5. Click **Run workflow**

---

## Quick Reference

| Thing                  | Where to find it                                          |
|------------------------|-----------------------------------------------------------|
| Worker URL             | `wrangler deploy` output / Cloudflare Workers dashboard   |
| D1 database ID         | `wrangler d1 create` output / `wrangler.toml`            |
| Supabase URL + key     | Supabase → Project Settings → API                        |
| Dashboard URL          | `npm run deploy` output / Cloudflare Pages dashboard      |
| Add/manage test users  | Supabase → Authentication → Users                        |
| View logs              | `wrangler tail` (worker) / Cloudflare Pages logs          |

---

## Troubleshooting

**Login fails on dashboard**
- Check Supabase URL and anon key in `.env.local` and CF Pages env vars
- Make sure the user exists in Supabase → Authentication → Users
- Make sure sign-ups are disabled (not the same as users not existing)

**"Unauthorized" when triggering a test**
- `VITE_INGEST_TOKEN` in the dashboard env must match the `INGEST_TOKEN` secret in the Cloudflare Secrets Store

**CORS errors in browser console**
- `DASHBOARD_ORIGIN` in `worker/wrangler.toml` must exactly match your Pages URL (no trailing slash)
- Redeploy the worker after changing it

**Worker /health returns 404**
- Your app's own worker must implement `GET /health` returning `{ "ok": true }`
- The sgs-test-api worker already has this; your *app's* worker needs it too

**D1 errors on first deploy**
- Run `wrangler d1 execute sgs-tests --remote --file=schema.sql` again
- Make sure `database_id` in `wrangler.toml` matches the one from `wrangler d1 create`

**Test results not appearing on dashboard**
- Check the worker logs: `wrangler tail --name sgs-test-api`
- Make sure the test runner is using the correct `WORKER_URL` and `INGEST_TOKEN`
