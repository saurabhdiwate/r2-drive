'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, FileQuestion, Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { FileTypeIcon } from '@/components/file-icons'
import type { R2ObjectSummary } from '@/lib/types'
import {
  formatBytes,
  formatDate,
  isAudioFile,
  isImageFile,
  isMarkdownFile,
  isPdfFile,
  isVideoFile,
  prismLanguage
} from '@/lib/utils'
import { highlightCode } from '@/lib/preview/prism'
import { useSanitizedMarkdown } from '@/lib/preview/markdown'
import { useToast } from '@/components/ui/toast'

interface PreviewModalProps {
  open: boolean
  bucket: string
  item: R2ObjectSummary | null
  onClose: () => void
  onDownload: (item: R2ObjectSummary) => void
}

type PreviewMode = 'image' | 'video' | 'audio' | 'pdf' | 'code' | 'markdown' | 'text' | 'none'

export function PreviewModal({ open, bucket, item, onClose, onDownload }: PreviewModalProps) {
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  const [truncated, setTruncated] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { toast } = useToast()

  const mode: PreviewMode = useMemo(() => {
    if (!item) return 'none'
    if (item.isFolder) return 'none'
    if (isImageFile(item.name)) return 'image'
    if (isVideoFile(item.name)) return 'video'
    if (isAudioFile(item.name)) return 'audio'
    if (isPdfFile(item.name)) return 'pdf'
    if (isMarkdownFile(item.name)) return 'markdown'
    if (item.type === 'code' || item.type === 'text' || item.type === 'document') return 'code'
    return 'none'
  }, [item])

  const isPreviewable = mode !== 'none' && !item?.isFolder

  const loadPreview = useCallback(async () => {
    if (!open || !item || !isPreviewable) return
    setLoading(true)
    setError('')
    setUrl('')
    setText('')
    setTruncated(false)
    try {
      const params = new URLSearchParams({
        bucket,
        key: item.key,
        name: item.name
      })
      const response = await fetch(`/api/preview?${params.toString()}`)
      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(body?.error ?? `Preview failed (${response.status})`)
      }
      const contentType = response.headers.get('content-type') ?? ''
      if (contentType.includes('application/json')) {
        const payload = (await response.json()) as { data: { url: string } }
        setUrl(payload.data.url)
      } else {
        const raw = await response.text()
        setText(raw)
        setTruncated(response.headers.get('x-preview-truncated') === '1')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preview')
    } finally {
      setLoading(false)
    }
  }, [open, item, bucket, isPreviewable])

  useEffect(() => {
    if (open) void loadPreview()
  }, [open, loadPreview])

  const codeHtml = useMemo(() => {
    if (mode !== 'code') return ''
    const language = prismLanguage(item?.name ?? '')
    return highlightCode(text, language)
  }, [mode, text, item])

  const markdownHtml = useSanitizedMarkdown(mode === 'markdown' ? text : null)

  const renderBody = () => {
    if (!item) return null
    if (loading) {
      return (
        <div className="flex h-full items-center justify-center gap-2 py-16 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading preview…
        </div>
      )
    }
    if (error) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 py-16">
          <FileQuestion className="h-10 w-10 text-slate-300" />
          <p className="text-sm text-slate-500">{error}</p>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      )
    }

    switch (mode) {
      case 'image':
        return (
          <div className="flex h-full items-center justify-center bg-slate-100">
            {/* SVG loaded via <img> cannot execute scripts */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={item.name}
              className="max-h-full max-w-full object-contain"
            />
          </div>
        )
      case 'video':
        return (
          <video src={url} controls className="max-h-full w-full rounded-lg bg-black" />
        )
      case 'audio':
        return (
          <div className="flex items-center justify-center py-16">
            <audio src={url} controls className="w-full max-w-xl" />
          </div>
        )
      case 'pdf':
        return <iframe src={url} title={item.name} className="h-full w-full rounded-lg" />
      case 'markdown':
        return markdownHtml ? (
          <article
            className="prose prose-slate max-w-none"
            dangerouslySetInnerHTML={{ __html: markdownHtml }}
          />
        ) : (
          <p className="text-sm text-slate-500">No content.</p>
        )
      case 'code':
        return text ? (
          <pre className="overflow-auto rounded-lg bg-[#2d2d2d] p-4 text-sm leading-relaxed">
            <code
              className={`language-${prismLanguage(item.name)}`}
              dangerouslySetInnerHTML={{ __html: codeHtml }}
            />
          </pre>
        ) : (
          <p className="text-sm text-slate-500">Empty file.</p>
        )
      default:
        return (
          <div className="flex flex-col items-center gap-4 py-12">
            <FileTypeIcon type={item.type} isFolder={item.isFolder} className="h-14 w-14" />
            <p className="text-sm text-slate-500">
              No preview available for this file type.
            </p>
            <Button variant="secondary" onClick={() => onDownload(item)}>
              <Download className="h-4 w-4" /> Download
            </Button>
          </div>
        )
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={item?.name} size="xl" hideClose>
      <div className="flex h-full min-h-[60vh] flex-col">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <FileTypeIcon type={item?.type ?? 'other'} isFolder={item?.isFolder ?? false} className="h-4 w-4" />
            <span>{formatBytes(item?.size ?? 0)}</span>
            {item?.lastModified && <span>· {formatDate(item.lastModified)}</span>}
            {truncated && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-700">
                truncated to 1 MiB
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {isPreviewable && item && (
              <Button
                variant="secondary"
                className="!px-3 !py-1.5"
                onClick={() => onDownload(item)}
              >
                <Download className="h-4 w-4" /> Download
              </Button>
            )}
            <Button variant="ghost" className="!px-3 !py-1.5" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
        <div className="min-h-0 flex-1">{renderBody()}</div>
      </div>
    </Modal>
  )
}
