'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FolderOpen, Loader2, PackageOpen, X } from 'lucide-react'
import { Toolbar } from '@/components/files/toolbar'
import { Breadcrumbs } from '@/components/files/breadcrumbs'
import { ListView, type ClickModifiers, type ItemCallbacks } from '@/components/files/list-view'
import { GridView } from '@/components/files/grid-view'
import { UploadDropzone } from '@/components/files/upload-dropzone'
import { UploadQueue } from '@/components/upload/upload-queue'
import { PreviewModal } from '@/components/preview/preview-modal'
import { ShareModal } from '@/components/share/share-modal'
import { DetailsPanel, type ObjectHeadMeta } from '@/components/details/details-panel'
import { ConfirmDialog } from '@/components/dialogs/confirm-dialog'
import { PromptDialog } from '@/components/dialogs/prompt-dialog'
import { MoveCopyDialog } from '@/components/dialogs/move-copy-dialog'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'
import { useUploads } from '@/lib/upload/upload-context'
import { collectDroppedFiles, type DroppedFile } from '@/lib/upload/uploader'
import { apiFetch, ApiClientError } from '@/lib/api'
import type {
  FileCategory,
  R2BucketInfo,
  R2ObjectSummary,
  SearchResult,
  SortState
} from '@/lib/types'
import {
  applySort,
  basename,
  matchesCategoryFilter
} from '@/lib/utils'

interface OperationProgress {
  label: string
  done: number
  total: number
}

