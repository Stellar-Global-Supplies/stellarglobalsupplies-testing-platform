/**
 * SGS Test Runner — entry point
 *
 * Usage:
 *   npx tsx src/index.ts
 *   TEST_APP=sgs-portal npx tsx src/index.ts   # run one app only
 *
 * Environment variables (set in CI secrets):
 *   WORKER_URL       — base URL of the sgs-test-api worker  (required)
 *   INGEST_TOKEN     — X-Ingest-Token header value          (required)
 *   GIT_SHA          — commit SHA, set by CI automatically
 *   GIT_BRANCH       — branch name,   set by CI automatically
 *   TRIGGERED_BY     — e.g. "github-actions"
 *   TEST_LOGIN_EMAIL — test account email for auth test
 *   TEST_LOGIN_PASSWORD — test account password for auth test
 *   TEST_APP         — if set, run only this app (by name)
 */

import apps            from '../apps.config'
import { runAppTests, pushResults } from './runner'
import type { RunPayload } from './types'

const WORKER_URL   = process.env.WORKER_URL
const INGEST_TOKEN = process.env.INGEST_TOKEN
const GIT_SHA      = process.env.GITHUB_SHA     ?? process.env.GIT_SHA
const GIT_BRANCH   = process.env.GITHUB_REF_NAME ?? process.env.GIT_BRANCH ?? 'unknown'
const TRIGGERED_BY = process.env.TRIGGERED_BY   ?? 'github-actions'
const FILTER_APP   = process.env.TEST_APP

if (!WORKER_URL || !INGEST_TOKEN) {
  console.error('❌  WORKER_URL and INGEST_TOKEN are required environment variables.')
  process.exit(1)
}

const appsToRun = FILTER_APP
  ? apps.filter(a => a.name === FILTER_APP)
  : apps

if (appsToRun.length === 0) {
  console.error(`❌  No apps found${FILTER_APP ? ` matching "${FILTER_APP}"` : ''}`)
  process.exit(1)
}

console.log('\n╔════════════════════════════════════════════╗')
console.log('║  SGS Test Platform — Post-Deploy Runner    ║')
console.log(`╚════════════════════════════════════════════╝`)
console.log(`   ${appsToRun.length} app(s) · branch: ${GIT_BRANCH} · sha: ${GIT_SHA?.slice(0, 7) ?? 'n/a'}\n`)

let overallFailed = false

for (const app of appsToRun) {
  const results = await runAppTests(app)

  const payload: RunPayload = {
    app_name:     app.name,
    environment:  app.environment ?? 'production',
    triggered_by: TRIGGERED_BY,
    git_sha:      GIT_SHA,
    git_branch:   GIT_BRANCH,
    results,
  }

  await pushResults(WORKER_URL, INGEST_TOKEN, payload)

  if (results.some(r => r.status === 'fail')) overallFailed = true
}

console.log('\n──────────────────────────────────────────────')
if (overallFailed) {
  console.log('⚠️  Some tests failed. See dashboard for details.')
  process.exit(1)
} else {
  console.log('✅  All tests passed.')
  process.exit(0)
}
