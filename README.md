# SGS Test Platform

Post-deploy automated testing for **Stellar Global Supplies** — runs on Cloudflare Workers + Pages + D1, with a Supabase-gated dashboard.

```
sgs-test-platform/
├── schema.sql              ← D1 database schema
├── worker/                 ← CF Worker: receives & serves test results
├── dashboard/              ← CF Pages: Supabase-auth dashboard
└── test-runner/            ← Node runner executed by CI after each deploy
```

---

## Architecture

```
 GitHub Actions (post-deploy)
        │
        │  POST /runs  (X-Ingest-Token)
        ▼
 CF Worker  ──► CF D1  (stores runs + results)
        │
        │  GET /runs  GET /runs/:id  GET /stats
        ▼
 CF Pages Dashboard
   (Supabase login → internal only)
```

---

## 1 — Set up D1

```bash
cd worker
npm install

# Create the database (copy the ID it prints)
npm run db:create

# Paste the database_id into worker/wrangler.toml

# Apply the schema locally (dev) and remotely (prod)
npm run db:migrate
npm run db:migrate:remote
```

---

## 2 — Deploy the Worker

```bash
# The ingest token (used by the test runner to POST results) is read
# from the Cloudflare Secrets Store via the binding in wrangler.toml

# Deploy
npm run deploy
# → prints: https://sgs-test-api.YOUR_SUBDOMAIN.workers.dev
```

Update `DASHBOARD_ORIGIN` in `worker/wrangler.toml` to your CF Pages URL before deploying to production.

---

## 3 — Set up Supabase (auth only)

1. Create a project at [supabase.com](https://supabase.com)
2. In **Authentication → Settings**, disable public sign-ups
3. Manually create user accounts under **Authentication → Users**
4. Note your **Project URL** and **anon public key**

---

## 4 — Deploy the Dashboard

```bash
cd dashboard
cp .env.example .env.local
# Fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_WORKER_URL

npm install
npm run build

# Deploy to CF Pages
npm run deploy
# → prints: https://tests.stellarglobalsupplies.com
```

Set the three `VITE_*` variables as **CF Pages environment variables** in the Cloudflare dashboard so production builds pick them up.

---

## 5 — Onboard an app

Edit `test-runner/apps.config.ts` and add a new `AppConfig`:

```ts
{
  name:        'sgs-inventory',           // shown on dashboard
  environment: 'production',
  pageUrl:     'https://inventory.stellarglobalsupplies.com',
  workerUrl:   'https://sgs-inventory-api.YOUR.workers.dev',
  apiRoutes: [
    { path: '/health' },
    { path: '/items', expectedStatus: 200 },
  ],
  loginEndpoint: {                        // optional — remove if not needed
    url:           'https://YOUR.supabase.co/auth/v1/token?grant_type=password',
    method:        'POST',
    body:          { email: process.env.TEST_LOGIN_EMAIL, password: process.env.TEST_LOGIN_PASSWORD },
    expectJsonKey: 'access_token',
  },
}
```

---

## 6 — Configure CI secrets

In your GitHub repository → **Settings → Secrets and variables → Actions**, add:

| Secret               | Value                                                 |
|----------------------|-------------------------------------------------------|
| `WORKER_URL`         | `https://sgs-test-api.YOUR_SUBDOMAIN.workers.dev`     |
| `INGEST_TOKEN`       | the ingest token from your Cloudflare Secrets Store   |
| `TEST_LOGIN_EMAIL`   | test account email (used by the auth test)            |
| `TEST_LOGIN_PASSWORD`| test account password                                 |

The GitHub Actions workflow (`.github/workflows/post-deploy-tests.yml`) fires automatically on every `deployment_status` event set to `success`, or manually from the **Actions** tab.

---

## Local test run

```bash
cd test-runner
npm install

WORKER_URL=https://... INGEST_TOKEN=... npm test

# Run one app only
WORKER_URL=... INGEST_TOKEN=... TEST_APP=sgs-portal npm test
```

---

## Test categories

| Category | What it checks                                    |
|----------|---------------------------------------------------|
| `page`   | CF Pages app returns HTTP 200                     |
| `worker` | CF Worker `/health` returns `{ ok: true }`        |
| `api`    | Each configured route returns the expected status |
| `auth`   | Login endpoint returns a token / expected key     |

---

## Dashboard features

- **Supabase login** — email + password only, no self-signup
- **Live stats** — total runs, pass rate, avg duration, last run status
- **Runs table** — newest first, filterable by app, with mini pass/fail bar
- **Run detail panel** — per-test results, error messages, durations, git info
- **Auto-refresh** — polling every 30 seconds
