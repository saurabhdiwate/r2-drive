'use client'

import { useEffect, useState } from 'react'
import {
  Database,
  Files,
  HardDrive,
  Info,
  Loader2,
  RefreshCw,
  HardDriveUpload
} from 'lucide-react'
import { apiFetch, ApiClientError } from '@/lib/api'
import type { R2ObjectSummary, StorageSummary } from '@/lib/types'
import { formatBytes, formatDateRelative } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { FileTypeIcon } from '@/components/file-icons'

const TYPE_LABELS: Record<string, string> = {
  image: 'Images',
  video: 'Videos',
  audio: 'Audio',
  document: 'Documents',
  archive: 'Archives',
  code: 'Code',
  text: 'Text',
  other: 'Other'
}

const TYPE_COLORS: Record<string, string> = {
  image: 'bg-violet-500',
  video: 'bg-rose-500',
  audio: 'bg-amber-500',
  document: 'bg-blue-500',
  archive: 'bg-orange-500',
  code: 'bg-sky-500',
  text: 'bg-slate-500',
  other: 'bg-slate-300'
}

export function StorageDashboard() {
  const [summary, setSummary] = useState<StorageSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await apiFetch<{ data: StorageSummary }>('/api/storage')
      setSummary(data.data)
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to load storage summary')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" /> Scanning buckets…
      </div>
    )
  }

  if (error && !summary) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        {error}
      </div>
    )
  }

  if (!summary) return null

  const typeEntries = Object.entries(summary.byType).sort(
    (a, b) => b[1].bytes - a[1].bytes
  )
  const maxBucketBytes = Math.max(1, ...summary.buckets.map((b) => b.bytes))

  return (
    <div className="space-y-5">
      {summary.estimated && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Scanned {summary.scannedObjects.toLocaleString()} of up to{' '}
            {summary.maxScanned.toLocaleString()} objects. Values are approximate
            estimates for large buckets.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={Database}
          label="Buckets"
          value={String(summary.buckets.length)}
          tone="indigo"
        />
        <StatCard
          icon={Files}
          label="Total files"
          value={summary.totalObjects.toLocaleString()}
          tone="blue"
        />
        <StatCard
          icon={HardDrive}
          label="Storage used"
          value={formatBytes(summary.totalBytes)}
          tone="emerald"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-800">Storage by bucket</h3>
          <ul className="space-y-3">
            {summary.buckets.length === 0 && (
              <li className="text-sm text-slate-500">No buckets accessible.</li>
            )}
            {summary.buckets.map((bucket) => (
              <li key={bucket.name}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">{bucket.name}</span>
                  <span className="text-slate-500">
                    {formatBytes(bucket.bytes)} · {bucket.objectCount.toLocaleString()} files
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-indigo-500"
                    style={{ width: `${(bucket.bytes / maxBucketBytes) * 100}%` }}
                  />
                </div>
                {bucket.truncated && (
                  <p className="mt-0.5 text-xs text-amber-600">estimate</p>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-800">Files by type</h3>
          {typeEntries.length === 0 ? (
            <p className="text-sm text-slate-500">No files found.</p>
          ) : (
            <ul className="space-y-2">
              {typeEntries.map(([type, { count, bytes }]) => (
                <li key={type} className="flex items-center gap-3 text-sm">
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${TYPE_COLORS[type] ?? 'bg-slate-300'}`}
                  />
                  <span className="w-24 text-slate-700">
                    {TYPE_LABELS[type] ?? type}
                  </span>
                  <span className="flex-1 text-right text-slate-500">
                    {count.toLocaleString()} files
                  </span>
                  <span className="w-20 text-right font-medium text-slate-700">
                    {formatBytes(bytes)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
            <HardDrive className="h-4 w-4 text-slate-400" /> Largest files
          </h3>
          <FileList
            items={summary.largestFiles}
            empty="No files found."
            showSize
          />
        </section>

        <section className="card p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
            <HardDriveUpload className="h-4 w-4 text-slate-400" /> Recently modified
          </h3>
          <FileList
            items={summary.recentModified}
            empty="No files found."
            showDate
          />
        </section>
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone
}: {
  icon: typeof Database
  label: string
  value: string
  tone: string
}) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-xl ${
          tone === 'indigo'
            ? 'bg-indigo-100 text-indigo-600'
            : tone === 'blue'
              ? 'bg-sky-100 text-sky-600'
              : 'bg-emerald-100 text-emerald-600'
        }`}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          {label}
        </p>
        <p className="text-xl font-semibold text-slate-900">{value}</p>
      </div>
    </div>
  )
}

function FileList({
  items,
  empty,
  showSize,
  showDate
}: {
  items: R2ObjectSummary[]
  empty: string
  showSize?: boolean
  showDate?: boolean
}) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500">{empty}</p>
  }
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.key} className="flex items-center gap-3 text-sm">
          <FileTypeIcon type={item.type} isFolder={item.isFolder} className="h-4 w-4" />
          <span className="min-w-0 flex-1 truncate text-slate-700">{item.key}</span>
          {showSize && (
            <span className="shrink-0 text-slate-500">{formatBytes(item.size)}</span>
          )}
          {showDate && (
            <span className="shrink-0 text-slate-500">
              {formatDateRelative(item.lastModified)}
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}

export function DashboardHeader({ refreshing, onRefresh }: { refreshing: boolean; onRefresh: () => void }) {
  return (
    <div className="mb-5 flex items-center justify-between">
      <h1 className="text-xl font-semibold text-slate-900">Storage Dashboard</h1>
      <Button variant="secondary" onClick={onRefresh} disabled={refreshing}>
        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
      </Button>
    </div>
  )
}
