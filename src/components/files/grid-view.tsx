'use client'

import type { R2ObjectSummary } from '@/lib/types'
import { FileTypeIcon } from '@/components/file-icons'
import {
  ItemActionsMenu,
  type ClickModifiers,
  type ItemCallbacks
} from '@/components/files/list-view'
import { formatBytes } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface GridViewProps {
  items: R2ObjectSummary[]
  selected: Set<string>
  onItemClick: (item: R2ObjectSummary, event: ClickModifiers) => void
  callbacks: ItemCallbacks
}

export function GridView({ items, selected, onItemClick, callbacks }: GridViewProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
      {items.map((item, index) => {
        const isSelected = selected.has(item.key)
        return (
          <div
            key={item.key + index}
            onClick={(e) => onItemClick(item, e)}
            onDoubleClick={(e) => {
              if (e.detail === 2) callbacks.onOpen(item)
            }}
            className={cn(
              'group relative cursor-pointer rounded-xl border p-3 transition',
              isSelected
                ? 'border-indigo-400 bg-indigo-50'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
            )}
          >
            <div className="mb-2 flex justify-center py-2">
              <FileTypeIcon type={item.type} isFolder={item.isFolder} className="h-10 w-10" />
            </div>
            <div className="flex items-start justify-between gap-1">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">{item.name}</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {item.isFolder ? 'Folder' : formatBytes(item.size)}
                </p>
              </div>
              <span className="opacity-0 transition group-hover:opacity-100">
                <ItemActionsMenu item={item} callbacks={callbacks} />
              </span>
            </div>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() =>
                onItemClick(item, {
                  ctrlKey: false,
                  metaKey: false,
                  shiftKey: false
                })
              }
              onClick={(e) => e.stopPropagation()}
              className="absolute right-2.5 top-2.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              aria-label={`Select ${item.name}`}
            />
          </div>
        )
      })}
    </div>
  )
}
