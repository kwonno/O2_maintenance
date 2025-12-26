import { getCurrentUser, isOperatorAdmin } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AdminNav from '@/components/admin/nav'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // requireAuth 대신 getCurrentUser를 사용하여 리다이렉트 루프 방지
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/login')
  }

  const isAdmin = await isOperatorAdmin(user.id)

  if (!isAdmin) {
    redirect('/app')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}

