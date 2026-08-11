import type { AppConfig, TestCase, TestResult, RunPayload } from './types'
import { makePageUpTest  }   from './cases/page-up'
import { makeWorkerUpTest }  from './cases/worker-up'
import { makeApiRouteTests } from './cases/api-routes'
import { makeLoginTest }     from './cases/login'

// ── Colours for terminal output ────────────────────────────────────────────
const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  green:  '\x1b[32m',
  red:    '\x1b[31m',
  yellow: '\x1b[33m',
  cyan:   '\x1b[36m',
  white:  '\x1b[37m',
}

function log(msg: string) { process.stdout.write(msg + '\n') }

/** Build all test cases for a single app from its config */
function buildTestCases(app: AppConfig): TestCase[] {
  const cases: TestCase[] = []

  // 1. Page up
  cases.push(makePageUpTest(app.pageUrl))

  // 2. Worker up (expects GET /health)
  cases.push(makeWorkerUpTest(app.workerUrl))

  // 3. API routes
  if (app.apiRoutes.length > 0) {
    cases.push(...makeApiRouteTests(app.workerUrl, app.apiRoutes))
  }

  // 4. Login
  if (app.loginEndpoint) {
    cases.push(makeLoginTest(app.loginEndpoint))
  }

  return cases
}

/** Execute all tests for one app and return the results array */
export async function runAppTests(app: AppConfig): Promise<TestResult[]> {
  const cases = buildTestCases(app)
  log(`\n${C.bold}${C.cyan}▶  ${app.name}${C.reset} ${C.dim}(${app.environment ?? 'production'})${C.reset}`)

  const results: TestResult[] = []

  for (const tc of cases) {
    process.stdout.write(`   ${C.dim}${tc.category.padEnd(7)}${C.reset}  ${tc.name} … `)
    const r = await tc.run()
    const symbol = r.status === 'pass' ? `${C.green}✓${C.reset}` : `${C.red}✗${C.reset}`
    log(`${symbol}  ${C.dim}${r.duration_ms}ms${C.reset}`)
    if (r.error)   log(`           ${C.red}${r.error}${C.reset}`)
    if (r.message) log(`           ${C.dim}${r.message}${C.reset}`)

    results.push({
      test_name:   tc.name,
      category:    tc.category,
      executed_at: Date.now(),
      ...r,
    })
  }

  const passed = results.filter(r => r.status === 'pass').length
  const failed = results.filter(r => r.status === 'fail').length
  const mark = failed === 0 ? `${C.green}PASSED${C.reset}` : `${C.red}FAILED${C.reset}`
  log(`\n   ${mark}  ${C.bold}${passed}/${results.length}${C.reset} tests passed\n`)

  return results
}

/** Push results to the CF Worker */
export async function pushResults(
  workerUrl: string,
  apiSecret: string,
  payload:   RunPayload,
): Promise<void> {
  const url = `${workerUrl.replace(/\/$/, '')}/runs`
  log(`${C.dim}Pushing results to ${url}…${C.reset}`)

  const res = await fetch(url, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Ingest-Token': apiSecret,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Worker rejected results: HTTP ${res.status} — ${body}`)
  }

  const data = await res.json() as { run_id: string; status: string }
  log(`${C.green}✓${C.reset}  Run recorded — ID: ${C.cyan}${data.run_id}${C.reset} · status: ${data.status}`)
}
