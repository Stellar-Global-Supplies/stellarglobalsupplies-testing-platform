import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { SGSLogo } from '../App'

const EXCHANGE_FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sso-exchange`
const LANDING_URL = (import.meta.env.VITE_LANDING_URL as string) || 'https://apps.stellarglobalsupplies.com'
const MAX_AGE_MS = 5 * 60 * 1000

// ── Open-redirect guard ───────────────────────────────────────
// Only allow same-origin paths.
// External URLs fall back to the application root.
function safeRedirect(redirect: string, fallback = '/'): string {
  try {
    const url = new URL(redirect, window.location.origin)

    if (url.origin !== window.location.origin) {
      return fallback
    }

    return url.pathname + url.search + url.hash
  } catch {
    return fallback
  }
}

export default function SSOCallback() {
  const [status, setStatus] = useState('Verifying your session…')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)

    const token = params.get('token')

    // Sanitize redirect immediately.
    // Never use the raw query-string redirect.
    const redirect = safeRedirect(params.get('redirect') || '/')

    /*
     * Missing-token requests must go back to the portal
     * BEFORE timestamp validation.
     */
    if (!token) {
      const callback = encodeURIComponent(
        window.location.origin + redirect
      )

      window.location.replace(
        `${LANDING_URL}/login?callback=${callback}`
      )

      return
    }

    /*
     * Token is present, therefore ts is mandatory.
     */
    const tsRaw = params.get('ts')

    if (!tsRaw) {
      setError(
        'This sign-in link is invalid. Please return to the portal.'
      )
      return
    }

    const ts = Number(tsRaw)

    /*
     * Reject:
     * - NaN
     * - Infinity
     * - -Infinity
     * - zero
     * - negative timestamps
     */
    if (!Number.isFinite(ts) || ts <= 0) {
      setError(
        'This sign-in link is invalid. Please return to the portal.'
      )
      return
    }

    const now = Date.now()

    /*
     * Reject timestamps from the future.
     */
    if (ts > now) {
      setError(
        'This sign-in link is invalid. Please return to the portal.'
      )
      return
    }

    /*
     * Reject timestamps older than 5 minutes.
     */
    if (now - ts > MAX_AGE_MS) {
      setError(
        'This sign-in link has expired. Please return to the portal.'
      )
      return
    }

    setStatus('Exchanging credentials…')

    fetch(EXCHANGE_FN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async res => {
        const data = await res.json()

        if (!res.ok) {
          throw new Error(
            data.error || `Exchange failed (${res.status})`
          )
        }

        return data
      })
      .then(
        async ({
          access_token,
          refresh_token,
        }: {
          access_token: string
          refresh_token: string
        }) => {
          setStatus('Setting up your workspace…')

          const { error: authErr } =
            await supabase.auth.setSession({
              access_token,
              refresh_token,
            })

          if (authErr) {
            throw new Error(authErr.message)
          }

          // Redirect was already sanitized by safeRedirect().
          window.location.replace(redirect)
        }
      )
      .catch((err: Error) => {
        setError(
          err.message ||
            'Sign-in failed. Please return to the portal.'
        )
      })
  }, [])

  if (error) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div
          className="fixed inset-0 pointer-events-none opacity-[0.025]"
          style={{
            backgroundImage:
              'linear-gradient(#38BDF8 1px, transparent 1px), linear-gradient(90deg, #38BDF8 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative w-full max-w-sm">
          <div className="bg-surface border border-border rounded-2xl p-8 shadow-2xl text-center">
            <div className="flex justify-center mb-6">
              <SGSLogo size="lg" />
            </div>

            <p className="text-fail font-semibold mb-2">
              Sign-in error
            </p>

            <p className="text-muted text-sm mb-6">
              {error}
            </p>

            <a
              href={LANDING_URL}
              className="inline-block w-full bg-accent text-bg font-display font-semibold text-sm rounded-lg py-2.5 hover:bg-accent/90 transition-all text-center"
            >
              Return to Portal
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage:
            'linear-gradient(#38BDF8 1px, transparent 1px), linear-gradient(90deg, #38BDF8 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-10 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, #38BDF8, transparent 70%)',
        }}
      />

      <div className="relative flex flex-col items-center gap-4">
        <SGSLogo size="lg" />

        <p className="text-muted text-sm mt-2">
          {status}
        </p>

        <div className="flex gap-1.5 mt-1">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse2"
              style={{
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
