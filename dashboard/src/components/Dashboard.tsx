import { useCallback, useEffect, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { RefreshCw, LogOut, AlertTriangle, LayoutDashboard, Layers } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { api } from '../lib/api'
import type { Stats, TestRun } from '../lib/api'
import { SGSLogo } from '../App'
import StatsCards from './StatsCards'
import RunsTable from './RunsTable'
import RunDetails from './RunDetails'
import AppsPage from './AppsPage'
import { ChevronDown } from 'lucide-react'

type Tab = 'runs' | 'apps'
const REFRESH = 30_000

export default function Dashboard({ session }: { session: Session }) {
  const [tab, setTab] = useState<Tab>('runs')

  const [stats,    setStats]    = useState<Stats | null>(null)
  const [runs,     setRuns]     = useState<TestRun[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [appFilter,setAppFilter]= useState('')
  const [loading,  setLoading]  = useState(true)
  const [refreshing,setRefreshing]=useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [lastRefresh,setLast]   = useState(new Date())
  const interval = useRef<ReturnType<typeof setInterval>>()

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true)
    setError(null)
    try {
      const [s, r] = await Promise.all([api.stats(), api.runs(appFilter || undefined)])
      setStats(s); setRuns(r); setLast(new Date())
    } catch (e) { setError((e as Error).message) }
    finally { setLoading(false); setRefreshing(false) }
  }, [appFilter])

  useEffect(() => {
    if (tab === 'runs') {
      fetchData()
      interval.current = setInterval(() => fetchData(true), REFRESH)
    }
    return () => clearInterval(interval.current)
  }, [fetchData, tab])

  const email = session.user.email ?? ''
  const apps  = stats?.apps ?? []

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* ── Nav ──────────────────────────────────────────────── */}
      <header className="scanline sticky top-0 z-30 bg-surface/90 backdrop-blur-md border-b border-border">
        <div className="max-w-screen-xl mx-auto px-6 h-14 flex items-center gap-6">
          <SGSLogo />

          {/* Tabs */}
          <nav className="flex items-center gap-1 flex-1">
            {([
              { id: 'runs', label: 'Runs',         icon: <LayoutDashboard size={13} /> },
              { id: 'apps', label: 'Applications', icon: <Layers size={13} /> },
            ] as { id: Tab; label: string; icon: React.ReactNode }[]).map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  tab === t.id
                    ? 'bg-accent/10 text-accent border border-accent/20'
                    : 'text-muted hover:text-primary hover:bg-raised'
                }`}
              >
                {t.icon}{t.label}
              </button>
            ))}
          </nav>

          {/* Right controls */}
          <div className="flex items-center gap-3">
            {tab === 'runs' && (
              <span className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-muted">
                <span className={`w-1.5 h-1.5 rounded-full ${refreshing ? 'bg-warn animate-pulse2' : 'bg-pass'}`} />
                {lastRefresh.toLocaleTimeString()}
              </span>
            )}
            {tab === 'runs' && (
              <button onClick={() => fetchData(true)} disabled={refreshing}
                className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-raised transition-colors disabled:opacity-40">
                <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              </button>
            )}
            <div className="flex items-center gap-2 bg-raised border border-border rounded-lg px-3 py-1.5">
              <div className="w-5 h-5 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-[10px] font-display font-bold text-accent uppercase">
                {email.charAt(0)}
              </div>
              <span className="text-xs text-subtle hidden sm:block max-w-[140px] truncate">{email}</span>
              <button onClick={() => supabase.auth.signOut()} className="text-muted hover:text-fail transition-colors ml-1" title="Sign out">
                <LogOut size={13} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Body ─────────────────────────────────────────────── */}
      <main className="flex-1 max-w-screen-xl mx-auto w-full px-6 py-8">
        {tab === 'runs' && (
          <div className="space-y-8">
            {error && (
              <div className="flex items-center gap-3 bg-fail/10 border border-fail/20 rounded-xl px-5 py-3 text-sm text-fail">
                <AlertTriangle size={16} className="shrink-0" />
                {error}
                <button onClick={() => fetchData()} className="ml-auto text-xs underline">Retry</button>
              </div>
            )}

            {loading
              ? <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="bg-surface border border-border rounded-xl h-28 animate-pulse" />)}</div>
              : stats && <StatsCards stats={stats} />
            }

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="font-display font-semibold text-primary">Test Runs</h2>
                  <p className="text-muted text-xs mt-0.5">{runs.length} run{runs.length !== 1 ? 's' : ''} · auto-refreshes every 30s</p>
                </div>
                {apps.length > 0 && (
                  <div className="relative">
                    <select value={appFilter} onChange={e => setAppFilter(e.target.value)}
                      className="appearance-none bg-raised border border-border text-sm text-primary rounded-lg pl-3 pr-8 py-2 outline-none focus:border-accent cursor-pointer transition-all">
                      <option value="">All applications</option>
                      {apps.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                    <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                  </div>
                )}
              </div>
              {loading
                ? <div className="bg-surface border border-border rounded-xl h-64 animate-pulse" />
                : <RunsTable runs={runs} onSelectRun={setSelected} />
              }
            </div>
          </div>
        )}

        {tab === 'apps' && <AppsPage />}
      </main>

      {selected && <RunDetails runId={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
