export type Category = 'page' | 'worker' | 'api' | 'auth'
export type Status   = 'pass' | 'fail'

export interface TestCase {
  name:     string
  category: Category
  run:      () => Promise<TestCaseResult>
}

export interface TestCaseResult {
  status:      Status
  duration_ms: number
  message?:    string
  error?:      string
  url?:        string
}

export interface TestResult extends TestCaseResult {
  test_name:   string
  category:    Category
  executed_at: number
}

export interface RunPayload {
  app_name:      string
  environment:   string
  triggered_by:  string
  git_sha?:      string
  git_branch?:   string
  results:       TestResult[]
}

export interface AppConfig {
  /** Identifier posted to the dashboard */
  name: string
  /** Base URL of the CF Pages app */
  pageUrl: string
  /** Base URL of the CF Worker */
  workerUrl: string
  /** One or more API routes to probe */
  apiRoutes: Array<{ path: string; expectedStatus?: number }>
  /** Login endpoint + credentials for auth test */
  loginEndpoint?: {
    url:               string
    method:            'POST'
    body:              Record<string, unknown>
    expectStatusCode?: number
    expectJsonKey?:    string
  }
  /** Environment label, defaults to 'production' */
  environment?: string
}
