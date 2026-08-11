import type { TestCase, TestCaseResult } from '../types'

/**
 * Hits GET /health on the CF Worker.
 * Expects HTTP 200 with { ok: true } in the body.
 */
export function makeWorkerUpTest(workerUrl: string): TestCase {
  const healthUrl = `${workerUrl.replace(/\/$/, '')}/health`

  return {
    name:     `Worker is up — ${workerUrl}`,
    category: 'worker',
    async run(): Promise<TestCaseResult> {
      const start = Date.now()
      try {
        const res        = await fetch(healthUrl)
        const duration_ms = Date.now() - start

        if (!res.ok) {
          return {
            status:      'fail',
            duration_ms,
            error:       `Worker /health returned HTTP ${res.status}`,
            url:         healthUrl,
          }
        }

        const body = await res.json() as Record<string, unknown>
        if (body.ok !== true) {
          return {
            status:      'fail',
            duration_ms,
            error:       `Worker returned ok=${body.ok}, expected true`,
            url:         healthUrl,
          }
        }

        return {
          status:      'pass',
          duration_ms,
          message:     `Worker healthy in ${duration_ms}ms`,
          url:         healthUrl,
        }
      } catch (err) {
        return {
          status:      'fail',
          duration_ms: Date.now() - start,
          error:       `Network error: ${(err as Error).message}`,
          url:         healthUrl,
        }
      }
    },
  }
}
