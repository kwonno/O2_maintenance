import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AppNav from '@/components/app/nav'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // requireAuth 대신 getCurrentUser를 사용하여 리다이렉트 루프 방지
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}

