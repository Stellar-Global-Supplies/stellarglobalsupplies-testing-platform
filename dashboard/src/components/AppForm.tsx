import { useState } from 'react'
import {
  Globe, Zap, Plug, ShieldCheck, Plus, Trash2, X,
  ChevronDown, ChevronUp, Loader, AlertCircle, Save
} from 'lucide-react'
import { api } from '../lib/api'
import type { AppConfig, AppConfigInput, ApiRoute, AuthConfig } from '../lib/api'

// ── tiny helpers ──────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-[11px] font-mono uppercase tracking-widest text-muted mb-1.5">{children}</label>
}

function Input({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full bg-raised border border-border text-primary placeholder:text-muted rounded-lg px-3 py-2 text-sm outline-none
        focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all disabled:opacity-40 ${props.className ?? ''}`}
    />
  )
}

function SectionHeader({
  icon, title, description, badge, open, onToggle,
}: { icon: React.ReactNode; title: string; description: string; badge?: string; open: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle}
      className="w-full flex items-center gap-3 p-4 hover:bg-raised/50 transition-colors rounded-xl group">
      <span className="w-8 h-8 rounded-lg bg-raised border border-border flex items-center justify-center text-muted group-hover:border-accent/30 transition-colors shrink-0">
        {icon}
      </span>
      <div className="flex-1 text-left">
        <div className="flex items-center gap-2">
          <span className="font-display font-semibold text-sm text-primary">{title}</span>
          {badge && <span className="text-[10px] font-mono text-pass bg-pass/10 border border-pass/20 px-1.5 py-0.5 rounded">{badge}</span>}
        </div>
        <div className="text-xs text-muted mt-0.5">{description}</div>
      </div>
      {open ? <ChevronUp size={14} className="text-muted" /> : <ChevronDown size={14} className="text-muted" />}
    </button>
  )
}

// ── Main form ─────────────────────────────────────────────────────────────

interface Props {
  existing?: AppConfig | null
  onSaved:  (id: string) => void
  onCancel: () => void
}

export default function AppForm({ existing, onSaved, onCancel }: Props) {
  // ── form state
  const [name,       setName]       = useState(existing?.name       ?? '')
  const [environment,setEnvironment]= useState(existing?.environment ?? 'production')
  const [pageUrl,    setPageUrl]    = useState(existing?.page_url    ?? '')
  const [workerUrl,  setWorkerUrl]  = useState(existing?.worker_url  ?? '')

  const [apiRoutes, setApiRoutes] = useState<ApiRoute[]>(
    existing?.api_routes?.length ? existing.api_routes : [{ path: '/health', expectedStatus: 200 }]
  )

  const [authEnabled, setAuthEnabled] = useState(!!existing?.auth_config)
  const [authUrl,       setAuthUrl]       = useState(existing?.auth_config?.url ?? '')
  const [authBodyRaw,   setAuthBodyRaw]   = useState<Array<{ key: string; value: string }>>(
    existing?.auth_config?.body
      ? Object.entries(existing.auth_config.body).map(([key, value]) => ({ key, value }))
      : [{ key: 'email', value: '' }, { key: 'password', value: '' }]
  )
  const [authExpectKey,  setAuthExpectKey]  = useState(existing?.auth_config?.expectJsonKey ?? 'access_token')
  const [authExpectCode, setAuthExpectCode] = useState<number>(existing?.auth_config?.expectStatusCode ?? 200)

  // ── section open/close
  const [openSections, setOpenSections] = useState({ page: true, worker: true, api: true, auth: !!existing?.auth_config })
  const toggle = (k: keyof typeof openSections) => setOpenSections(s => ({ ...s, [k]: !s[k] }))

  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  // ── API routes helpers
  const addRoute    = () => setApiRoutes(r => [...r, { path: '/', expectedStatus: 200 }])
  const removeRoute = (i: number) => setApiRoutes(r => r.filter((_, idx) => idx !== i))
  const updateRoute = (i: number, field: keyof ApiRoute, value: string | number) =>
    setApiRoutes(r => r.map((rt, idx) => idx === i ? { ...rt, [field]: value } : rt))

  // ── Auth body helpers
  const addBodyField    = () => setAuthBodyRaw(f => [...f, { key: '', value: '' }])
  const removeBodyField = (i: number) => setAuthBodyRaw(f => f.filter((_, idx) => idx !== i))
  const updateBodyField = (i: number, field: 'key' | 'value', value: string) =>
    setAuthBodyRaw(f => f.map((b, idx) => idx === i ? { ...b, [field]: value } : b))

  // ── Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)

    const authConfig: AuthConfig | null = authEnabled && authUrl
      ? {
          url:              authUrl,
          body:             Object.fromEntries(authBodyRaw.filter(b => b.key).map(b => [b.key, b.value])),
          expectJsonKey:    authExpectKey || undefined,
          expectStatusCode: authExpectCode,
        }
      : null

    const data: AppConfigInput = {
      name:        name.trim(),
      environment,
      page_url:    pageUrl.trim()   || null,
      worker_url:  workerUrl.trim() || null,
      api_routes:  apiRoutes.filter(r => r.path.trim()),
      auth_config: authConfig,
    }

    try {
      if (existing) {
        await api.updateApp(existing.id, data)
        onSaved(existing.id)
      } else {
        const res = await api.createApp(data)
        onSaved(res.id)
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ── App meta ──────────────────────────────────────────── */}
      <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
        <h3 className="font-display font-semibold text-sm text-primary">Application Details</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 sm:col-span-1">
            <Label>App Name *</Label>
            <Input
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="sgs-portal"
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <Label>Environment</Label>
            <select
              value={environment}
              onChange={e => setEnvironment(e.target.value)}
              className="w-full bg-raised border border-border text-primary rounded-lg px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all"
            >
              <option value="production">production</option>
              <option value="staging">staging</option>
              <option value="preview">preview</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Section 1: Page Up ────────────────────────────────── */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <SectionHeader
          icon={<Globe size={14} />}
          title="Page Up"
          description="Checks that your CF Pages app returns HTTP 200"
          badge={pageUrl ? 'configured' : undefined}
          open={openSections.page}
          onToggle={() => toggle('page')}
        />
        {openSections.page && (
          <div className="px-5 pb-5 pt-1 border-t border-border">
            <Label>Pages URL</Label>
            <Input
              type="url"
              value={pageUrl}
              onChange={e => setPageUrl(e.target.value)}
              placeholder="https://your-app.pages.dev"
            />
            <p className="text-[11px] text-muted mt-1.5">Leave blank to skip this test.</p>
          </div>
        )}
      </div>

      {/* ── Section 2: Worker Up ──────────────────────────────── */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <SectionHeader
          icon={<Zap size={14} />}
          title="Worker Up"
          description="Hits GET /health on your CF Worker, expects { ok: true }"
          badge={workerUrl ? 'configured' : undefined}
          open={openSections.worker}
          onToggle={() => toggle('worker')}
        />
        {openSections.worker && (
          <div className="px-5 pb-5 pt-1 border-t border-border">
            <Label>Worker Base URL</Label>
            <Input
              type="url"
              value={workerUrl}
              onChange={e => setWorkerUrl(e.target.value)}
              placeholder="https://your-worker.workers.dev"
            />
            <p className="text-[11px] text-muted mt-1.5">
              Also used as the base for API route tests below. Leave blank to skip.
            </p>
          </div>
        )}
      </div>

      {/* ── Section 3: API Routes ─────────────────────────────── */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <SectionHeader
          icon={<Plug size={14} />}
          title="API Routes"
          description="Verify each worker route returns the expected HTTP status"
          badge={apiRoutes.filter(r => r.path.trim()).length > 0 ? `${apiRoutes.filter(r => r.path.trim()).length} routes` : undefined}
          open={openSections.api}
          onToggle={() => toggle('api')}
        />
        {openSections.api && (
          <div className="px-5 pb-5 pt-1 border-t border-border space-y-3">
            <p className="text-[11px] text-muted">
              Requires <span className="font-mono text-subtle">Worker Base URL</span> above.
            </p>

            {apiRoutes.map((route, i) => (
              <div key={i} className="flex gap-2 items-center">
                <div className="flex-1">
                  <Input
                    value={route.path}
                    onChange={e => updateRoute(i, 'path', e.target.value)}
                    placeholder="/health"
                  />
                </div>
                <div className="w-20">
                  <Input
                    type="number"
                    value={route.expectedStatus ?? 200}
                    onChange={e => updateRoute(i, 'expectedStatus', parseInt(e.target.value) || 200)}
                    placeholder="200"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeRoute(i)}
                  className="p-2 text-muted hover:text-fail transition-colors rounded-lg hover:bg-fail/10"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}

            <div className="flex items-center gap-2 pt-1">
              <div className="text-[10px] font-mono text-muted">PATH</div>
              <div className="ml-auto text-[10px] font-mono text-muted mr-8">STATUS</div>
            </div>

            <button
              type="button"
              onClick={addRoute}
              className="flex items-center gap-2 text-sm text-accent hover:text-accent/80 transition-colors font-medium"
            >
              <Plus size={14} />
              Add route
            </button>
          </div>
        )}
      </div>

      {/* ── Section 4: Auth ───────────────────────────────────── */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="flex items-center">
          <div className="flex-1">
            <SectionHeader
              icon={<ShieldCheck size={14} />}
              title="Auth Test"
              description="POST credentials to a login endpoint and verify the response"
              badge={authEnabled && authUrl ? 'configured' : undefined}
              open={openSections.auth}
              onToggle={() => toggle('auth')}
            />
          </div>
          {/* Enable toggle */}
          <div className="pr-4">
            <button
              type="button"
              onClick={() => { setAuthEnabled(v => !v); if (!openSections.auth) toggle('auth') }}
              className={`relative w-10 h-5 rounded-full transition-colors ${authEnabled ? 'bg-accent' : 'bg-border'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${authEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>

        {openSections.auth && authEnabled && (
          <div className="px-5 pb-5 pt-1 border-t border-border space-y-4">
            {/* Login URL */}
            <div>
              <Label>Login Endpoint URL</Label>
              <Input
                type="url"
                value={authUrl}
                onChange={e => setAuthUrl(e.target.value)}
                placeholder="https://your-project.supabase.co/auth/v1/token?grant_type=password"
              />
            </div>

            {/* Body key-value pairs */}
            <div>
              <Label>Request Body Fields</Label>
              <div className="space-y-2">
                {authBodyRaw.map((field, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input
                      value={field.key}
                      onChange={e => updateBodyField(i, 'key', e.target.value)}
                      placeholder="email"
                      className="w-28"
                    />
                    <span className="text-muted text-sm">:</span>
                    <Input
                      value={field.value}
                      onChange={e => updateBodyField(i, 'value', e.target.value)}
                      placeholder="user@example.com"
                      className="flex-1"
                    />
                    <button type="button" onClick={() => removeBodyField(i)}
                      className="p-2 text-muted hover:text-fail transition-colors rounded-lg hover:bg-fail/10">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={addBodyField}
                  className="flex items-center gap-2 text-sm text-accent hover:text-accent/80 transition-colors font-medium">
                  <Plus size={14} /> Add field
                </button>
              </div>
            </div>

            {/* Expected response */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Expected Status Code</Label>
                <Input
                  type="number"
                  value={authExpectCode}
                  onChange={e => setAuthExpectCode(parseInt(e.target.value) || 200)}
                  placeholder="200"
                />
              </div>
              <div>
                <Label>Expected JSON Key</Label>
                <Input
                  value={authExpectKey}
                  onChange={e => setAuthExpectKey(e.target.value)}
                  placeholder="access_token"
                />
                <p className="text-[11px] text-muted mt-1">Must be truthy in the response</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Error ─────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-2 text-fail text-sm bg-fail/10 border border-fail/20 rounded-lg px-4 py-3">
          <AlertCircle size={14} className="shrink-0" />
          {error}
        </div>
      )}

      {/* ── Actions ───────────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel}
          className="flex items-center gap-2 text-sm text-muted hover:text-primary px-4 py-2 rounded-lg hover:bg-raised transition-colors">
          <X size={14} /> Cancel
        </button>
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="flex items-center gap-2 bg-accent text-bg font-display font-semibold text-sm px-5 py-2 rounded-lg
                     hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {saving ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
          {existing ? 'Save changes' : 'Create app'}
        </button>
      </div>
    </form>
  )
}
