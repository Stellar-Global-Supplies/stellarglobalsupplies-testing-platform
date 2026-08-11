import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
  DB: D1Database
  INGEST_TOKEN: string
  DASHBOARD_ORIGIN: string
}

// ── Inline test runner (worker executes fetch calls itself) ───────────────

interface TestOutcome {
  test_name:   string
  category:    'page' | 'worker' | 'api' | 'auth'
  status:      'pass' | 'fail'
  duration_ms: number
  message?:    string
  error?:      string
  url?:        string
  executed_at: number
}

async function testPageUp(pageUrl: string): Promise<TestOutcome> {
  const start = Date.now()
  const name  = `Page is up — ${pageUrl}`
  try {
    const res = await fetch(pageUrl, { redirect: 'follow' })
    const ms  = Date.now() - start
    return res.ok
      ? { test_name: name, category: 'page', status: 'pass', duration_ms: ms, message: `HTTP ${res.status} in ${ms}ms`, url: pageUrl, executed_at: Date.now() }
      : { test_name: name, category: 'page', status: 'fail', duration_ms: ms, error: `Expected 200, got HTTP ${res.status}`, url: pageUrl, executed_at: Date.now() }
  } catch (e) {
    return { test_name: name, category: 'page', status: 'fail', duration_ms: Date.now() - start, error: `Network error: ${(e as Error).message}`, url: pageUrl, executed_at: Date.now() }
  }
}

async function testWorkerUp(workerUrl: string): Promise<TestOutcome> {
  const healthUrl = `${workerUrl.replace(/\/$/, '')}/health`
  const start = Date.now()
  const name  = `Worker is up — ${workerUrl}`
  try {
    const res  = await fetch(healthUrl)
    const ms   = Date.now() - start
    if (!res.ok) return { test_name: name, category: 'worker', status: 'fail', duration_ms: ms, error: `Worker /health returned HTTP ${res.status}`, url: healthUrl, executed_at: Date.now() }
    const body = await res.json() as Record<string, unknown>
    return body.ok === true
      ? { test_name: name, category: 'worker', status: 'pass', duration_ms: ms, message: `Worker healthy in ${ms}ms`, url: healthUrl, executed_at: Date.now() }
      : { test_name: name, category: 'worker', status: 'fail', duration_ms: ms, error: `Worker returned ok=${body.ok}`, url: healthUrl, executed_at: Date.now() }
  } catch (e) {
    return { test_name: name, category: 'worker', status: 'fail', duration_ms: Date.now() - start, error: `Network error: ${(e as Error).message}`, url: healthUrl, executed_at: Date.now() }
  }
}

async function testApiRoute(workerUrl: string, route: { path: string; expectedStatus?: number }): Promise<TestOutcome> {
  const expected = route.expectedStatus ?? 200
  const fullUrl  = `${workerUrl.replace(/\/$/, '')}${route.path}`
  const start    = Date.now()
  const name     = `API route ${route.path} → ${expected}`
  try {
    const res = await fetch(fullUrl)
    const ms  = Date.now() - start
    return res.status === expected
      ? { test_name: name, category: 'api', status: 'pass', duration_ms: ms, message: `HTTP ${res.status} in ${ms}ms`, url: fullUrl, executed_at: Date.now() }
      : { test_name: name, category: 'api', status: 'fail', duration_ms: ms, error: `Expected HTTP ${expected}, got ${res.status}`, url: fullUrl, executed_at: Date.now() }
  } catch (e) {
    return { test_name: name, category: 'api', status: 'fail', duration_ms: Date.now() - start, error: `Network error: ${(e as Error).message}`, url: fullUrl, executed_at: Date.now() }
  }
}

