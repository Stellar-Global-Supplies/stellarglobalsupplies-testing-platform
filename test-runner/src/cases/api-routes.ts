import type { TestCase, TestCaseResult } from '../types'

export interface ApiRouteConfig {
  path:           string
  expectedStatus?: number   // default 200
}

/**
 * For each configured route, fires a GET request and checks the status code.
 */
export function makeApiRouteTests(
  workerUrl: string,
  routes:    ApiRouteConfig[],
): TestCase[] {
  const base = workerUrl.replace(/\/$/, '')

  return routes.map(route => {
    const expected = route.expectedStatus ?? 200
    const fullUrl  = `${base}${route.path}`

    return {
      name:     `API route ${route.path} → ${expected}`,
      category: 'api' as const,
      async run(): Promise<TestCaseResult> {
        const start = Date.now()
        try {
          const res        = await fetch(fullUrl)
          const duration_ms = Date.now() - start

          if (res.status === expected) {
            return {
              status:      'pass',
              duration_ms,
              message:     `HTTP ${res.status} in ${duration_ms}ms`,
              url:         fullUrl,
            }
          }

          return {
            status:      'fail',
            duration_ms,
            error:       `Expected HTTP ${expected}, got ${res.status}`,
            url:         fullUrl,
          }
        } catch (err) {
          return {
            status:      'fail',
            duration_ms: Date.now() - start,
            error:       `Network error: ${(err as Error).message}`,
            url:         fullUrl,
          }
        }
      },
    }
  })
}
