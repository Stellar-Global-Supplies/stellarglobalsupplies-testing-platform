import { CheckCircle2, XCircle, Loader, GitBranch, GitCommit, ChevronRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { TestRun } from '../lib/api'

function StatusBadge({ status }: { status: TestRun['status'] }) {
  if (status === 'passed') return (
    <span className="inline-flex items-center gap-1.5 text-xs font-mono text-pass bg-pass/10 border border-pass/20 px-2.5 py-1 rounded-full status-glow-pass">
      <CheckCircle2 size={11} />
      passed
    </span>
  )
  if (status === 'failed') return (
    <span className="inline-flex items-center gap-1.5 text-xs font-mono text-fail bg-fail/10 border border-fail/20 px-2.5 py-1 rounded-full status-glow-fail">
      <XCircle size={11} />
      failed
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-mono text-warn bg-warn/10 border border-warn/20 px-2.5 py-1 rounded-full">
      <Loader size={11} className="animate-spin" />
      running
    </span>
  )
}

function MiniBar({ passed, total }: { passed: number; total: number }) {
  if (total === 0) return <span className="text-muted text-xs font-mono">—</span>
  const pct = Math.round((passed / total) * 100)
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-raised rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${passed === total ? 'bg-pass' : passed === 0 ? 'bg-fail' : 'bg-warn'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-xs text-subtle">{passed}/{total}</span>
    </div>
  )
}

export default function RunsTable({
  runs,
  onSelectRun,
}: {
  runs: TestRun[]
  onSelectRun: (id: string) => void
}) {
  if (runs.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-xl flex flex-col items-center justify-center py-20 gap-3">
        <div className="text-4xl">🛰️</div>
        <div className="text-primary font-display font-medium">No test runs yet</div>
        <div className="text-muted text-sm text-center max-w-xs">
          Trigger a deployment and the test runner will post results here automatically.
        </div>
      </div>
    )
  }

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      {/* Table head */}
      <div className="grid grid-cols-[1fr_130px_100px_100px_120px_160px_32px] gap-4 px-5 py-3 border-b border-border">
        {['Application', 'Status', 'Results', 'Duration', 'Environment', 'Started', ''].map(h => (
          <div key={h} className="text-[10px] font-mono uppercase tracking-widest text-muted">{h}</div>
        ))}
      </div>

      {/* Rows */}
      <div className="divide-y divide-border">
        {runs.map(run => {
          const durationSec = run.completed_at
            ? ((run.completed_at - run.started_at) / 1000).toFixed(1)
            : null

          return (
            <button
              key={run.id}
              onClick={() => onSelectRun(run.id)}
              className="w-full table-row-hover grid grid-cols-[1fr_130px_100px_100px_120px_160px_32px] gap-4 px-5 py-4 text-left transition-colors group"
            >
              {/* App name */}
              <div>
                <div className="font-display font-semibold text-sm text-primary group-hover:text-accent transition-colors truncate">
                  {run.app_name}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {run.git_sha && (
                    <span className="flex items-center gap-0.5 font-mono text-[10px] text-muted">
                      <GitCommit size={9} />
                      {run.git_sha.slice(0, 7)}
                    </span>
                  )}
                  {run.git_branch && (
                    <span className="flex items-center gap-0.5 font-mono text-[10px] text-muted">
                      <GitBranch size={9} />
                      {run.git_branch}
                    </span>
                  )}
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center">
                <StatusBadge status={run.status} />
              </div>

              {/* Results bar */}
              <div className="flex items-center">
                <MiniBar passed={run.passed} total={run.total} />
              </div>

              {/* Duration */}
              <div className="flex items-center">
                <span className="font-mono text-xs text-subtle">
                  {durationSec ? `${durationSec}s` : <Loader size={11} className="animate-spin text-warn" />}
                </span>
              </div>

              {/* Environment */}
              <div className="flex items-center">
                <span className="font-mono text-[11px] text-muted bg-raised border border-border px-2 py-0.5 rounded-md">
                  {run.environment}
                </span>
              </div>

              {/* Time */}
              <div className="flex items-center">
                <span className="text-xs text-muted" title={new Date(run.started_at).toLocaleString()}>
                  {formatDistanceToNow(new Date(run.started_at), { addSuffix: true })}
                </span>
              </div>

              {/* Arrow */}
              <div className="flex items-center justify-end">
                <ChevronRight size={14} className="text-muted group-hover:text-accent transition-colors" />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