async function testAuth(config: { url: string; body: Record<string, unknown>; expectJsonKey?: string; expectStatusCode?: number }): Promise<TestOutcome> {
  const expected = config.expectStatusCode ?? 200
  const start    = Date.now()
  const name     = `Auth — login via ${config.url}`
  try {
    const res = await fetch(config.url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(config.body),
    })
    const ms = Date.now() - start
    if (res.status !== expected) return { test_name: name, category: 'auth', status: 'fail', duration_ms: ms, error: `Login returned HTTP ${res.status}, expected ${expected}`, url: config.url, executed_at: Date.now() }
    if (config.expectJsonKey) {
      let json: Record<string, unknown> = {}
      try { json = await res.json() as Record<string, unknown> } catch { /* non-json */ }
      if (!json[config.expectJsonKey]) return { test_name: name, category: 'auth', status: 'fail', duration_ms: ms, error: `Response missing key "${config.expectJsonKey}"`, url: config.url, executed_at: Date.now() }
    }
    return { test_name: name, category: 'auth', status: 'pass', duration_ms: ms, message: `Login OK (HTTP ${res.status}) in ${ms}ms`, url: config.url, executed_at: Date.now() }
  } catch (e) {
    return { test_name: name, category: 'auth', status: 'fail', duration_ms: Date.now() - start, error: `Network error: ${(e as Error).message}`, url: config.url, executed_at: Date.now() }
  }
}

// ── Hono app ──────────────────────────────────────────────────────────────

const app = new Hono<{ Bindings: Bindings }>()

app.use('*', async (c, next) => {
  const origin = c.env.DASHBOARD_ORIGIN || '*'
  return cors({
    origin: [origin, 'http://localhost:5173'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Ingest-Token'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    maxAge: 86400,
  })(c, next)
})

const requireSecret = async (c: any, next: any) => {
  const secret = c.req.header('X-Ingest-Token')
  if (!secret || secret !== c.env.INGEST_TOKEN) return c.json({ error: 'Unauthorized' }, 401)
  return next()
}

// ══════════════════════════════════════════════════════════════════════════
// APP CONFIG CRUD
// ══════════════════════════════════════════════════════════════════════════

app.get('/apps', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT * FROM app_configs ORDER BY name ASC`
  ).all()
  return c.json(results.map(r => ({
    ...r,
    api_routes:  r.api_routes  ? JSON.parse(r.api_routes as string)  : [],
    auth_config: r.auth_config ? JSON.parse(r.auth_config as string) : null,
  })))
})

app.get('/apps/:id', async (c) => {
  const row = await c.env.DB.prepare(`SELECT * FROM app_configs WHERE id = ?`).bind(c.req.param('id')).first()
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json({
    ...row,
    api_routes:  row.api_routes  ? JSON.parse(row.api_routes as string)  : [],
    auth_config: row.auth_config ? JSON.parse(row.auth_config as string) : null,
  })
})

app.post('/apps', requireSecret, async (c) => {
  const body = await c.req.json<{
    name: string; environment?: string; page_url?: string; worker_url?: string
    api_routes?: Array<{ path: string; expectedStatus?: number }>
    auth_config?: { url: string; body: Record<string, unknown>; expectJsonKey?: string; expectStatusCode?: number }
  }>()
  if (!body.name) return c.json({ error: 'name is required' }, 400)
  const id  = crypto.randomUUID()
  const now = Date.now()
  await c.env.DB.prepare(`
    INSERT INTO app_configs (id, name, environment, page_url, worker_url, api_routes, auth_config, enabled, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).bind(id, body.name, body.environment ?? 'production', body.page_url ?? null, body.worker_url ?? null,
    body.api_routes?.length ? JSON.stringify(body.api_routes) : null,
    body.auth_config ? JSON.stringify(body.auth_config) : null,
    now, now).run()
  return c.json({ id }, 201)
})

