'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Calendar, FolderOpen, HardDrive, Loader2, MapPin } from 'lucide-react'
import { apiFetch, ApiClientError } from '@/lib/api'
import type { R2BucketInfo, StorageSummary } from '@/lib/types'
import { formatBytes, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export default function BucketsPage() {
  const [buckets, setBuckets] = useState<R2BucketInfo[]>([])
  const [stats, setStats] = useState<StorageSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const [bucketData, statsData] = await Promise.all([
          apiFetch<{ data: R2BucketInfo[] }>('/api/buckets'),
          apiFetch<{ data: StorageSummary }>('/api/storage')
        ])
        if (cancelled) return
        setBuckets(bucketData.data)
        setStats(statsData.data)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof ApiClientError ? err.message : 'Failed to load buckets')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="p-4 lg:p-6">
      <h1 className="mb-5 text-xl font-semibold text-slate-900">Buckets</h1>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-24 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading buckets…
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          {error}
        </div>
      ) : buckets.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 py-16 text-center">
          <HardDrive className="h-12 w-12 text-slate-300" />
          <p className="text-slate-600">No Cloudflare R2 buckets are accessible.</p>
          <p className="text-sm text-slate-400">
            Verify your R2 credentials in Settings, then test the connection.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {buckets.map((bucket) => {
            const stat = stats?.buckets.find((b) => b.name === bucket.name)
            return (
              <div key={bucket.name} className="card flex flex-col gap-3 p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                    <HardDrive className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {bucket.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {stat
                        ? `${stat.objectCount.toLocaleString()} files · ${formatBytes(stat.bytes)}`
                        : 'Loading stats…'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  {bucket.creationDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(bucket.creationDate)}
                    </span>
                  )}
                  {bucket.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {bucket.location}
                    </span>
                  )}
                </div>
                <Link
                  href={`/files?path=&bucket=${encodeURIComponent(bucket.name)}`}
                  className="mt-auto"
                >
                  <Button variant="secondary" className="w-full">
                    <FolderOpen className="h-4 w-4" /> Open files
                  </Button>
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
