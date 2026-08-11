import { TrendingUp, CheckCircle2, XCircle, Timer, Layers } from 'lucide-react'
import type { Stats } from '../lib/api'

function Card({
  icon, label, value, sub, accent,
}: { icon: React.ReactNode; label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5 flex flex-col gap-3 hover:border-accent/30 transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono uppercase tracking-widest text-muted">{label}</span>
        <span className="text-muted">{icon}</span>
      </div>
      <div>
        <div className={`font-display font-semibold text-3xl ${accent ?? 'text-primary'}`}>
          {value}
        </div>
        {sub && <div className="text-xs text-muted mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}

export default function StatsCards({ stats }: { stats: Stats }) {
  const passRate = stats.pass_rate ?? 0
  const avgSec   = stats.avg_duration_ms ? (stats.avg_duration_ms / 1000).toFixed(1) : '—'

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card
        icon={<Layers size={15} />}
        label="Total Runs"
        value={stats.total_runs ?? 0}
        sub={`${stats.apps?.length ?? 0} app${stats.apps?.length !== 1 ? 's' : ''} monitored`}
      />
      <Card
        icon={<TrendingUp size={15} />}
        label="Pass Rate"
        value={`${passRate}%`}
        sub={`${stats.passed_runs ?? 0} passed · ${stats.failed_runs ?? 0} failed`}
        accent={passRate >= 90 ? 'text-pass' : passRate >= 70 ? 'text-warn' : 'text-fail'}
      />
      <Card
        icon={<Timer size={15} />}
        label="Avg Duration"
        value={avgSec === '—' ? '—' : `${avgSec}s`}
        sub="per test run"
      />
      <Card
        icon={
          stats.last_run_status === 'passed'
            ? <CheckCircle2 size={15} className="text-pass" />
            : stats.last_run_status === 'failed'
              ? <XCircle size={15} className="text-fail" />
              : <div className="w-3.5 h-3.5 rounded-full bg-muted" />
        }
        label="Last Run"
        value={
          stats.last_run_status === 'passed' ? 'Passed'
          : stats.last_run_status === 'failed' ? 'Failed'
          : 'No runs'
        }
        sub="most recent deployment"
        accent={
          stats.last_run_status === 'passed' ? 'text-pass'
          : stats.last_run_status === 'failed' ? 'text-fail'
          : 'text-muted'
        }
      />
    </div>
  )
}
