'use client'

import {
  ArrowDownAZ,
  ArrowUpAZ,
  FolderPlus,
  LayoutGrid,
  List,
  RefreshCw,
  Search,
  Upload,
  X
} from 'lucide-react'
import type {
  FileCategory,
  R2BucketInfo,
  SortDir,
  SortField,
  SortState
} from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Menu, MenuItem } from '@/components/ui/menu'
import { UploadQueueButton } from '@/components/upload/upload-queue'
import { cn } from '@/lib/utils'

const CATEGORY_OPTIONS: { value: FileCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'image', label: 'Images' },
  { value: 'video', label: 'Videos' },
  { value: 'audio', label: 'Audio' },
  { value: 'document', label: 'Documents' },
  { value: 'archive', label: 'Archives' },
  { value: 'code', label: 'Code' },
  { value: 'other', label: 'Other' }
]

interface ToolbarProps {
  buckets: R2BucketInfo[]
  bucket: string
  onBucketChange: (name: string) => void
  view: 'list' | 'grid'
  onViewChange: (view: 'list' | 'grid') => void
  sort: SortState
  onSortChange: (sort: SortState) => void
  filter: FileCategory | 'all'
  onFilterChange: (filter: FileCategory | 'all') => void
  query: string
  onQueryChange: (query: string) => void
  onUploadFiles: () => void
  onUploadFolder: () => void
  onNewFolder: () => void
  onRefresh: () => void
  onOpenUploads: () => void
  refreshing: boolean
}

const sortLabels: Record<SortField, string> = {
  name: 'Name',
  size: 'Size',
  type: 'Type',
  lastModified: 'Modified'
}

export function Toolbar({
  buckets,
  bucket,
  onBucketChange,
  view,
  onViewChange,
  sort,
  onSortChange,
  filter,
  onFilterChange,
  query,
  onQueryChange,
  onUploadFiles,
  onUploadFolder,
  onNewFolder,
  onRefresh,
  onOpenUploads,
  refreshing
}: ToolbarProps) {
  const toggleDir = () =>
    onSortChange({
      ...sort,
      dir: sort.dir === 'asc' ? 'desc' : 'asc'
    })

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {buckets.length > 0 && (
          <select
            value={bucket}
            onChange={(e) => onBucketChange(e.target.value)}
            className="max-w-[12rem] rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            aria-label="Bucket"
          >
            {buckets.map((b) => (
              <option key={b.name} value={b.name}>
                {b.name}
              </option>
            ))}
          </select>
        )}

        <Menu
          trigger={
            <Button variant="secondary">
              <Upload className="h-4 w-4" /> Upload
            </Button>
          }
        >
          <MenuItem onSelect={onUploadFiles}>
            <Upload className="h-4 w-4" /> Upload files
          </MenuItem>
          <MenuItem onSelect={onUploadFolder}>
            <FolderPlus className="h-4 w-4" /> Upload folder
          </MenuItem>
        </Menu>

        <Button variant="secondary" onClick={onNewFolder}>
          <FolderPlus className="h-4 w-4" /> New folder
        </Button>

        <Button
          variant="secondary"
          onClick={onRefresh}
          disabled={refreshing}
          aria-label="Refresh"
        >
          <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
        </Button>

        <div className="ml-auto flex items-center gap-2">
          <UploadQueueButton onClick={onOpenUploads} />
          <div className="hidden items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-0.5 sm:flex">
            <button
              onClick={() => onViewChange('list')}
              className={cn(
                'rounded-md p-1.5 transition',
                view === 'list'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              )}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => onViewChange('grid')}
              className={cn(
                'rounded-md p-1.5 transition',
                view === 'grid'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              )}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search this bucket…"
            className="input pl-9"
          />
          {query && (
            <button
              onClick={() => onQueryChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <select
          value={filter}
          onChange={(e) => onFilterChange(e.target.value as FileCategory | 'all')}
          className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          aria-label="Type filter"
        >
          {CATEGORY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <Menu
          trigger={
            <Button variant="secondary">
              Sort: {sortLabels[sort.field]}
              {sort.dir === 'asc' ? (
                <ArrowUpAZ className="h-4 w-4" />
              ) : (
                <ArrowDownAZ className="h-4 w-4" />
              )}
            </Button>
          }
        >
          {(Object.keys(sortLabels) as SortField[]).map((field) => (
            <MenuItem key={field} onSelect={() => onSortChange({ ...sort, field })}>
              {sortLabels[field]}
            </MenuItem>
          ))}
          <div className="my-1 border-t border-slate-200" />
          <MenuItem onSelect={toggleDir}>
            {sort.dir === 'asc' ? 'Descending' : 'Ascending'}
          </MenuItem>
        </Menu>
      </div>
    </div>
  )
}
