'use client'

import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, Folder, Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { apiFetch, ApiClientError } from '@/lib/api'
import type { R2ObjectSummary } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'

interface MoveCopyDialogProps {
  open: boolean
  mode: 'move' | 'copy'
  bucket: string
  sourceKey: string
  onConfirm: (destinationKey: string) => void
  onCancel: () => void
  submitting?: boolean
}

interface FolderPickerState {
  crumbs: string[]
}

export function MoveCopyDialog({
  open,
  mode,
  bucket,
  sourceKey,
  onConfirm,
  onCancel,
  submitting
}: MoveCopyDialogProps) {
  const [crumbs, setCrumbs] = useState<string[]>([])
  const [folders, setFolders] = useState<R2ObjectSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { toast } = useToast()

  const prefix = crumbs.length ? crumbs.join('/') + '/' : ''

  const loadFolders = useCallback(
    async (path: string[]) => {
      setLoading(true)
      setError('')
      try {
        const p = path.length ? path.join('/') + '/' : ''
        const data = await apiFetch<{
          ok: boolean
          data: { items: R2ObjectSummary[] }
        }>(`/api/objects?bucket=${encodeURIComponent(bucket)}&prefix=${encodeURIComponent(p)}`)
        setFolders(data.data.items.filter((item) => item.isFolder))
      } catch (err) {
        setError(err instanceof ApiClientError ? err.message : 'Failed to load folders')
      } finally {
        setLoading(false)
      }
    },
    [bucket]
  )

  useEffect(() => {
    if (open) {
      const initial: string[] = []
      const segments = sourceKey
        .split('/')
        .filter(Boolean)
        .slice(0, -1)
      for (const segment of segments) {
        initial.push(segment)
      }
      setCrumbs(initial)
      void loadFolders(initial)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, bucket, sourceKey])

  const navigateTo = (folder: R2ObjectSummary) => {
    const next = [...crumbs, folder.name]
    setCrumbs(next)
    void loadFolders(next)
  }

  const goUp = () => {
    const next = crumbs.slice(0, -1)
    setCrumbs(next)
    void loadFolders(next)
  }

  const handleConfirm = () => {
    // Moving: refuse to move a folder into its own subtree.
    const destination = prefix
    if (sourceKey.endsWith('/')) {
      if (destination.startsWith(sourceKey)) {
        toast('Cannot move a folder into itself', 'error')
        return
      }
    } else {
      const parentOfSource = sourceKey.slice(0, sourceKey.lastIndexOf('/') + 1)
      if (destination === parentOfSource) {
        toast('The file is already in this folder', 'error')
        return
      }
    }
    onConfirm(destination)
  }

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={mode === 'move' ? 'Move to folder' : 'Copy to folder'}
      size="sm"
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm">
          <button
            onClick={() => {
              setCrumbs([])
              void loadFolders([])
            }}
            className={cn(
              'rounded px-1.5 py-0.5 font-medium hover:bg-slate-200',
              crumbs.length === 0 ? 'text-indigo-600' : 'text-slate-600'
            )}
          >
            Bucket root
          </button>
          {crumbs.map((crumb, index) => (
            <span key={crumb + index} className="flex items-center gap-1">
              <span className="text-slate-400">/</span>
              <button
                onClick={() => {
                  const next = crumbs.slice(0, index + 1)
                  setCrumbs(next)
                  void loadFolders(next)
                }}
                className={cn(
                  'rounded px-1.5 py-0.5 font-medium hover:bg-slate-200',
                  index === crumbs.length - 1
                    ? 'text-indigo-600'
                    : 'text-slate-600'
                )}
              >
                {crumb}
              </button>
            </span>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading folders…
          </div>
        ) : folders.length === 0 ? (
          <div className="py-6 text-center text-sm text-slate-500">
            No sub-folders here.
          </div>
        ) : (
          <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200">
            {folders.map((folder) => (
              <button
                key={folder.key}
                onClick={() => navigateTo(folder)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-indigo-50"
              >
                <Folder className="h-4 w-4 text-indigo-500" />
                <span className="truncate">{folder.name}</span>
              </button>
            ))}
          </div>
        )}

        {crumbs.length > 0 && (
          <Button variant="secondary" onClick={goUp} disabled={loading}>
            <ChevronLeft className="h-4 w-4" /> Go up
          </Button>
        )}

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <p className="text-xs text-slate-500">
          Destination prefix: <code className="rounded bg-slate-100 px-1">{prefix || '(bucket root)'}</code>
        </p>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} loading={submitting}>
            {mode === 'move' ? 'Move here' : 'Copy here'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
