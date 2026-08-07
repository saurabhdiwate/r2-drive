'use client'

import {
  Copy,
  Download,
  Eye,
  FilePenLine,
  FolderInput,
  MoreVertical,
  Share2,
  Trash2
} from 'lucide-react'
import type { R2ObjectSummary } from '@/lib/types'
import { FileTypeIcon } from '@/components/file-icons'
import { Menu, MenuItem } from '@/components/ui/menu'
import { formatBytes, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

export interface ItemCallbacks {
  onOpen: (item: R2ObjectSummary) => void
  onPreview: (item: R2ObjectSummary) => void
  onDownload: (item: R2ObjectSummary) => void
  onShare: (item: R2ObjectSummary) => void
  onRename: (item: R2ObjectSummary) => void
  onMove: (item: R2ObjectSummary) => void
  onCopy: (item: R2ObjectSummary) => void
  onDelete: (item: R2ObjectSummary) => void
}

export interface ClickModifiers {
  ctrlKey?: boolean
  metaKey?: boolean
  shiftKey?: boolean
}

interface ListViewProps {
  items: R2ObjectSummary[]
  selected: Set<string>
  onItemClick: (item: R2ObjectSummary, event: ClickModifiers) => void
  callbacks: ItemCallbacks
}

export function ListView({ items, selected, onItemClick, callbacks }: ListViewProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
            <th className="px-4 py-2.5 font-medium">Name</th>
            <th className="hidden w-32 px-4 py-2.5 font-medium md:table-cell">Type</th>
            <th className="hidden w-24 px-4 py-2.5 text-right font-medium sm:table-cell">
              Size
            </th>
            <th className="hidden w-44 px-4 py-2.5 font-medium lg:table-cell">Modified</th>
            <th className="w-10 px-2 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => {
            const isSelected = selected.has(item.key)
            return (
              <tr
                key={item.key + index}
                onClick={(e) => onItemClick(item, e)}
                onDoubleClick={(e) => {
                  if (e.detail === 2) callbacks.onOpen(item)
                }}
                className={cn(
                  'group cursor-pointer border-b border-slate-100 transition last:border-0',
                  isSelected ? 'bg-indigo-50' : 'hover:bg-slate-50'
                )}
              >
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-3">
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
                      className="h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      aria-label={`Select ${item.name}`}
                    />
                    <FileTypeIcon
                      type={item.type}
                      isFolder={item.isFolder}
                      className="h-5 w-5"
                    />
                    <span
                      className={cn(
                        'truncate',
                        item.isFolder ? 'font-medium text-slate-800' : 'text-slate-700'
                      )}
                    >
                      {item.name}
                    </span>
                  </div>
                </td>
                <td className="hidden px-4 py-2.5 text-slate-500 capitalize md:table-cell">
                  {item.isFolder ? 'Folder' : item.type}
                </td>
                <td className="hidden px-4 py-2.5 text-right text-slate-500 sm:table-cell">
                  {item.isFolder ? '—' : formatBytes(item.size)}
                </td>
                <td className="hidden px-4 py-2.5 text-slate-500 lg:table-cell">
                  {formatDate(item.lastModified)}
                </td>
                <td className="px-2 py-2.5">
                  <div className="opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                    <ItemActionsMenu item={item} callbacks={callbacks} />
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function ItemActionsMenu({
  item,
  callbacks
}: {
  item: R2ObjectSummary
  callbacks: ItemCallbacks
}) {
  return (
    <Menu
      trigger={
        <button
          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Actions"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      }
    >
      {item.isFolder ? (
        <MenuItem onSelect={() => callbacks.onOpen(item)}>
          <FolderInput className="h-4 w-4" /> Open
        </MenuItem>
      ) : (
        <MenuItem onSelect={() => callbacks.onPreview(item)}>
          <Eye className="h-4 w-4" /> Preview
        </MenuItem>
      )}
      <MenuItem onSelect={() => callbacks.onDownload(item)}>
        <Download className="h-4 w-4" /> Download
      </MenuItem>
      {!item.isFolder && (
        <MenuItem onSelect={() => callbacks.onShare(item)}>
          <Share2 className="h-4 w-4" /> Share
        </MenuItem>
      )}
      <MenuItem onSelect={() => callbacks.onRename(item)}>
        <FilePenLine className="h-4 w-4" /> Rename
      </MenuItem>
      <MenuItem onSelect={() => callbacks.onMove(item)}>
        <FolderInput className="h-4 w-4" /> Move
      </MenuItem>
      <MenuItem onSelect={() => callbacks.onCopy(item)}>
        <Copy className="h-4 w-4" /> Copy
      </MenuItem>
      <div className="my-1 border-t border-slate-100" />
      <MenuItem danger onSelect={() => callbacks.onDelete(item)}>
        <Trash2 className="h-4 w-4" /> Delete
      </MenuItem>
    </Menu>
  )
}