app.put('/apps/:id', requireSecret, async (c) => {
  const id   = c.req.param('id')
  const body = await c.req.json<{
    name?: string; environment?: string; page_url?: string; worker_url?: string
    api_routes?: Array<{ path: string; expectedStatus?: number }>
    auth_config?: { url: string; body: Record<string, unknown>; expectJsonKey?: string; expectStatusCode?: number } | null
  }>()
  const row = await c.env.DB.prepare(`SELECT id FROM app_configs WHERE id = ?`).bind(id).first()
  if (!row) return c.json({ error: 'Not found' }, 404)
  await c.env.DB.prepare(`
    UPDATE app_configs SET
      name = COALESCE(?, name), environment = COALESCE(?, environment),
      page_url = ?, worker_url = ?,
      api_routes = ?, auth_config = ?, updated_at = ?
    WHERE id = ?
  `).bind(
    body.name ?? null, body.environment ?? null,
    body.page_url ?? null, body.worker_url ?? null,
    body.api_routes?.length ? JSON.stringify(body.api_routes) : null,
    body.auth_config ? JSON.stringify(body.auth_config) : null,
    Date.now(), id
  ).run()
  return c.json({ ok: true })
})

app.delete('/apps/:id', requireSecret, async (c) => {
  await c.env.DB.prepare(`DELETE FROM app_configs WHERE id = ?`).bind(c.req.param('id')).run()
  return c.json({ ok: true })
})

// ══════════════════════════════════════════════════════════════════════════
// TRIGGER — run all tests for an app right now (worker executes inline)
// ══════════════════════════════════════════════════════════════════════════

