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
      <h1 className="text-3xl font-bold text-gray-900 mb-6">관리자 대시보드</h1>
      
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/tenants" className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-2xl">🏢</div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">고객사 관리</dt>
                  <dd className="text-lg font-medium text-gray-900">고객사 관리</dd>
                </dl>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/admin/users" className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-2xl">👥</div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">사용자 관리</dt>
                  <dd className="text-lg font-medium text-gray-900">계정 관리</dd>
                </dl>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/admin/assets" className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-2xl">💻</div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">자산 관리</dt>
                  <dd className="text-lg font-medium text-gray-900">자산 CRUD</dd>
                </dl>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/admin/reports" className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-2xl">📄</div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">보고서 관리</dt>
                  <dd className="text-lg font-medium text-gray-900">점검 및 보고서</dd>
                </dl>
              </div>
            </div>
          </div>
        </Link>
      </div>

      <div className="mt-8 bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">디버깅 정보</h2>
        <p className="text-sm text-gray-500 mb-2">
          현재 사용자: {user.email}
        </p>
        <p className="text-sm text-gray-500">
          관리자 권한: {isAdmin ? '✅ 있음' : '❌ 없음'}
        </p>
        <a 
          href="/api/debug/user-info" 
          target="_blank"
          className="mt-4 inline-block text-blue-600 hover:text-blue-800 text-sm"
        >
          상세 정보 보기 →
        </a>
      </div>
    </div>
  )
}

