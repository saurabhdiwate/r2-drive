'use client'

import {
  CheckCircle2,
  CloudUpload,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  Trash2,
  X,
  XCircle
} from 'lucide-react'
import { useUploads } from '@/lib/upload/upload-context'
import { formatBytes, formatSpeed } from '@/lib/utils'
import { cn } from '@/lib/utils'

export function UploadQueue({
  open,
  onClose
}: {
  open: boolean
  onClose: () => void
}) {
  const { items, pause, resume, retry, cancel, clearCompleted } = useUploads()

  if (!open) return null

  const completedCount = items.filter(
    (i) => i.status === 'completed' || i.status === 'cancelled'
  ).length

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <CloudUpload className="h-4 w-4 text-indigo-600" />
          Uploads
        </h2>
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Close uploads"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-slate-400">
            <CloudUpload className="h-10 w-10" />
            <p className="text-sm">No uploads yet</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {item.name}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {formatBytes(item.size)}
                      {item.multipart && (
                        <span className="ml-1 rounded bg-indigo-50 px-1 text-indigo-600">
                          multipart
                        </span>
                      )}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-slate-700">
                    {item.status === 'completed'
                      ? '100%'
                      : item.status === 'failed'
                        ? 'Failed'
                        : item.status === 'cancelled'
                          ? 'Cancelled'
                          : item.status === 'paused'
                            ? 'Paused'
                            : `${item.progress}%`}
                  </span>
                </div>

                {(item.status === 'uploading' ||
                  item.status === 'paused' ||
                  item.status === 'queued') && (
                  <div className="mt-2">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-indigo-600 transition-all"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-slate-500">
                      {item.status === 'paused' ? (
                        'Paused'
                      ) : item.status === 'queued' ? (
                        'Waiting…'
                      ) : (
                        <>
                          {formatBytes(item.uploadedBytes)} of {formatBytes(item.size)} ·{' '}
                          {formatSpeed(item.speedBps)}
                        </>
                      )}
                    </p>
                  </div>
                )}

                {item.error && (
                  <p className="mt-1.5 text-xs text-rose-600">{item.error}</p>
                )}

                <div className="mt-2 flex items-center gap-1">
                  {(item.status === 'uploading' || item.status === 'queued') && (
                    <button
                      onClick={() => pause(item.id)}
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                      title="Pause"
                    >
                      <Pause className="h-4 w-4" />
                    </button>
                  )}
                  {item.status === 'paused' && (
                    <button
                      onClick={() => resume(item.id)}
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                      title="Resume"
                    >
                      <Play className="h-4 w-4" />
                    </button>
                  )}
                  {(item.status === 'failed' || item.status === 'paused') && (
                    <button
                      onClick={() => retry(item.id)}
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                      title="Retry"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  )}
                  {item.status !== 'completed' && item.status !== 'cancelled' && (
                    <button
                      onClick={() => cancel(item.id)}
                      className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50"
                      title="Cancel"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  )}
                  {item.status === 'completed' && (
                    <CheckCircle2 className="ml-auto h-4 w-4 text-emerald-500" />
                  )}
                  {item.status === 'uploading' && (
                    <Loader2 className="ml-auto h-4 w-4 animate-spin text-indigo-500" />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {completedCount > 0 && (
        <div className="border-t border-slate-200 p-3">
          <button
            onClick={clearCompleted}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
          >
            <Trash2 className="h-4 w-4" /> Clear completed ({completedCount})
          </button>
        </div>
      )}
    </div>
  )
}

export function UploadQueueButton({
  onClick,
  className
}: {
  onClick: () => void
  className?: string
}) {
  const { items, isUploading } = useUploads()
  const active = items.filter((i) => i.status !== 'completed' && i.status !== 'cancelled')
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50',
        className
      )}
    >
      <CloudUpload className={cn('h-4 w-4', isUploading && 'animate-pulse text-indigo-600')} />
      Uploads
      {active.length > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1 text-xs font-semibold text-white">
          {active.length}
        </span>
      )}
    </button>
  )
}
