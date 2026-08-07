'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Cloud,
  FolderOpen,
  HardDrive,
  History,
  LayoutDashboard,
  LogOut,
  Settings,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiFetch } from '@/lib/api'
import { useToast } from '@/components/ui/toast'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/files', label: 'Files', icon: FolderOpen },
  { href: '/buckets', label: 'Buckets', icon: HardDrive },
  { href: '/recent', label: 'Recent', icon: History },
  { href: '/settings', label: 'Settings', icon: Settings }
]

export function Sidebar({
  open,
  onClose
}: {
  open: boolean
  onClose: () => void
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { toast } = useToast()

  const handleLogout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
      router.refresh()
    } catch {
      toast('Failed to log out', 'error')
    }
  }

  const content = (
    <div className="flex h-full w-64 flex-col bg-slate-900 text-slate-300">
      <div className="flex items-center justify-between px-5 py-5">
        <Link href="/dashboard" className="flex items-center gap-2.5" onClick={onClose}>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500">
            <Cloud className="h-5 w-5 text-white" />
          </span>
          <span className="text-base font-semibold text-white">R2 Drive</span>
        </Link>
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white md:hidden"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="mt-2 flex-1 space-y-1 px-3">
        {navItems.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                active
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-slate-800 px-3 py-4">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-slate-800 hover:text-white"
        >
          <LogOut className="h-[18px] w-[18px]" />
          Log out
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop */}
      <aside className="hidden shrink-0 md:block">{content}</aside>
      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="absolute inset-0 bg-slate-900/60"
            onClick={onClose}
            aria-hidden
          />
          <aside className="relative z-10">{content}</aside>
        </div>
      )}
    </>
  )
}
