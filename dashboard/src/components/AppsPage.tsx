import { useCallback, useEffect, useState } from 'react'
import {
  Plus, Play, Pencil, Trash2, Globe, Zap, Plug, ShieldCheck,
  CheckCircle2, XCircle, Loader, AlertTriangle, X, ChevronRight
} from 'lucide-react'
import { api } from '../lib/api'
import type { AppConfig, TriggerResult } from '../lib/api'
import AppForm from './AppForm'
import RunDetails from './RunDetails'

// ── Tiny badge showing what tests are configured ──────────────────────────

function ConfigBadge({ icon, active }: { icon: React.ReactNode; active: boolean }) {
  return (
    <span className={`w-6 h-6 flex items-center justify-center rounded border transition-colors ${
      active ? 'border-accent/30 text-accent bg-accent/10' : 'border-border text-border'
    }`}>
      {icon}
    </span>
  )
}

// ── Trigger result mini-panel ─────────────────────────────────────────────

function TriggerResultBanner({ result, onViewRun, onClose }: {
  result: TriggerResult
  onViewRun: (id: string) => void
  onClose: () => void
}) {
  const isPassed = result.status === 'passed'
  return (
    <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 animate-fadeUp ${
      isPassed
        ? 'bg-pass/10 border-pass/30 text-pass'
        : 'bg-fail/10 border-fail/30 text-fail'
    }`}>
      {isPassed
        ? <CheckCircle2 size={16} className="shrink-0" />
        : <XCircle size={16} className="shrink-0" />}
      <div className="flex-1 text-sm font-medium">
        {isPassed ? 'All tests passed' : `${result.failed} test${result.failed !== 1 ? 's' : ''} failed`}
        <span className="font-normal opacity-70 ml-2">
          {result.passed}/{result.total} checks passed
        </span>
      </div>
      <button
        onClick={() => onViewRun(result.run_id)}
        className="flex items-center gap-1 text-xs font-mono underline underline-offset-2 hover:no-underline opacity-80 hover:opacity-100 transition-opacity"
      >
        View run <ChevronRight size={11} />
      </button>
      <button onClick={onClose} className="opacity-60 hover:opacity-100 transition-opacity ml-1">
        <X size={14} />
      </button>
    </div>
  )
}

// ── App card ─────────────────────────────────────────────────────────────

function AppCard({ app, onEdit, onDelete, onTrigger, triggering }: {
  app: AppConfig
  onEdit:     () => void
  onDelete:   () => void
  onTrigger:  () => void
  triggering: boolean
}) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5 hover:border-accent/20 transition-colors group">
      <div className="flex items-start justify-between gap-4">
        {/* Left: name + env */}
        <div className="min-w-0">
          <div className="font-display font-semibold text-primary group-hover:text-accent transition-colors truncate">
            {app.name}
          </div>
          <span className="inline-block font-mono text-[10px] text-muted bg-raised border border-border px-2 py-0.5 rounded-md mt-1">
            {app.environment}
          </span>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={onEdit}
            className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-raised transition-colors"
            title="Edit">
            <Pencil size={13} />
          </button>
          <button onClick={onDelete}
            className="p-1.5 rounded-lg text-muted hover:text-fail hover:bg-fail/10 transition-colors"
            title="Delete">
            <Trash2 size={13} />
          </button>
          <button
            onClick={onTrigger}
            disabled={triggering}
            className="flex items-center gap-1.5 bg-accent/10 border border-accent/20 text-accent hover:bg-accent hover:text-bg
                       text-xs font-mono px-3 py-1.5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {triggering
              ? <><Loader size={11} className="animate-spin" /> Running…</>
              : <><Play size={11} /> Run now</>}
          </button>
        </div>
      </div>

      {/* Config indicators */}
      <div className="flex items-center gap-1.5 mt-4">
        <ConfigBadge icon={<Globe size={10} />}       active={!!app.page_url} />
        <ConfigBadge icon={<Zap size={10} />}         active={!!app.worker_url} />
        <ConfigBadge icon={<Plug size={10} />}        active={app.api_routes?.length > 0} />
        <ConfigBadge icon={<ShieldCheck size={10} />} active={!!app.auth_config} />
        <span className="text-[10px] font-mono text-muted ml-2">
          {[
            app.page_url   && 'page',
            app.worker_url && 'worker',
            app.api_routes?.length > 0 && `${app.api_routes.length} api route${app.api_routes.length !== 1 ? 's' : ''}`,
            app.auth_config && 'auth',
          ].filter(Boolean).join(' · ') || 'no tests configured'}
        </span>
      </div>

      {/* URL previews */}
      {(app.page_url || app.worker_url) && (
        <div className="mt-3 space-y-1">
          {app.page_url && (
            <div className="font-mono text-[11px] text-muted truncate">
              <span className="text-border mr-1.5">page:</span>{app.page_url}
            </div>
          )}
          {app.worker_url && (
            <div className="font-mono text-[11px] text-muted truncate">
              <span className="text-border mr-1.5">worker:</span>{app.worker_url}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Delete confirm modal ──────────────────────────────────────────────────

function DeleteModal({ app, onConfirm, onCancel, deleting }: {
  app: AppConfig; onConfirm: () => void; onCancel: () => void; deleting: boolean
}) {
  return (
    <>
      <div className="fixed inset-0 bg-bg/80 backdrop-blur-sm z-50" onClick={onCancel} />
      <div className="fixed inset-0 flex items-center justify-center z-50 px-4">
        <div className="bg-surface border border-border rounded-2xl p-6 w-full max-w-sm animate-fadeUp shadow-2xl">
          <div className="w-10 h-10 rounded-full bg-fail/10 border border-fail/20 flex items-center justify-center mb-4">
            <AlertTriangle size={18} className="text-fail" />
          </div>
          <h3 className="font-display font-semibold text-primary mb-2">Delete {app.name}?</h3>
          <p className="text-sm text-muted mb-6">
            This will remove the app configuration. Existing test run history will be kept.
          </p>
          <div className="flex gap-3">
            <button onClick={onCancel} className="flex-1 text-sm text-muted hover:text-primary border border-border rounded-lg py-2 hover:bg-raised transition-colors">
              Cancel
            </button>
            <button onClick={onConfirm} disabled={deleting}
              className="flex-1 text-sm bg-fail text-white rounded-lg py-2 hover:bg-fail/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              {deleting ? <Loader size={14} className="animate-spin" /> : null}
              Delete
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Main AppsPage ─────────────────────────────────────────────────────────

export default function AppsPage() {
  const [apps,         setApps]         = useState<AppConfig[]>([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)

  const [editingApp,   setEditingApp]   = useState<AppConfig | null | 'new'>('new' as never)
  const [showForm,     setShowForm]     = useState(false)

  const [deletingApp,  setDeletingApp]  = useState<AppConfig | null>(null)
  const [deleteLoading,setDeleteLoading]= useState(false)

  const [triggeringId, setTriggeringId] = useState<string | null>(null)
  const [triggerResults, setTriggerResults] = useState<Record<string, TriggerResult>>({})

  const [viewingRunId, setViewingRunId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try { setApps(await api.apps()) }
    catch (e) { setError((e as Error).message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSaved = (_id: string) => {
    setShowForm(false)
    setEditingApp(null)
    load()
    // scroll back to top
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async () => {
    if (!deletingApp) return
    setDeleteLoading(true)
    try { await api.deleteApp(deletingApp.id); setDeletingApp(null); load() }
    catch (e) { setError((e as Error).message) }
    finally { setDeleteLoading(false) }
  }

  const handleTrigger = async (app: AppConfig) => {
    setTriggeringId(app.id)
    try {
      const result = await api.triggerApp(app.id)
      setTriggerResults(r => ({ ...r, [app.id]: result }))
    } catch (e) {
      setError(`Trigger failed: ${(e as Error).message}`)
    } finally {
      setTriggeringId(null)
    }
  }

  // ── Show form ────────────────────────────────────────────────────────────
  if (showForm) {
    const isNew = editingApp === null
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => { setShowForm(false); setEditingApp(null) }}
            className="text-muted hover:text-primary transition-colors text-sm">← Back</button>
          <h2 className="font-display font-semibold text-primary">
            {isNew ? 'Add Application' : `Edit — ${(editingApp as AppConfig).name}`}
          </h2>
        </div>
        <AppForm
          existing={isNew ? undefined : editingApp as AppConfig}
          onSaved={handleSaved}
          onCancel={() => { setShowForm(false); setEditingApp(null) }}
        />
      </div>
    )
  }

  // ── List view ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display font-semibold text-primary">Applications</h2>
          <p className="text-muted text-xs mt-0.5">
            Configure test suites for each app — then trigger on demand or after each deploy.
          </p>
        </div>
        <button
          onClick={() => { setEditingApp(null); setShowForm(true) }}
          className="flex items-center gap-2 bg-accent text-bg font-display font-semibold text-sm px-4 py-2 rounded-lg hover:bg-accent/90 transition-all"
        >
          <Plus size={14} /> Add application
        </button>
      </div>

      {/* Global error */}
      {error && (
        <div className="flex items-center gap-2 text-fail text-sm bg-fail/10 border border-fail/20 rounded-xl px-4 py-3">
          <AlertTriangle size={14} className="shrink-0" /> {error}
          <button onClick={() => setError(null)} className="ml-auto"><X size={13} /></button>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-surface border border-border rounded-xl h-44 animate-pulse" />
          ))}
        </div>
      ) : apps.length === 0 ? (
        /* Empty state */
        <div className="bg-surface border border-border rounded-xl flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-raised border border-border flex items-center justify-center text-2xl">🛰️</div>
          <div className="text-center">
            <div className="font-display font-semibold text-primary mb-1">No applications yet</div>
            <div className="text-muted text-sm">Add your first app to start configuring tests.</div>
          </div>
          <button
            onClick={() => { setEditingApp(null); setShowForm(true) }}
            className="flex items-center gap-2 bg-accent text-bg font-semibold text-sm px-4 py-2 rounded-lg hover:bg-accent/90 transition-all mt-2"
          >
            <Plus size={14} /> Add your first application
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Trigger result banners */}
          {Object.entries(triggerResults).map(([appId, result]) => {
            const app = apps.find(a => a.id === appId)
            if (!app) return null
            return (
              <div key={appId}>
                <div className="text-xs font-mono text-muted mb-1.5">{app.name}</div>
                <TriggerResultBanner
                  result={result}
                  onViewRun={setViewingRunId}
                  onClose={() => setTriggerResults(r => { const n = { ...r }; delete n[appId]; return n })}
                />
              </div>
            )
          })}

          {/* App grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {apps.map(app => (
              <AppCard
                key={app.id}
                app={app}
                triggering={triggeringId === app.id}
                onEdit={() => { setEditingApp(app); setShowForm(true) }}
                onDelete={() => setDeletingApp(app)}
                onTrigger={() => handleTrigger(app)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deletingApp && (
        <DeleteModal
          app={deletingApp}
          onConfirm={handleDelete}
          onCancel={() => setDeletingApp(null)}
          deleting={deleteLoading}
        />
      )}

      {/* Run detail slide-in */}
      {viewingRunId && <RunDetails runId={viewingRunId} onClose={() => setViewingRunId(null)} />}
    </div>
  )
}
