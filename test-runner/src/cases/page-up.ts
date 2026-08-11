import type { TestCase, TestCaseResult } from '../types'

/**
 * Verifies that the CF Pages app returns HTTP 200.
 * A non-200 (or network failure) means the page is down.
 */
export function makePageUpTest(pageUrl: string): TestCase {
  return {
    name:     `Page is up — ${pageUrl}`,
    category: 'page',
    async run(): Promise<TestCaseResult> {
      const start = Date.now()
      try {
        const res = await fetch(pageUrl, { method: 'GET', redirect: 'follow' })
        const duration_ms = Date.now() - start

        if (res.ok) {
          return {
            status:      'pass',
            duration_ms,
            message:     `HTTP ${res.status} in ${duration_ms}ms`,
            url:         pageUrl,
          }
        }

        return {
          status:      'fail',
          duration_ms,
          error:       `Expected 200, got HTTP ${res.status}`,
          url:         pageUrl,
        }
      } catch (err) {
        return {
          status:      'fail',
          duration_ms: Date.now() - start,
          error:       `Network error: ${(err as Error).message}`,
          url:         pageUrl,
        }
      }
    },
  }
}
