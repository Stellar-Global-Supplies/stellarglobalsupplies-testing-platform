import { useEffect, useState } from 'react'
import { X, Globe, Zap, Plug, ShieldCheck, CheckCircle2, XCircle, Clock, ExternalLink, Loader } from 'lucide-react'
import { format } from 'date-fns'
import { api } from '../lib/api'
import type { RunDetail, TestResult } from '../lib/api'

const CATEGORY_META = {
  page:   { label: 'Page',   icon: Globe,       color: 'text-accent',  bg: 'bg-accent/10',  border: 'border-accent/20' },
  worker: { label: 'Worker', icon: Zap,         color: 'text-warn',    bg: 'bg-warn/10',    border: 'border-warn/20' },
  api:    { label: 'API',    icon: Plug,         color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20' },
  auth:   { label: 'Auth',   icon: ShieldCheck, color: 'text-pass',    bg: 'bg-pass/10',    border: 'border-pass/20' },
} as const

function CategoryBadge({ category }: { category: TestResult['category'] }) {
  const m = CATEGORY_META[category] ?? CATEGORY_META.api
  const Icon = m.icon
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${m.color} ${m.bg} ${m.border}`}>
      <Icon size={9} />
      {m.label}
    </span>
  )
}

export default function RunDetails({ runId, onClose }: { runId: string; onClose: () => void }) {
  const [run, setRun]         = useState<RunDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.run(runId).then(data => { setRun(data); setLoading(false) }).catch(() => setLoading(false))
  }, [runId])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const passCount = run?.results?.filter(r => r.status === 'pass').length ?? 0
  const failCount = run?.results?.filter(r => r.status === 'fail').length ?? 0
  const duration  = run?.completed_at && run.started_at
    ? ((run.completed_at - run.started_at) / 1000).toFixed(2)
    : null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-bg/70 backdrop-blur-sm z-40 animate-fadeUp"
        onClick={onClose}
      />

      {/* Panel */}
      <aside className="fixed right-0 top-0 h-full w-full max-w-xl bg-surface border-l border-border z-50 flex flex-col animate-slideIn overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <div className="font-display font-semibold text-primary">
              {run ? run.app_name : 'Loading…'}
            </div>
            <div className="font-mono text-[11px] text-muted mt-0.5">
              {run ? run.id.slice(0, 8).toUpperCase() : '—'}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-primary p-1.5 rounded-lg hover:bg-raised transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader size={20} className="animate-spin text-accent" />
          </div>
        ) : !run ? (
          <div className="flex-1 flex items-center justify-center text-muted text-sm">Failed to load run</div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* Meta strip */}
            <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
              {[
                { label: 'Status', value: run.status, color: run.status === 'passed' ? 'text-pass' : 'text-fail' },
                { label: 'Environment', value: run.environment, color: 'text-subtle' },
                { label: 'Duration', value: duration ? `${duration}s` : '—', color: 'text-subtle' },
              ].map(item => (
                <div key={item.label} className="px-5 py-3">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted mb-1">{item.label}</div>
                  <div className={`font-display font-semibold text-sm capitalize ${item.color}`}>{item.value}</div>
                </div>
              ))}
            </div>

            {/* Git + trigger info */}
            <div className="px-6 py-4 border-b border-border flex flex-wrap gap-4">
              {run.git_sha && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted">Commit</span>
                  <span className="font-mono text-xs text-accent bg-accent/10 px-2 py-0.5 rounded border border-accent/20">
                    {run.git_sha.slice(0, 7)}
                  </span>
                  {run.git_branch && (
                    <span className="font-mono text-xs text-subtle bg-raised px-2 py-0.5 rounded border border-border">
                      {run.git_branch}
                    </span>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted">Triggered by</span>
                <span className="text-xs text-subtle">{run.triggered_by}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted">Started</span>
                <span className="text-xs text-subtle">
                  {format(new Date(run.started_at), 'MMM d, HH:mm:ss')}
                </span>
              </div>
            </div>

            {/* Pass/fail summary bar */}
            <div className="px-6 py-4 border-b border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted font-mono uppercase tracking-wider">
                  {run.total} test{run.total !== 1 ? 's' : ''}
                </span>
                <div className="flex gap-3">
                  <span className="flex items-center gap-1 text-xs text-pass">
                    <CheckCircle2 size={12} /> {passCount} passed
                  </span>
                  {failCount > 0 && (
                    <span className="flex items-center gap-1 text-xs text-fail">
                      <XCircle size={12} /> {failCount} failed
                    </span>
                  )}
                </div>
              </div>
              {run.total > 0 && (
                <div className="h-1.5 bg-raised rounded-full overflow-hidden">
                  <div
                    className="h-full bg-pass rounded-full transition-all"
                    style={{ width: `${(passCount / run.total) * 100}%` }}
                  />
                </div>
              )}
            </div>

            {/* Test results list */}
            <div className="px-6 py-4 space-y-2">
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted mb-3">
                Test Results
              </div>
              {run.results?.map(result => (
                <TestResultRow key={result.id} result={result} />
              ))}
            </div>
          </div>
        )}
      </aside>
    </>
  )
}

function TestResultRow({ result }: { result: TestResult }) {
  const [expanded, setExpanded] = useState(result.status === 'fail')
  const isPass = result.status === 'pass'

  return (
    <div
      className={`rounded-lg border transition-colors ${
        isPass
          ? 'border-border bg-raised/50 hover:border-pass/30'
          : 'border-fail/30 bg-fail/5 hover:border-fail/50'
      }`}
    >
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        {isPass
          ? <CheckCircle2 size={15} className="shrink-0 text-pass" />
          : <XCircle     size={15} className="shrink-0 text-fail" />
        }
        <span className="flex-1 text-sm text-primary font-medium truncate">{result.test_name}</span>
        <div className="flex items-center gap-2 shrink-0">
          <CategoryBadge category={result.category} />
          <span className="flex items-center gap-1 text-[11px] font-mono text-muted">
            <Clock size={10} />
            {result.duration_ms}ms
          </span>
        </div>
      </button>

      {expanded && (result.message || result.error || result.url) && (
        <div className="px-4 pb-3 pt-0 space-y-2 border-t border-border/50 mt-0">
          {result.message && (
            <p className="text-xs text-subtle font-mono bg-raised rounded px-3 py-2 mt-2">
              {result.message}
            </p>
          )}
          {result.error && (
            <p className="text-xs text-fail font-mono bg-fail/10 border border-fail/20 rounded px-3 py-2">
              {result.error}
            </p>
          )}
          {result.url && (
            <a
              href={result.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-accent hover:underline"
            >
              <ExternalLink size={10} />
              {result.url}
            </a>
          )}
        </div>
      )}
    </div>
  )
}
