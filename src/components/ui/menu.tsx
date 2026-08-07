'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface MenuItemProps {
  onSelect?: () => void
  disabled?: boolean
  danger?: boolean
  children: ReactNode
}

export function MenuItem({ onSelect, disabled, danger, children }: MenuItemProps) {
  return (
    <button
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition',
        danger
          ? 'text-rose-600 hover:bg-rose-50 disabled:opacity-50'
          : 'text-slate-700 hover:bg-slate-100 disabled:opacity-50'
      )}
    >
      {children}
    </button>
  )
}

export function Menu({
  trigger,
  children,
  align = 'right',
  className
}: {
  trigger: ReactNode
  children: ReactNode
  align?: 'left' | 'right'
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <div
        onClick={() => setOpen((v) => !v)}
        className="inline-flex"
        role="button"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {trigger}
      </div>
      {open && (
        <div
          className={cn(
            'absolute z-40 mt-1 min-w-[12rem] rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg',
            align === 'right' ? 'right-0' : 'left-0',
            className
          )}
          role="menu"
        >
          {children}
        </div>
      )}
    </div>
  )
}
