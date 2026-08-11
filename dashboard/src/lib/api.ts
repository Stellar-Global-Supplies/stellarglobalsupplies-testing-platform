const BASE = import.meta.env.VITE_WORKER_URL as string
const SECRET = import.meta.env.VITE_INGEST_TOKEN as string

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`)
  return res.json() as Promise<T>
}

async function mutate<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Ingest-Token': SECRET },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText })) as { error: string }
    throw new Error(err.error ?? `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface ApiRoute {
  path: string
  expectedStatus?: number
}

export interface AuthConfig {
  url: string
  body: Record<string, string>
  expectJsonKey?: string
  expectStatusCode?: number
}

export interface AppConfig {
  id: string
  name: string
  environment: string
  page_url: string | null
  worker_url: string | null
  api_routes: ApiRoute[]
  auth_config: AuthConfig | null
  enabled: number
  created_at: number
  updated_at: number
}

export type AppConfigInput = Omit<AppConfig, 'id' | 'enabled' | 'created_at' | 'updated_at'>

export interface TestRun {
  id: string
  app_id: string | null
  app_name: string
  environment: string
  triggered_by: string
  git_sha: string | null
  git_branch: string | null
  started_at: number
  completed_at: number | null
  total: number
  passed: number
  failed: number
  status: 'running' | 'passed' | 'failed'
}

export interface TestResult {
  id: string
  run_id: string
  test_name: string
  category: 'page' | 'worker' | 'api' | 'auth'
  status: 'pass' | 'fail'
  duration_ms: number
  message: string | null
  error: string | null
  url: string | null
  executed_at: number
}

export interface RunDetail extends TestRun { results: TestResult[] }

export interface Stats {
  total_runs: number
  passed_runs: number
  failed_runs: number
  avg_duration_ms: number
  pass_rate: number
  last_run_status: 'passed' | 'failed' | null
  apps: string[]
}

export interface TriggerResult {
  run_id: string
  status: 'passed' | 'failed'
  passed: number
  failed: number
  total: number
  results: TestResult[]
}

// ── API calls ──────────────────────────────────────────────────────────────

export const api = {
  stats:   ()              => get<Stats>('/stats'),
  runs:    (app?: string)  => get<TestRun[]>(`/runs${app ? `?app=${encodeURIComponent(app)}` : ''}`),
  run:     (id: string)    => get<RunDetail>(`/runs/${id}`),

  apps:         ()                              => get<AppConfig[]>('/apps'),
  app:          (id: string)                    => get<AppConfig>(`/apps/${id}`),
  createApp:    (data: AppConfigInput)          => mutate<{ id: string }>('POST', '/apps', data),
  updateApp:    (id: string, data: AppConfigInput) => mutate<{ ok: boolean }>('PUT', `/apps/${id}`, data),
  deleteApp:    (id: string)                    => mutate<{ ok: boolean }>('DELETE', `/apps/${id}`),
  triggerApp:   (id: string)                    => mutate<TriggerResult>('POST', `/apps/${id}/trigger`, { triggered_by: 'dashboard' }),
}
