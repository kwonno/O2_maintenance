import { requireAuth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireAuth()
  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <a href="/app" className="flex items-center px-2 py-2 text-xl font-bold text-gray-900">
                O2 IT Maintenance
              </a>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <a href="/app" className="border-blue-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  대시보드
                </a>
                <a href="/app/assets" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  자산
                </a>
                <a href="/app/contracts" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  계약
                </a>
                <a href="/app/reports" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  보고서
                </a>
              </div>
            </div>
            <div className="flex items-center">
              <a href="/auth/logout" className="text-gray-500 hover:text-gray-700 text-sm">
                로그아웃
              </a>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}

