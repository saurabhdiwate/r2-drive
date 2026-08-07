'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Menu, Cloud } from 'lucide-react'
import { Sidebar } from '@/components/app-shell/sidebar'
import { apiFetch, ApiClientError } from '@/lib/api'

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Client-side session check for soft navigations (defense in depth).
    apiFetch('/api/auth/me')
      .catch((error: unknown) => {
        if (error instanceof ApiClientError && error.status === 401) {
          router.push('/login')
        }
      })
  }, [router])

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500">
              <Cloud className="h-4 w-4 text-white" />
            </span>
            R2 Drive
          </span>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
