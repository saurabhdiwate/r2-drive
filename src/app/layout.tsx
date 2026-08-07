import type { Metadata, Viewport } from 'next'
import './globals.css'
import { UploadProvider } from '@/lib/upload/upload-context'
import { ToastProvider } from '@/components/ui/toast'

export const metadata: Metadata = {
  title: 'R2 Drive — Cloudflare R2 File Manager',
  description:
    'Self-hosted Google Drive-like file manager for personal Cloudflare R2 storage.'
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <UploadProvider>{children}</UploadProvider>
        </ToastProvider>
      </body>
    </html>
  )
}
