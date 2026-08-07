'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react'
import {
  uploadManager,
  type UploadInput
} from '@/lib/upload/uploader'
import type { UploadQueueItem } from '@/lib/types'

interface UploadContextValue {
  items: UploadQueueItem[]
  isUploading: boolean
  addFiles: (inputs: UploadInput[]) => void
  pause: (id: string) => void
  resume: (id: string) => void
  retry: (id: string) => void
  cancel: (id: string) => void
  clearCompleted: () => void
}

const UploadContext = createContext<UploadContextValue | null>(null)

export function UploadProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<UploadQueueItem[]>(uploadManager.getItems())
  const [isUploading, setIsUploading] = useState(uploadManager.isActive())

  useEffect(() => {
    void uploadManager.init()
    return uploadManager.subscribe(() => {
      setItems(uploadManager.getItems())
      setIsUploading(uploadManager.isActive())
    })
  }, [])

  const addFiles = useCallback((inputs: UploadInput[]) => {
    uploadManager.addFiles(inputs)
  }, [])

  const value = useMemo<UploadContextValue>(
    () => ({
      items,
      isUploading,
      addFiles,
      pause: uploadManager.pause,
      resume: uploadManager.resume,
      retry: uploadManager.retry,
      cancel: uploadManager.cancel,
      clearCompleted: uploadManager.clearCompleted
    }),
    [items, isUploading, addFiles]
  )

  return <UploadContext.Provider value={value}>{children}</UploadContext.Provider>
}

export function useUploads(): UploadContextValue {
  const ctx = useContext(UploadContext)
  if (!ctx) {
    throw new Error('useUploads must be used within an UploadProvider')
  }
  return ctx
}
