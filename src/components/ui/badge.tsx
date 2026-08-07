import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Tone = 'slate' | 'green' | 'red' | 'amber' | 'blue' | 'indigo'

const tones: Record<Tone, string> = {
  slate: 'bg-slate-100 text-slate-700',
  green: 'bg-emerald-100 text-emerald-700',
  red: 'bg-rose-100 text-rose-700',
  amber: 'bg-amber-100 text-amber-700',
  blue: 'bg-sky-100 text-sky-700',
  indigo: 'bg-indigo-100 text-indigo-700'
}

export function Badge({
  tone = 'slate',
  children,
  className
}: {
  tone?: Tone
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  )
}
