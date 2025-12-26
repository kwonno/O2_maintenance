import { requireAuth, isOperatorAdmin } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AdminPage() {
  const user = await requireAuth()
  const isAdmin = await isOperatorAdmin(user.id)

  if (!isAdmin) {
    redirect('/app')
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">관리자 대시보드</h1>
        <p className="text-gray-600">시스템을 관리하고 모니터링하세요</p>
      </div>
      
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/tenants" className="group relative bg-white overflow-hidden shadow-lg rounded-xl card-hover">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400 to-purple-500 opacity-10 rounded-full -mr-16 -mt-16"></div>
          <div className="p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">고객사 관리</h3>
            <p className="text-sm text-gray-500">고객사 정보 관리</p>
          </div>
        </Link>

        <Link href="/admin/users" className="group relative bg-white overflow-hidden shadow-lg rounded-xl card-hover">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-400 to-teal-500 opacity-10 rounded-full -mr-16 -mt-16"></div>
          <div className="p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-green-500 to-teal-600 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-green-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">사용자 관리</h3>
            <p className="text-sm text-gray-500">계정 및 권한 관리</p>
          </div>
        </Link>

        <Link href="/admin/assets" className="group relative bg-white overflow-hidden shadow-lg rounded-xl card-hover">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-400 to-pink-500 opacity-10 rounded-full -mr-16 -mt-16"></div>
          <div className="p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-orange-500 to-pink-600 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-orange-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">자산 관리</h3>
            <p className="text-sm text-gray-500">IT 자산 CRUD</p>
          </div>
        </Link>

        <Link href="/admin/reports" className="group relative bg-white overflow-hidden shadow-lg rounded-xl card-hover">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-400 to-indigo-500 opacity-10 rounded-full -mr-16 -mt-16"></div>
          <div className="p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-purple-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">보고서 관리</h3>
            <p className="text-sm text-gray-500">점검 및 보고서</p>
          </div>
        </Link>
      </div>

      <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100 rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">시스템 정보</h2>
            <div className="space-y-2">
              <div className="flex items-center text-sm text-gray-600">
                <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                현재 사용자: <span className="font-medium ml-1">{user.email}</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <svg className="w-4 h-4 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                관리자 권한: <span className={`font-medium ml-1 ${isAdmin ? 'text-green-600' : 'text-red-600'}`}>
                  {isAdmin ? '활성화됨' : '비활성화됨'}
                </span>
              </div>
            </div>
          </div>
          <a 
            href="/api/debug/user-info" 
            target="_blank"
            className="px-4 py-2 bg-white border border-blue-200 rounded-lg text-blue-600 hover:bg-blue-50 hover:border-blue-300 text-sm font-medium transition-colors shadow-sm"
          >
            상세 정보 →
          </a>
        </div>
      </div>
    </div>
  )
}