app.post('/apps/:id/trigger', requireSecret, async (c) => {
  const row = await c.env.DB.prepare(`SELECT * FROM app_configs WHERE id = ?`).bind(c.req.param('id')).first()
  if (!row) return c.json({ error: 'App not found' }, 404)

  const app_name   = row.name as string
  const pageUrl    = row.page_url as string | null
  const workerUrl  = row.worker_url as string | null
  const apiRoutes  = row.api_routes  ? JSON.parse(row.api_routes as string)  as Array<{ path: string; expectedStatus?: number }> : []
  const authConfig = row.auth_config ? JSON.parse(row.auth_config as string) as { url: string; body: Record<string, unknown>; expectJsonKey?: string; expectStatusCode?: number } : null
  const env        = row.environment as string

  const body      = await c.req.json<{ triggered_by?: string; git_sha?: string; git_branch?: string }>().catch(() => ({}))
  const outcomes: TestOutcome[] = []

  if (pageUrl)   outcomes.push(await testPageUp(pageUrl))
  if (workerUrl) outcomes.push(await testWorkerUp(workerUrl))
  for (const route of apiRoutes) {
    if (workerUrl) outcomes.push(await testApiRoute(workerUrl, route))
  }
  if (authConfig) outcomes.push(await testAuth(authConfig))

  const passed = outcomes.filter(o => o.status === 'pass').length
  const failed = outcomes.filter(o => o.status === 'fail').length
  const status = failed === 0 ? 'passed' : 'failed'
  const now    = Date.now()

  const runId = crypto.randomUUID()
  await c.env.DB.prepare(`
    INSERT INTO test_runs (id, app_id, app_name, environment, triggered_by, git_sha, git_branch, started_at, completed_at, total, passed, failed, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(runId, row.id as string, app_name, env, body.triggered_by ?? 'dashboard', body.git_sha ?? null, body.git_branch ?? null, now, Date.now(), outcomes.length, passed, failed, status).run()

  const stmt = c.env.DB.prepare(`
    INSERT INTO test_results (id, run_id, test_name, category, status, duration_ms, message, error, url, executed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  await c.env.DB.batch(outcomes.map(o =>
    stmt.bind(crypto.randomUUID(), runId, o.test_name, o.category, o.status, o.duration_ms, o.message ?? null, o.error ?? null, o.url ?? null, o.executed_at)
  ))

  return c.json({ run_id: runId, status, passed, failed, total: outcomes.length, results: outcomes })
})

// ══════════════════════════════════════════════════════════════════════════
// CI push (from test-runner repo)
// ══════════════════════════════════════════════════════════════════════════

app.post('/runs', requireSecret, async (c) => {
  const body = await c.req.json<{
    app_name: string; environment?: string; triggered_by?: string; git_sha?: string; git_branch?: string
    results: Array<{ test_name: string; category: string; status: string; duration_ms?: number; message?: string; error?: string; url?: string; executed_at?: number }>
  }>()
  if (!body.app_name || !Array.isArray(body.results)) return c.json({ error: 'app_name and results required' }, 400)

  const appRow = await c.env.DB.prepare(`SELECT id FROM app_configs WHERE name = ?`).bind(body.app_name).first()
  const runId  = crypto.randomUUID()
  const now    = Date.now()
  const passed = body.results.filter(r => r.status === 'pass').length
  const failed = body.results.filter(r => r.status === 'fail').length

  await c.env.DB.prepare(`
    INSERT INTO test_runs (id, app_id, app_name, environment, triggered_by, git_sha, git_branch, started_at, completed_at, total, passed, failed, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(runId, appRow?.id ?? null, body.app_name, body.environment ?? 'production', body.triggered_by ?? 'ci', body.git_sha ?? null, body.git_branch ?? null, now, now, body.results.length, passed, failed, failed === 0 ? 'passed' : 'failed').run()

  const stmt = c.env.DB.prepare(`INSERT INTO test_results (id, run_id, test_name, category, status, duration_ms, message, error, url, executed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
  await c.env.DB.batch(body.results.map(r => stmt.bind(crypto.randomUUID(), runId, r.test_name, r.category, r.status, r.duration_ms ?? 0, r.message ?? null, r.error ?? null, r.url ?? null, r.executed_at ?? now)))

  return c.json({ run_id: runId, status: failed === 0 ? 'passed' : 'failed', passed, failed, total: body.results.length }, 201)
})

// ══════════════════════════════════════════════════════════════════════════
// READ routes (dashboard)
// ══════════════════════════════════════════════════════════════════════════

app.get('/runs', async (c) => {
  const limit    = Math.min(parseInt(c.req.query('limit') ?? '100'), 500)
  const appFilter = c.req.query('app')
  let query = `SELECT * FROM test_runs`
  const params: (string | number)[] = []
  if (appFilter) { query += ` WHERE app_name = ?`; params.push(appFilter) }
  query += ` ORDER BY started_at DESC LIMIT ?`; params.push(limit)
  const { results } = await c.env.DB.prepare(query).bind(...params).all()
  return c.json(results)
})

app.get('/runs/:id', async (c) => {
  const run = await c.env.DB.prepare(`SELECT * FROM test_runs WHERE id = ?`).bind(c.req.param('id')).first()
  if (!run) return c.json({ error: 'Not found' }, 404)
  const { results } = await c.env.DB.prepare(`SELECT * FROM test_results WHERE run_id = ? ORDER BY executed_at ASC`).bind(c.req.param('id')).all()
  return c.json({ ...run, results })
})

app.get('/stats', async (c) => {
  const [aggregate, apps, recentRun] = await Promise.all([
    c.env.DB.prepare(`SELECT COUNT(*) AS total_runs, SUM(CASE WHEN status='passed' THEN 1 ELSE 0 END) AS passed_runs, SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) AS failed_runs, ROUND(AVG(completed_at-started_at)) AS avg_duration_ms, SUM(passed) AS total_tests_passed, SUM(failed) AS total_tests_failed FROM test_runs WHERE completed_at IS NOT NULL`).first<Record<string, number>>(),
    c.env.DB.prepare(`SELECT DISTINCT app_name FROM test_runs ORDER BY app_name`).all<{ app_name: string }>(),
    c.env.DB.prepare(`SELECT status FROM test_runs ORDER BY started_at DESC LIMIT 1`).first<{ status: string }>(),
  ])
  const total = (aggregate?.total_tests_passed ?? 0) + (aggregate?.total_tests_failed ?? 0)
  return c.json({ ...aggregate, pass_rate: total > 0 ? Math.round(((aggregate?.total_tests_passed ?? 0) / total) * 100) : 0, last_run_status: recentRun?.status ?? null, apps: apps.results.map(a => a.app_name) })
})

app.get('/health', (c) => c.json({ ok: true, ts: Date.now() }))

export default app
