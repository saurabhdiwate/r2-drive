'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2,
  KeyRound,
  Loader2,
  LogOut,
  RefreshCw,
  ShieldCheck,
  User,
  XCircle
} from 'lucide-react'
import { apiFetch, ApiClientError } from '@/lib/api'
import type { ConnectionStatus } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { formatDate } from '@/lib/utils'

export default function SettingsPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [username, setUsername] = useState('')
  const [status, setStatus] = useState<ConnectionStatus | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [testing, setTesting] = useState(false)

  const loadStatus = useCallback(async () => {
    setLoadingStatus(true)
    try {
      const [me, conn] = await Promise.all([
        apiFetch<{ data: { username: string } }>('/api/auth/me'),
        apiFetch<{ data: ConnectionStatus }>('/api/r2/status')
      ])
      setUsername(me.data.username)
      setStatus(conn.data)
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 401) {
        router.push('/login')
      }
    } finally {
      setLoadingStatus(false)
    }
  }, [router])

  useEffect(() => {
    void loadStatus()
  }, [loadStatus])

  const testConnection = async () => {
    setTesting(true)
    try {
      await apiFetch('/api/r2/test', { method: 'POST' })
      toast('R2 connection successful', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'R2 connection failed', 'error')
    } finally {
      setTesting(false)
      void loadStatus()
    }
  }

  const handleLogout = async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined)
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="max-w-3xl space-y-6 p-4 lg:p-6">
      <h1 className="text-xl font-semibold text-slate-900">Settings</h1>

      {/* Security */}
      <section className="card p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800">
          <ShieldCheck className="h-4 w-4 text-indigo-500" /> Security
        </h2>

        <div className="space-y-4 text-sm">
          <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                <User className="h-4 w-4" />
              </span>
              <div>
                <p className="font-medium text-slate-800">Logged in as</p>
                <p className="text-xs text-slate-500">{username || '—'}</p>
              </div>
            </div>
            <Badge tone="green">Active session</Badge>
          </div>

          <p className="text-xs leading-relaxed text-slate-500">
            Credentials are managed exclusively through server environment
            variables (<code className="rounded bg-slate-100 px-1">APP_USERNAME</code>,{' '}
            <code className="rounded bg-slate-100 px-1">APP_PASSWORD_HASH</code>,{' '}
            <code className="rounded bg-slate-100 px-1">SESSION_SECRET</code>).
            Password hashes and session secrets are never displayed here or sent to
            the browser. Restart/redeploy the application after changing them.
          </p>

          <Button variant="danger" onClick={handleLogout}>
            <LogOut className="h-4 w-4" /> Log out
          </Button>
        </div>
      </section>

      {/* R2 connection */}
      <section className="card p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800">
          <KeyRound className="h-4 w-4 text-sky-500" /> Cloudflare R2 connection
        </h2>

        {loadingStatus ? (
          <div className="flex items-center gap-2 py-8 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading status…
          </div>
        ) : status ? (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <StatusRow
                label="Configuration"
                ok={status.configured}
                okText="Configured"
                failText={
                  status.missing.length > 0
                    ? `Missing: ${status.missing.join(', ')}`
                    : 'Not configured'
                }
              />
              <StatusRow
                label="Connection"
                ok={status.valid}
                okText="Valid"
                failText="Invalid or untested"
              />
              <StatusRow
                label="Endpoint"
                ok={Boolean(status.endpoint)}
                okText={status.endpoint}
                failText="Not set"
              />
              <StatusRow
                label="Accessible buckets"
                ok={status.bucketCount > 0}
                okText={`${status.bucketCount} bucket${status.bucketCount === 1 ? '' : 's'}`}
                failText="None detected"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button onClick={testConnection} loading={testing}>
                <RefreshCw className="h-4 w-4" /> Test connection
              </Button>
              {status.lastTested && (
                <span className="text-xs text-slate-500">
                  Last successful test: {formatDate(status.lastTested)}
                </span>
              )}
            </div>

            {!status.configured && (
              <div className="rounded-lg bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800">
                <p className="mb-1 font-semibold">To connect Cloudflare R2, set these environment variables:</p>
                <p className="font-mono">
                  CLOUDFLARE_ACCOUNT_ID=your-account-id
                  <br />
                  R2_ACCESS_KEY_ID=your-access-key
                  <br />
                  R2_SECRET_ACCESS_KEY=your-secret-key
                  <br />
                  R2_ENDPOINT=optional, e.g. https://your-account-id.r2.cloudflarestorage.com
                </p>
              </div>
            )}
            {status.error && (
              <p className="rounded-lg bg-rose-50 px-4 py-3 text-xs text-rose-700">
                {status.error}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Status unavailable.</p>
        )}
      </section>
    </div>
  )
}

function StatusRow({
  label,
  ok,
  okText,
  failText
}: {
  label: string
  ok: boolean
  okText: string
  failText: string
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 px-4 py-3">
      <span className="text-slate-600">{label}</span>
      <span
        className={`flex items-center gap-1.5 text-right text-xs font-medium ${
          ok ? 'text-emerald-700' : 'text-rose-600'
        }`}
      >
        {ok ? (
          <CheckCircle2 className="h-4 w-4 shrink-0" />
        ) : (
          <XCircle className="h-4 w-4 shrink-0" />
        )}
        <span className="break-all">{ok ? okText : failText}</span>
      </span>
    </div>
  )
}