export function FilesPage() {
  const { toast } = useToast()
  const { addFiles } = useUploads()

  const [buckets, setBuckets] = useState<R2BucketInfo[]>([])
  const [bucket, setBucket] = useState('')
  const [path, setPath] = useState<string[]>([])
  const [items, setItems] = useState<R2ObjectSummary[]>([])
  const [continuationToken, setContinuationToken] = useState<string | undefined>()
  const [truncated, setTruncated] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadMore, setLoadMore] = useState(false)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const [view, setView] = useState<'list' | 'grid'>('list')
  const [sort, setSort] = useState<SortState>({ field: 'name', dir: 'asc' })
  const [filter, setFilter] = useState<FileCategory | 'all'>('all')
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<R2ObjectSummary[]>([])

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const lastSelectedRef = useRef(-1)

  const [detailsItem, setDetailsItem] = useState<R2ObjectSummary | null>(null)
  const [detailsMeta, setDetailsMeta] = useState<ObjectHeadMeta | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)

  const [previewItem, setPreviewItem] = useState<R2ObjectSummary | null>(null)
  const [shareItem, setShareItem] = useState<R2ObjectSummary | null>(null)
  const [renameItem, setRenameItem] = useState<R2ObjectSummary | null>(null)
  const [newFolderOpen, setNewFolderOpen] = useState(false)
  const [moveCopy, setMoveCopy] = useState<{
    mode: 'move' | 'copy'
    keys: string[]
  } | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{
    keys: string[]
    singleKey: string
  } | null>(null)

  const [queueOpen, setQueueOpen] = useState(false)
  const [opProgress, setOpProgress] = useState<OperationProgress | null>(null)

  const prefix = path.length ? path.join('/') + '/' : ''
  const searchMode = query.trim().length > 0

  // ---------- bucket bootstrap ----------
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const data = await apiFetch<{ data: R2BucketInfo[] }>('/api/buckets')
        if (cancelled) return
        setBuckets(data.data)
        const urlBucket = new URLSearchParams(window.location.search).get('bucket')
        const saved = urlBucket ?? localStorage.getItem('r2fm-bucket')
        const initial =
          data.data.find((b) => b.name === saved)?.name ?? data.data[0]?.name ?? ''
        setBucket(initial)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof ApiClientError ? err.message : 'Failed to load buckets')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // ---------- url path sync ----------
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const p = params.get('path')
    if (p) setPath(p.split('/').filter(Boolean))
  }, [])

  useEffect(() => {
    const url = new URL(window.location.href)
    if (path.length) url.searchParams.set('path', path.join('/'))
    else url.searchParams.delete('path')
    window.history.replaceState(null, '', url.toString())
  }, [path])

  // ---------- folder loading ----------
  const fetchPage = useCallback(
    async (token?: string, append = false) => {
      if (!bucket) return
      if (append) setLoadMore(true)
      else setLoading(true)
      setError('')
      try {
        const params = new URLSearchParams({ bucket, prefix })
        if (token) params.set('continuationToken', token)
        const data = await apiFetch<{
          data: { items: R2ObjectSummary[]; continuationToken?: string; truncated: boolean }
        }>(`/api/objects?${params.toString()}`)
        if (append) {
          setItems((prev) => [...prev, ...data.data.items])
        } else {
          setItems(data.data.items)
        }
        setContinuationToken(data.data.continuationToken)
        setTruncated(data.data.truncated)
      } catch (err) {
        setError(err instanceof ApiClientError ? err.message : 'Failed to load folder')
      } finally {
        setLoading(false)
        setLoadMore(false)
      }
    },
    [bucket, prefix]
  )

  useEffect(() => {
    if (bucket) void fetchPage()
  }, [bucket, prefix, reloadKey, fetchPage])

  // ---------- search ----------
  useEffect(() => {
    if (!bucket || !searchMode) {
      setSearchResults([])
      return
    }
    let cancelled = false
    setSearching(true)
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const params = new URLSearchParams({ bucket, q: query.trim() })
          const data = await apiFetch<{ data: SearchResult }>(`/api/search?${params.toString()}`)
          if (!cancelled) setSearchResults(data.data.items)
        } catch {
          if (!cancelled) setSearchResults([])
        } finally {
          if (!cancelled) setSearching(false)
        }
      })()
    }, 400)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [bucket, query, searchMode])

  // ---------- derived list ----------
  const displayItems = useMemo(() => {
    const source = searchMode ? searchResults : items
    const filtered = source.filter((item) => matchesCategoryFilter(item, filter))
    return applySort(filtered, sort)
  }, [searchMode, searchResults, items, filter, sort])

  // ---------- selection ----------
  const handleItemClick = (item: R2ObjectSummary, event: ClickModifiers) => {
    const index = items.indexOf(item)
    const multi = Boolean(event.ctrlKey || event.metaKey)
    const shift = Boolean(event.shiftKey)

    if (shift && lastSelectedRef.current >= 0) {
      const start = Math.min(lastSelectedRef.current, index)
      const end = Math.max(lastSelectedRef.current, index)
      setSelected((prev) => {
        const next = new Set(prev)
        for (let i = start; i <= end; i++) {
          const key = items[i]?.key
          if (key) next.add(key)
        }
        return next
      })
    } else if (multi) {
      setSelected((prev) => {
        const next = new Set(prev)
        if (next.has(item.key)) next.delete(item.key)
        else next.add(item.key)
        return next
      })
    } else {
      setSelected(new Set([item.key]))
    }
    lastSelectedRef.current = index
  }

  useEffect(() => {
    if (selected.size === 1) {
      const item = items.find((i) => i.key === [...selected][0])
      setDetailsItem(item ?? null)
    } else {
      setDetailsItem(null)
      setDetailsMeta(null)
    }
  }, [selected, items])

  useEffect(() => {
    if (!detailsItem || detailsItem.isFolder) return
    let cancelled = false
    setDetailsLoading(true)
    void (async () => {
      try {
        const params = new URLSearchParams({ bucket, key: detailsItem.key })
        const data = await apiFetch<{ data: ObjectHeadMeta }>(`/api/objects/head?${params.toString()}`)
        if (!cancelled) setDetailsMeta(data.data)
      } catch {
        if (!cancelled) setDetailsMeta(null)
      } finally {
        if (!cancelled) setDetailsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [detailsItem, bucket])

  // ---------- uploads ----------
  const handleDrop = (dropped: DroppedFile[]) => {
    addFiles(
      dropped.map((d) => ({
        file: d.file,
        name: d.relativePath,
        bucket,
        targetPrefix: prefix
      }))
    )
    toast(`Added ${dropped.length} file${dropped.length === 1 ? '' : 's'} to uploads`, 'success')
    setQueueOpen(true)
  }

  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  const handleFileInput = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (files.length > 0) {
      handleDrop(files.map((f) => ({ file: f, relativePath: f.name })))
    }
  }

  const handleFolderInput = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (files.length > 0) {
      const dropped = files.map((f) => ({
        file: f,
        relativePath: f.webkitRelativePath || f.name
      }))
      handleDrop(dropped)
    }
  }

  // ---------- folder ops ----------
  const refresh = () => setReloadKey((k) => k + 1)

  const navigateToFolder = (folderName: string) => {
    setPath((prev) => [...prev, folderName])
    setSelected(new Set())
  }

  const navigateBreadcrumb = (index: number) => {
    setPath(index < 0 ? [] : path.slice(0, index + 1))
    setSelected(new Set())
  }

  const openItem = (item: R2ObjectSummary) => {
    if (item.isFolder) navigateToFolder(item.name)
    else setPreviewItem(item)
  }

  // ---------- actions ----------
  const createNewFolder = async (name: string) => {
    try {
      await apiFetch('/api/objects/folder', {
        method: 'POST',
        body: { bucket, key: prefix + name }
      })
      toast('Folder created', 'success')
      setNewFolderOpen(false)
      refresh()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to create folder', 'error')
    }
  }

  const renameItemFn = async (newName: string) => {
    if (!renameItem) return
    try {
      await apiFetch('/api/objects/rename', {
        method: 'POST',
        body: { bucket, sourceKey: renameItem.key, newName }
      })
      toast('Renamed successfully', 'success')
      setRenameItem(null)
      refresh()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Rename failed', 'error')
    }
  }

  const runSequentialOps = async (
    label: string,
    keys: string[],
    op: (key: string, index: number) => Promise<void>
  ) => {
    setOpProgress({ label, done: 0, total: keys.length })
    let failed = 0
    for (let i = 0; i < keys.length; i++) {
      setOpProgress((p) => (p ? { ...p, done: i } : p))
      try {
        await op(keys[i], i)
      } catch (err) {
        failed += 1
        toast(`Operation failed for "${basename(keys[i])}": ${err instanceof Error ? err.message : 'unknown error'}`, 'error')
      }
    }
    setOpProgress(null)
    refresh()
    if (failed === 0) {
      toast(`${label} completed`, 'success')
    } else {
      toast(`${label} finished with ${failed} error(s)`, 'warning')
    }
  }

  const confirmMoveCopy = async (destinationPrefix: string) => {
    if (!moveCopy) return
    const { mode, keys } = moveCopy
    setMoveCopy(null)
    await runSequentialOps(
      mode === 'move' ? 'Move' : 'Copy',
      keys,
      async (key) => {
        const destKey =
          destinationPrefix + basename(key) + (key.endsWith('/') ? '/' : '')
        await apiFetch(`/api/objects/${mode}`, {
          method: 'POST',
          body: { bucket, sourceKey: key, destinationKey: destKey }
        })
      }
    )
  }

  const confirmDelete = async () => {
    if (!deleteConfirm) return
    const { keys } = deleteConfirm
    setDeleteConfirm(null)
    setSelected(new Set())
    await runSequentialOps('Delete', keys, async (key) => {
      await apiFetch('/api/objects/delete', {
        method: 'POST',
        body: { bucket, key }
      })
    })
  }

  const downloadItem = (item: R2ObjectSummary) => {
    if (item.isFolder) {
      toast('Folders cannot be downloaded directly', 'info')
      return
    }
    const params = new URLSearchParams({ bucket, key: item.key, name: item.name })
    window.open(`/api/download?${params.toString()}`, '_blank')
  }

  const deleteSelected = (keys: string[]) => {
    setDeleteConfirm({ keys, singleKey: keys[0] })
  }

  const callbacks: ItemCallbacks = {
    onOpen: openItem,
    onPreview: (item) => setPreviewItem(item),
    onDownload: downloadItem,
    onShare: (item) => setShareItem(item),
    onRename: (item) => setRenameItem(item),
    onMove: (item) => setMoveCopy({ mode: 'move', keys: [item.key] }),
    onCopy: (item) => setMoveCopy({ mode: 'copy', keys: [item.key] }),
    onDelete: (item) => deleteSelected([item.key])
  }

  const selectedKeys = useMemo(
    () => Array.from(selected).filter((k) => items.some((i) => i.key === k)),
    [selected, items]
  )

  // ---------- render ----------
  return (
    <div className="flex h-full">
      <div className="flex min-w-0 flex-1 flex-col gap-4 p-4 lg:p-6">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          hidden
          onChange={handleFileInput}
        />
        <input
          ref={folderInputRef}
          type="file"
          multiple
          hidden
          onChange={handleFolderInput}
          {...({ webkitdirectory: '' } as Record<string, string>)}
        />

        {bucket && <Breadcrumbs crumbs={path} onNavigate={navigateBreadcrumb} />}

        <Toolbar
          buckets={buckets}
          bucket={bucket}
          onBucketChange={(name) => {
            setBucket(name)
            setPath([])
            localStorage.setItem('r2fm-bucket', name)
            const url = new URL(window.location.href)
            url.searchParams.set('bucket', name)
            url.searchParams.delete('path')
            window.history.replaceState(null, '', url.toString())
          }}
          view={view}
          onViewChange={setView}
          sort={sort}
          onSortChange={setSort}
          filter={filter}
          onFilterChange={setFilter}
          query={query}
          onQueryChange={setQuery}
          onUploadFiles={() => fileInputRef.current?.click()}
          onUploadFolder={() => folderInputRef.current?.click()}
          onNewFolder={() => setNewFolderOpen(true)}
          onRefresh={refresh}
          onOpenUploads={() => setQueueOpen(true)}
          refreshing={loading}
        />

        {selectedKeys.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm">
            <span className="font-medium text-indigo-700">
              {selectedKeys.length} selected
            </span>
            <div className="ml-auto flex gap-2">
              <Button
                variant="secondary"
                onClick={() => setMoveCopy({ mode: 'move', keys: selectedKeys })}
              >
                Move
              </Button>
              <Button
                variant="secondary"
                onClick={() => setMoveCopy({ mode: 'copy', keys: selectedKeys })}
              >
                Copy
              </Button>
              <Button variant="danger" onClick={() => deleteSelected(selectedKeys)}>
                Delete
              </Button>
              <Button variant="ghost" onClick={() => setSelected(new Set())}>
                <X className="h-4 w-4" /> Clear
              </Button>
            </div>
          </div>
        )}

        {!bucket && buckets.length === 0 && !loading ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 py-16 text-center">
            <PackageOpen className="h-12 w-12 text-slate-300" />
            <p className="text-slate-600">
              {error ? 'Could not connect to Cloudflare R2.' : 'No buckets available.'}
            </p>
            <p className="max-w-md text-sm text-slate-400">
              {error ?? 'Check your R2 configuration in Settings, then test the connection.'}
            </p>
            {error && <Button onClick={() => window.location.reload()}>Reload</Button>}
          </div>
        ) : bucket ? (
          <UploadDropzone onFiles={handleDrop} disabled={searchMode}>
            <div className="flex h-full flex-col">
              {loading ? (
                <div className="flex flex-1 items-center justify-center gap-2 py-20 text-slate-500">
                  <Spinner /> Loading…
                </div>
              ) : displayItems.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
                  <FolderOpen className="h-12 w-12 text-slate-200" />
                  <p className="text-slate-600">
                    {searchMode ? 'No files match your search.' : 'This folder is empty.'}
                  </p>
                  {!searchMode && (
                    <p className="text-sm text-slate-400">
                      Drop files here or use the Upload button.
                    </p>
                  )}
                </div>
              ) : view === 'list' ? (
                <ListView
                  items={displayItems}
                  selected={selected}
                  onItemClick={handleItemClick}
                  callbacks={callbacks}
                />
              ) : (
                <GridView
                  items={displayItems}
                  selected={selected}
                  onItemClick={handleItemClick}
                  callbacks={callbacks}
                />
              )}

              {searching && (
                <div className="flex items-center justify-center gap-2 py-3 text-sm text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" /> Searching bucket…
                </div>
              )}

              {!searchMode && truncated && (
                <div className="mt-4 flex justify-center">
                  <Button
                    variant="secondary"
                    loading={loadMore}
                    onClick={() => void fetchPage(continuationToken, true)}
                  >
                    Load more
                  </Button>
                </div>
              )}
            </div>
          </UploadDropzone>
        ) : null}
      </div>

      <DetailsPanel
        open={Boolean(detailsItem && !detailsItem.isFolder)}
        item={detailsItem}
        meta={detailsMeta}
        loading={detailsLoading}
        onClose={() => setSelected(new Set())}
        onPreview={(item) => setPreviewItem(item)}
        onDownload={downloadItem}
        onShare={(item) => setShareItem(item)}
        onRename={(item) => setRenameItem(item)}
        onMove={(item) => setMoveCopy({ mode: 'move', keys: [item.key] })}
        onCopy={(item) => setMoveCopy({ mode: 'copy', keys: [item.key] })}
        onDelete={(item) => deleteSelected([item.key])}
      />

      <UploadQueue open={queueOpen} onClose={() => setQueueOpen(false)} />

      <PreviewModal
        open={Boolean(previewItem)}
        bucket={bucket}
        item={previewItem}
        onClose={() => setPreviewItem(null)}
        onDownload={downloadItem}
      />

      <ShareModal
        open={Boolean(shareItem)}
        bucket={bucket}
        item={shareItem}
        onClose={() => setShareItem(null)}
      />

      <PromptDialog
        open={newFolderOpen}
        title="New folder"
        label="Folder name"
        placeholder="e.g. Documents"
        submitLabel="Create"
        onSubmit={createNewFolder}
        onCancel={() => setNewFolderOpen(false)}
      />

      <PromptDialog
        open={Boolean(renameItem)}
        title={renameItem?.isFolder ? 'Rename folder' : 'Rename file'}
        label="New name"
        initialValue={renameItem?.name ?? ''}
        submitLabel="Rename"
        onSubmit={renameItemFn}
        onCancel={() => setRenameItem(null)}
      />

      <MoveCopyDialog
        open={Boolean(moveCopy)}
        mode={moveCopy?.mode ?? 'move'}
        bucket={bucket}
        sourceKey={moveCopy?.keys[0] ?? ''}
        onConfirm={confirmMoveCopy}
        onCancel={() => setMoveCopy(null)}
        submitting={Boolean(opProgress)}
      />

      <ConfirmDialog
        open={Boolean(deleteConfirm)}
        title="Delete"
        message={
          deleteConfirm?.keys.length === 1 ? (
            <>
              Permanently delete{' '}
              <span className="font-medium text-slate-800">
                “{basename(deleteConfirm.singleKey)}”
              </span>
              {deleteConfirm.singleKey.endsWith('/') && ' and everything inside it'}?
            </>
          ) : (
            <>Permanently delete {deleteConfirm?.keys.length} selected items?</>
          )
        }
        confirmLabel="Delete"
        loading={Boolean(opProgress)}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm(null)}
      />

      {opProgress && (
        <div className="fixed inset-x-0 top-4 z-[70] flex justify-center px-4">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xl">
            <Spinner className="h-5 w-5" />
            <div>
              <p className="text-sm font-medium text-slate-800">{opProgress.label}…</p>
              {opProgress.total > 1 && (
                <p className="text-xs text-slate-500">
                  {opProgress.done} of {opProgress.total} items
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
