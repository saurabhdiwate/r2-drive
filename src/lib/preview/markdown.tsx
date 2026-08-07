import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/toast'

interface MarkdownState {
  html: string | null
}

/** Render markdown to HTML and sanitize it with DOMPurify. Client-only. */
export function useSanitizedMarkdown(text: string | null): string | null {
  const [html, setHtml] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    let cancelled = false
    if (!text) {
      setHtml(null)
      return
    }
    void (async () => {
      try {
        const [{ marked }, { default: DOMPurify }] = await Promise.all([
          import('marked'),
          import('dompurify')
        ])
        const raw = marked.parse(text) as string
        if (cancelled) return
        const sanitized = DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } })
        if (!cancelled) setHtml(sanitized)
      } catch {
        if (!cancelled) toast('Could not render markdown preview', 'error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [text, toast])

  return html
}
