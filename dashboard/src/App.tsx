import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import Dashboard   from './components/Dashboard'
import Login       from './components/Login'
import SSOCallback from './components/SSOCallback'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  // ✅ Handle /sso-callback before any session logic
  if (window.location.pathname === '/sso-callback') {
    return <SSOCallback />
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="flex flex-col items-center gap-4">
        <SGSLogo />
        <div className="flex gap-1.5 mt-2">
          {[0,1,2].map(i => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse2"
              style={{ animationDelay: `${i * 0.2}s` }} />
          ))}
        </div>
      </div>
    </div>
  )

  // ✅ No session → Login which redirects to portal
  return session ? <Dashboard session={session} /> : <Login />
}

export function SGSLogo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const scale = size === 'sm' ? 0.7 : size === 'lg' ? 1.4 : 1
  return (
    <div className="flex items-center gap-2.5" style={{ transform: `scale(${scale})`, transformOrigin: 'left center' }}>
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="8" fill="#38BDF8" fillOpacity="0.12" />
        <rect x="1" y="1" width="30" height="30" rx="7" stroke="#38BDF8" strokeOpacity="0.3" strokeWidth="1"/>
        <path d="M8 16 L16 8 L24 16 L16 24 Z" stroke="#38BDF8" strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
        <circle cx="16" cy="16" r="3" fill="#38BDF8"/>
      </svg>
      <div>
        <div className="font-display font-700 text-sm tracking-widest text-primary uppercase">SGS</div>
        <div className="font-mono text-[9px] tracking-wider text-muted uppercase -mt-0.5">Test Platform</div>
      </div>
    </div>
  )
}
