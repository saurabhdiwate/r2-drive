'use client'

import { useState, type DragEvent, type ReactNode } from 'react'
import { CloudUpload } from 'lucide-react'
import { collectDroppedFiles, type DroppedFile } from '@/lib/upload/uploader'
import { cn } from '@/lib/utils'

export function UploadDropzone({
  onFiles,
  children,
  disabled
}: {
  onFiles: (files: DroppedFile[]) => void
  children: ReactNode
  disabled?: boolean
}) {
  const [dragActive, setDragActive] = useState(false)

  const handleDrop = async (event: DragEvent) => {
    event.preventDefault()
    setDragActive(false)
    if (disabled) return
    const files = await collectDroppedFiles(event.dataTransfer)
    if (files.length > 0) onFiles(files)
  }

  return (
    <div
      className={cn(
        'relative h-full min-h-[30vh] rounded-xl',
        dragActive && 'ring-2 ring-indigo-400 ring-offset-2'
      )}
      onDragEnter={(e) => {
        e.preventDefault()
        if (!disabled) setDragActive(true)
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={(e) => {
        e.preventDefault()
        if (e.currentTarget === e.target) setDragActive(false)
      }}
      onDrop={handleDrop}
    >
      {children}
      {dragActive && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-indigo-400 bg-indigo-50/80">
          <div className="flex flex-col items-center gap-2 text-indigo-600">
            <CloudUpload className="h-10 w-10" />
            <p className="text-sm font-medium">Drop files to upload</p>
          </div>
        </div>
      )}
    </div>
  )
}
