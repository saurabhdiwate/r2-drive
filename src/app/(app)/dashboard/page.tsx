'use client'

import { useRef, useState } from 'react'
import { StorageDashboard, DashboardHeader } from '@/components/storage/storage-dashboard'

export default function DashboardPage() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleRefresh = () => {
    setRefreshing(true)
    setRefreshKey((k) => k + 1)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setRefreshing(false), 2000)
  }

  return (
    <div className="p-4 lg:p-6">
      <DashboardHeader refreshing={refreshing} onRefresh={handleRefresh} />
      <StorageDashboard key={refreshKey} />
    </div>
  )
}
