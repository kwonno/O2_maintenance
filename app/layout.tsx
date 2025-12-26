import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'O2 IT Maintenance',
  description: 'IT 유지보수 관리 시스템',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}

