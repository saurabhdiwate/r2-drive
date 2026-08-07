import {
  File,
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileText,
  FileVideo,
  Folder
} from 'lucide-react'
import { cn } from '@/lib/utils'

const colors: Record<string, string> = {
  image: 'text-violet-500',
  video: 'text-rose-500',
  audio: 'text-amber-500',
  archive: 'text-orange-500',
  code: 'text-sky-500',
  text: 'text-slate-500',
  document: 'text-blue-500',
  other: 'text-slate-400'
}

export function FileTypeIcon({
  type,
  isFolder,
  className
}: {
  type: string
  isFolder: boolean
  className?: string
}) {
  const cls = cn('shrink-0', colors[type] ?? colors.other, className)
  if (isFolder) return <Folder className={cn('shrink-0 text-indigo-500', className)} />

  switch (type) {
    case 'image':
      return <FileImage className={cls} />
    case 'video':
      return <FileVideo className={cls} />
    case 'audio':
      return <FileAudio className={cls} />
    case 'archive':
      return <FileArchive className={cls} />
    case 'code':
      return <FileCode className={cls} />
    case 'text':
    case 'document':
      return <FileText className={cls} />
    default:
      return <File className={cls} />
  }
}
