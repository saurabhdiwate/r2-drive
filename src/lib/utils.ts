import { clsx, type ClassValue } from 'clsx'
import type {
  FileCategory,
  R2ObjectSummary,
  SortField,
  SortState
} from '@/lib/types'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']

export function formatBytes(bytes: number, decimals = 1): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B'
  if (bytes === 0) return '0 B'
  const i = Math.min(Math.floor(Math.log2(bytes) / 10), UNITS.length - 1)
  const value = bytes / Math.pow(1024, i)
  const fixed = value >= 100 || i === 0 ? 0 : decimals
  return `${value.toFixed(fixed)} ${UNITS[i]}`
}

export function formatSpeed(bytesPerSecond: number): string {
  if (!Number.isFinite(bytesPerSecond) || bytesPerSecond <= 0) return '0 B/s'
  const i = Math.min(Math.floor(Math.log2(bytesPerSecond) / 10), UNITS.length - 1)
  const value = bytesPerSecond / Math.pow(1024, i)
  return `${value.toFixed(1)} ${UNITS[i]}/s`
}

export function formatDate(iso: string | number | Date): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function formatDateRelative(iso: string | number | Date): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  const diff = Date.now() - date.getTime()
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  if (diff < minute) return 'Just now'
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`
  if (diff < day) return `${Math.floor(diff / hour)}h ago`
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export function getExtension(name: string): string {
  const idx = name.lastIndexOf('.')
  if (idx <= 0 || idx === name.length - 1) return ''
  return name.slice(idx + 1).toLowerCase()
}

const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif', 'bmp', 'ico'])
const VIDEO_EXTS = new Set(['mp4', 'webm', 'mov', 'mkv', 'avi', 'ogv', 'm4v', 'm3u8'])
const AUDIO_EXTS = new Set(['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'opus', 'wma'])
const DOCUMENT_EXTS = new Set([
  'pdf',
  'txt',
  'md',
  'markdown',
  'json',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'csv',
  'rtf',
  'odt'
])
const ARCHIVE_EXTS = new Set(['zip', 'tar', 'gz', 'tgz', 'bz2', 'xz', '7z', 'rar', 'zst'])
const CODE_EXTS = new Set([
  'js',
  'mjs',
  'cjs',
  'ts',
  'jsx',
  'tsx',
  'html',
  'htm',
  'css',
  'scss',
  'sass',
  'less',
  'py',
  'rb',
  'go',
  'rs',
  'java',
  'c',
  'h',
  'cpp',
  'hpp',
  'cs',
  'php',
  'sh',
  'bash',
  'zsh',
  'fish',
  'sql',
  'yaml',
  'yml',
  'xml',
  'toml',
  'ini',
  'conf',
  'cfg',
  'env',
  'gitignore',
  'dockerfile',
  'makefile',
  'vue',
  'svelte',
  'swift',
  'kt',
  'kts',
  'lua',
  'r',
  'pl',
  'ps1',
  'bat',
  'cmd',
  'graphql',
  'proto',
  'prisma',
  'svg'
])

export function classifyFile(name: string): FileCategory {
  const ext = getExtension(name)
  if (IMAGE_EXTS.has(ext)) return 'image'
  if (VIDEO_EXTS.has(ext)) return 'video'
  if (AUDIO_EXTS.has(ext)) return 'audio'
  if (ARCHIVE_EXTS.has(ext)) return 'archive'
  if (CODE_EXTS.has(ext)) return 'code'
  if (DOCUMENT_EXTS.has(ext)) {
    if (ext === 'txt') return 'text'
    return 'document'
  }
  return 'other'
}

export const TEXT_EXTENSIONS = new Set([
  ...CODE_EXTS,
  'txt',
  'md',
  'markdown',
  'json',
  'csv',
  'rtf'
])

export function isTextFile(name: string): boolean {
  return TEXT_EXTENSIONS.has(getExtension(name))
}

export function isImageFile(name: string): boolean {
  return IMAGE_EXTS.has(getExtension(name))
}

export function isVideoFile(name: string): boolean {
  return VIDEO_EXTS.has(getExtension(name))
}

export function isAudioFile(name: string): boolean {
  return AUDIO_EXTS.has(getExtension(name))
}

export function isPdfFile(name: string): boolean {
  return getExtension(name) === 'pdf'
}

export function isMarkdownFile(name: string): boolean {
  return ['md', 'markdown'].includes(getExtension(name))
}

const CODE_LANG_MAP: Record<string, string> = {
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  ts: 'typescript',
  jsx: 'jsx',
  tsx: 'tsx',
  html: 'markup',
  htm: 'markup',
  xml: 'markup',
  svg: 'markup',
  css: 'css',
  scss: 'scss',
  sass: 'scss',
  less: 'less',
  json: 'json',
  py: 'python',
  rb: 'ruby',
  go: 'go',
  rs: 'rust',
  java: 'java',
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  hpp: 'cpp',
  cs: 'csharp',
  php: 'php',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'ini',
  ini: 'ini',
  sql: 'sql',
  dockerfile: 'docker',
  vue: 'markup',
  swift: 'swift',
  kt: 'kotlin',
  kts: 'kotlin'
}

export function prismLanguage(name: string): string {
  const ext = getExtension(name)
  if (/^dockerfile/i.test(name)) return 'docker'
  if (name.toLowerCase() === 'makefile') return 'makefile'
  return CODE_LANG_MAP[ext] ?? ''
}

export function isFolderKey(key: string): boolean {
  return key.endsWith('/')
}

export function basename(key: string): string {
  const trimmed = key.endsWith('/') ? key.slice(0, -1) : key
  const idx = trimmed.lastIndexOf('/')
  return idx >= 0 ? trimmed.slice(idx + 1) : trimmed
}

export function parentKey(key: string): string {
  const trimmed = key.endsWith('/') ? key.slice(0, -1) : key
  const idx = trimmed.lastIndexOf('/')
  if (idx < 0) return ''
  return trimmed.slice(0, idx + 1)
}

export function joinKey(prefix: string, name: string): string {
  if (prefix && !prefix.endsWith('/')) prefix += '/'
  return `${prefix}${name}`
}

/**
 * Validate a user-supplied file or folder name for use as part of an R2 key.
 * Rejects path separators, traversal and control characters.
 */
export function assertSafeName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('Name must not be empty')
  if (trimmed.length > 1024) throw new Error('Name is too long')
  if (trimmed.includes('/') || trimmed.includes('\\'))
    throw new Error('Name must not contain path separators')
  if (trimmed === '.' || trimmed === '..')
    throw new Error('Invalid name')
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(trimmed))
    throw new Error('Name contains invalid characters')
  return trimmed
}

/**
 * Validate every segment of an object key. Used for user-supplied
 * destination keys to prevent path traversal and unsafe names.
 */
export function assertSafeKey(key: string): string {
  if (!key || key.startsWith('/')) throw new Error('Invalid object key')
  const segments = key.split('/').filter((seg) => seg !== '')
  if (segments.length === 0) throw new Error('Invalid object key')
  for (const segment of segments) {
    assertSafeName(segment)
  }
  return key
}

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  ms: number
): (...args: A) => void {
  let timer: ReturnType<typeof setTimeout> | undefined
  return (...args: A) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function getSortFieldKey(field: SortField): keyof R2ObjectSummary {
  if (field === 'name') return 'name'
  if (field === 'size') return 'size'
  if (field === 'type') return 'type'
  return 'lastModified'
}

export function applySort(
  items: R2ObjectSummary[],
  sort: SortState
): R2ObjectSummary[] {
  const { field, dir } = sort
  const dirMul = dir === 'asc' ? 1 : -1
  const foldersFirst = 1
  return [...items].sort((a, b) => {
    if (a.isFolder !== b.isFolder) {
      return a.isFolder ? -foldersFirst : foldersFirst
    }
    let cmp = 0
    switch (field) {
      case 'name':
        cmp = a.name.localeCompare(b.name, undefined, {
          numeric: true,
          sensitivity: 'base'
        })
        break
      case 'size':
        cmp = a.size - b.size
        break
      case 'type':
        cmp = a.type.localeCompare(b.type)
        break
      case 'lastModified':
        cmp =
          new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime()
        break
    }
    return cmp * dirMul
  })
}

export function matchesCategoryFilter(
  item: R2ObjectSummary,
  filter: FileCategory | 'all'
): boolean {
  if (filter === 'all') return true
  if (item.isFolder) return false
  return item.type === filter
}

export function formatErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string' && error) return error
  return fallback
}
