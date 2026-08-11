import type { TestCase, TestCaseResult } from '../types'

export interface LoginEndpointConfig {
  url:               string
  method:            'POST'
  body:              Record<string, unknown>
  expectStatusCode?: number   // default 200
  /** If set, the JSON response must contain this key with a truthy value */
  expectJsonKey?:    string
}

/**
 * Posts credentials to the login endpoint.
 * Passes when status matches AND (if configured) the expected JSON key is present.
 */
export function makeLoginTest(config: LoginEndpointConfig): TestCase {
  return {
    name:     `Auth — can log in via ${config.url}`,
    category: 'auth',
    async run(): Promise<TestCaseResult> {
      const expected    = config.expectStatusCode ?? 200
      const start       = Date.now()

      try {
        const res        = await fetch(config.url, {
          method:  config.method,
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(config.body),
        })
        const duration_ms = Date.now() - start

        if (res.status !== expected) {
          return {
            status:      'fail',
            duration_ms,
            error:       `Login returned HTTP ${res.status}, expected ${expected}`,
            url:         config.url,
          }
        }

        if (config.expectJsonKey) {
          let json: Record<string, unknown> = {}
          try { json = await res.json() as Record<string, unknown> } catch { /* non-json */ }

          const hasKey = config.expectJsonKey in json && Boolean(json[config.expectJsonKey])
          if (!hasKey) {
            return {
              status:      'fail',
              duration_ms,
              error:       `Response missing expected key "${config.expectJsonKey}"`,
              url:         config.url,
            }
          }
        }

        return {
          status:      'pass',
          duration_ms,
          message:     `Login succeeded (HTTP ${res.status}) in ${duration_ms}ms`,
          url:         config.url,
        }
      } catch (err) {
        return {
          status:      'fail',
          duration_ms: Date.now() - start,
          error:       `Network error: ${(err as Error).message}`,
          url:         config.url,
        }
      }
    },
  }
}
