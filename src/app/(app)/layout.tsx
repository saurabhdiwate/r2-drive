import { redirect } from 'next/navigation'
import { readSessionServer } from '@/lib/auth/guard'
import { AppShell } from '@/components/app-shell/app-shell'

export const dynamic = 'force-dynamic'

export default async function AppLayout({
  children
}: {
  children: React.ReactNode
}) {
  const session = await readSessionServer()
  if (!session) {
    redirect('/login')
  }
  return <AppShell>{children}</AppShell>
}
