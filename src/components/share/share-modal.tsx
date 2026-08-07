'use client'

import { useEffect, useState } from 'react'
import { Check, Copy, Link2, Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import type { R2ObjectSummary } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { apiFetch, ApiClientError } from '@/lib/api'
import { useToast } from '@/components/ui/toast'

const EXPIRY_OPTIONS = [
  { label: '15 minutes', seconds: 900 },
  { label: '1 hour', seconds: 3600 },
  { label: '24 hours', seconds: 86400 },
  { label: '3 days', seconds: 259200 },
  { label: '7 days', seconds: 604800 }
]

interface ShareModalProps {
  open: boolean
  bucket: string
  item: R2ObjectSummary | null
  onClose: () => void
}

export function ShareModal({ open, bucket, item, onClose }: ShareModalProps) {
  const [expiry, setExpiry] = useState(3600)
  const [link, setLink] = useState('')
  const [expiresAt, setExpiresAt] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      setLink('')
      setExpiresAt(null)
      setExpiry(3600)
      setCopied(false)
      setError('')
    }
  }, [open])

  const createLink = async () => {
    if (!item) return
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({
        bucket,
        key: item.key,
        name: item.name,
        expiresIn: String(expiry)
      })
      const data = await apiFetch<{ data: { url: string; expiresAt: number } }>(
        `/api/share?${params.toString()}`
      )
      setLink(data.data.url)
      setExpiresAt(data.data.expiresAt)
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Failed to create share link'
      setError(message)
      toast(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      toast('Link copied to clipboard', 'success')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast('Could not copy link', 'error')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create share link" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          A temporary, signed link will be created for{' '}
          <span className="font-medium text-slate-800">{item?.name}</span>. It
          expires automatically and grants read-only access.
        </p>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Expires in
          </label>
          <select
            value={expiry}
            onChange={(e) => setExpiry(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          >
            {EXPIRY_OPTIONS.map((option) => (
              <option key={option.seconds} value={option.seconds}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {!link && (
          <Button onClick={createLink} loading={loading} className="w-full">
            <Link2 className="h-4 w-4" /> Generate link
          </Button>
        )}

        {error && <p className="text-sm text-rose-600">{error}</p>}

        {link && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={link}
                className="input font-mono text-xs"
                onFocus={(e) => e.target.select()}
              />
              <Button variant="secondary" onClick={copyLink} className="shrink-0">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            {expiresAt && (
              <p className="text-xs text-slate-500">
                Expires {formatDate(expiresAt)} — anyone with the link can view the
                file until then.
              </p>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
