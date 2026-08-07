'use client'

import { useEffect, useState } from 'react'
import { History, Loader2 } from 'lucide-react'
import { apiFetch, ApiClientError } from '@/lib/api'
import type { R2ObjectSummary } from '@/lib/types'
import { formatBytes, formatDate, formatDateRelative } from '@/lib/utils'
import { FileTypeIcon } from '@/components/file-icons'
import { Badge } from '@/components/ui/badge'

export default function RecentPage() {
  const [items, setItems] = useState<R2ObjectSummary[]>([])
  const [estimated, setEstimated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const data = await apiFetch<{ data: { items: R2ObjectSummary[]; estimated: boolean } }>(
          '/api/recent'
        )
        if (cancelled) return
        setItems(data.data.items)
        setEstimated(data.data.estimated)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof ApiClientError ? err.message : 'Failed to load recent files')
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
      <div className="mb-5 flex items-center gap-2">
        <History className="h-5 w-5 text-slate-400" />
        <h1 className="text-xl font-semibold text-slate-900">Recent files</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-24 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" /> Scanning recent files…
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          {error}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 py-16 text-center text-slate-500">
          No files found yet.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Bucket</th>
                <th className="hidden px-4 py-2.5 text-right font-medium md:table-cell">Size</th>
                <th className="px-4 py-2.5 font-medium">Modified</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.key}
                  className="border-b border-slate-100 transition last:border-0 hover:bg-slate-50"
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <FileTypeIcon type={item.type} isFolder={false} className="h-5 w-5" />
                      <span className="block truncate text-slate-700">{item.name}</span>
                      {estimated && <Badge tone="amber">estimate</Badge>}
                    </div>
                  </td>
                  <td className="hidden px-4 py-2.5 text-right text-slate-500 md:table-cell">
                    {formatBytes(item.size)}
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">
                    <span title={formatDate(item.lastModified)}>
                      {formatDateRelative(item.lastModified)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
