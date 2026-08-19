import { useEffect } from 'react'
import { SGSLogo } from '../App'

const LANDING_URL = (import.meta.env.VITE_LANDING_URL as string) || 'https://apps.stellarglobalsupplies.com'

// No login form — SSO handles everything via the portal
export default function Login() {
  useEffect(() => {
    const callback = encodeURIComponent(window.location.origin + '/')
    window.location.replace(`${LANDING_URL}/login?callback=${callback}`)
  }, [])

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="fixed inset-0 pointer-events-none opacity-[0.025]"
        style={{ backgroundImage: 'linear-gradient(#38BDF8 1px, transparent 1px), linear-gradient(90deg, #38BDF8 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-10 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, #38BDF8, transparent 70%)' }} />
      <div className="relative flex flex-col items-center gap-4">
        <SGSLogo size="lg" />
        <p className="text-muted text-sm mt-2">Redirecting to portal…</p>
        <div className="flex gap-1.5 mt-1">
          {[0,1,2].map(i => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse2"
              style={{ animationDelay: `${i * 0.2}s` }} />
          ))}
        </div>
      </div>
    </div>
  )
}
