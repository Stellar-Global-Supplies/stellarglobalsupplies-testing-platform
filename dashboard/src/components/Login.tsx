import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { SGSLogo } from '../App'
import { Lock, Mail, AlertCircle, Loader } from 'lucide-react'

export default function Login() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) setError(err.message)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      {/* Background grid */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: 'linear-gradient(#38BDF8 1px, transparent 1px), linear-gradient(90deg, #38BDF8 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Glow orb */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-10 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, #38BDF8, transparent 70%)' }} />

      <div className="relative w-full max-w-sm animate-fadeUp">
        {/* Card */}
        <div className="bg-surface border border-border rounded-2xl p-8 shadow-2xl">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <SGSLogo size="lg" />
          </div>

          <div className="mb-6">
            <h1 className="font-display font-semibold text-xl text-primary text-center">
              Sign in to continue
            </h1>
            <p className="text-muted text-sm text-center mt-1">
              Stellar Global Supplies · Internal access only
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-subtle uppercase tracking-wider mb-1.5">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={15} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@stellarglobal.com"
                  className="w-full bg-raised border border-border text-primary placeholder:text-muted
                             rounded-lg pl-9 pr-4 py-2.5 text-sm outline-none
                             focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-subtle uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={15} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-raised border border-border text-primary placeholder:text-muted
                             rounded-lg pl-9 pr-4 py-2.5 text-sm outline-none
                             focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all"
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 text-fail text-sm bg-fail/10 border border-fail/20 rounded-lg px-3 py-2.5">
                <AlertCircle size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent text-bg font-display font-semibold text-sm rounded-lg py-2.5
                         hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all flex items-center justify-center gap-2 mt-2"
            >
              {loading
                ? <><Loader size={15} className="animate-spin" /> Signing in…</>
                : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted mt-6">
          Contact your administrator to request access
        </p>
      </div>
    </div>
  )
}
