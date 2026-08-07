'use client'

import {
  Copy,
  Download,
  Eye,
  FilePenLine,
  FolderInput,
  Loader2,
  Share2,
  Trash2,
  X
} from 'lucide-react'
import { FileTypeIcon } from '@/components/file-icons'
import { Button } from '@/components/ui/button'
import type { R2ObjectSummary } from '@/lib/types'
import { formatBytes, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

export interface ObjectHeadMeta {
  key: string
  size: number
  lastModified: string
  etag?: string
  contentType?: string
  storageClass?: string
  metadata?: Record<string, string>
}

interface DetailsPanelProps {
  open: boolean
  item: R2ObjectSummary | null
  meta: ObjectHeadMeta | null
  loading: boolean
  onClose: () => void
  onPreview: (item: R2ObjectSummary) => void
  onDownload: (item: R2ObjectSummary) => void
  onShare: (item: R2ObjectSummary) => void
  onRename: (item: R2ObjectSummary) => void
  onMove: (item: R2ObjectSummary) => void
  onCopy: (item: R2ObjectSummary) => void
  onDelete: (item: R2ObjectSummary) => void
}

export function DetailsPanel({
  open,
  item,
  meta,
  loading,
  onClose,
  onPreview,
  onDownload,
  onShare,
  onRename,
  onMove,
  onCopy,
  onDelete
}: DetailsPanelProps) {
  if (!open || !item) return null

  return (
    <aside className="flex w-full shrink-0 flex-col border-t border-slate-200 bg-white lg:w-80 lg:border-l lg:border-t-0">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-700">Details</h3>
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Close details"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4 flex items-center gap-3">
          <FileTypeIcon
            type={item.type}
            isFolder={item.isFolder}
            className="h-10 w-10"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-800">{item.name}</p>
            <p className="text-xs text-slate-500">
              {item.isFolder ? 'Folder' : `${item.type} · ${formatBytes(item.size)}`}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading metadata…
          </div>
        ) : (
          <dl className="space-y-3 text-sm">
            {!item.isFolder && (
              <Row label="Size" value={formatBytes(meta?.size ?? item.size)} />
            )}
            <Row
              label="Modified"
              value={formatDate(meta?.lastModified ?? item.lastModified)}
            />
            {!item.isFolder && <Row label="Type" value={item.type} />}
            <div>
              <dt className="mb-0.5 text-xs font-medium uppercase tracking-wide text-slate-400">
                Object key
              </dt>
              <dd className="break-all rounded-lg bg-slate-50 px-2 py-1.5 font-mono text-xs text-slate-600">
                {meta?.key ?? item.key}
              </dd>
            </div>
            {!item.isFolder && meta?.contentType && (
              <Row label="Content type" value={meta.contentType} />
            )}
            {!item.isFolder && meta?.storageClass && (
              <Row label="Storage class" value={meta.storageClass} />
            )}
            {!item.isFolder && meta?.etag && (
              <Row label="ETag" value={meta.etag} mono />
            )}
            {meta?.metadata && Object.keys(meta.metadata).length > 0 && (
              <div>
                <dt className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                  Metadata
                </dt>
                <dd className="space-y-1">
                  {Object.entries(meta.metadata).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-2 text-xs">
                      <span className="text-slate-500">{k}</span>
                      <span className="break-all text-right text-slate-700">{v}</span>
                    </div>
                  ))}
                </dd>
              </div>
            )}
          </dl>
        )}

        <div className="mt-5 grid grid-cols-2 gap-2">
          {!item.isFolder && (
            <Button variant="secondary" className="!px-2" onClick={() => onPreview(item)}>
              <Eye className="h-4 w-4" /> Preview
            </Button>
          )}
          <Button variant="secondary" className="!px-2" onClick={() => onDownload(item)}>
            <Download className="h-4 w-4" /> Download
          </Button>
          {!item.isFolder && (
            <Button variant="secondary" className="!px-2" onClick={() => onShare(item)}>
              <Share2 className="h-4 w-4" /> Share
            </Button>
          )}
          <Button variant="secondary" className="!px-2" onClick={() => onRename(item)}>
            <FilePenLine className="h-4 w-4" /> Rename
          </Button>
          <Button variant="secondary" className="!px-2" onClick={() => onMove(item)}>
            <FolderInput className="h-4 w-4" /> Move
          </Button>
          <Button variant="secondary" className="!px-2" onClick={() => onCopy(item)}>
            <Copy className="h-4 w-4" /> Copy
          </Button>
          <Button
            variant="danger"
            className="!px-2 col-span-2"
            onClick={() => onDelete(item)}
          >
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </div>
      </div>
    </aside>
  )
}

function Row({
  label,
  value,
  mono
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </dt>
      <dd
        className={cn(
          'break-all text-right text-xs text-slate-700',
          mono && 'font-mono'
        )}
      >
        {value}
      </dd>
    </div>
  )
}
