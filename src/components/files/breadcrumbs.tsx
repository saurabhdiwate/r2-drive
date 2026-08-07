'use client'

import { ChevronRight, Home } from 'lucide-react'

interface BreadcrumbsProps {
  crumbs: string[]
  onNavigate: (index: number) => void
}

export function Breadcrumbs({ crumbs, onNavigate }: BreadcrumbsProps) {
  return (
    <nav className="flex min-w-0 items-center gap-1 overflow-x-auto text-sm" aria-label="Breadcrumb">
      <button
        onClick={() => onNavigate(-1)}
        className="flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
      >
        <Home className="h-4 w-4" />
        <span className="hidden sm:inline">All files</span>
      </button>
      {crumbs.map((crumb, index) => (
        <span key={crumb + index} className="flex shrink-0 items-center gap-1">
          <ChevronRight className="h-4 w-4 text-slate-300" />
          <button
            onClick={() => onNavigate(index)}
            className={[
              'rounded-lg px-2 py-1 transition',
              index === crumbs.length - 1
                ? 'font-semibold text-slate-900'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            ].join(' ')}
          >
            {crumb}
          </button>
        </span>
      ))}
    </nav>
  )
}
