import { requireAuth, isOperatorAdmin } from '@/lib/auth'
import { redirect } from 'next/navigation'
import UserForm from '@/components/admin/user-form'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'

export default async function AdminUsersPage() {
  const user = await requireAuth()
  const isAdmin = await isOperatorAdmin(user.id)

  if (!isAdmin) {
    redirect('/app')
  }

  // 서비스 역할 키를 사용하여 모든 데이터 조회
  const supabaseAdmin = createAdminClient()
  const { data: users } = await supabaseAdmin
    .from('users')
    .select('id, email, name, created_at')
    .order('created_at', { ascending: false })

  // 각 사용자의 tenant_users 정보도 조회
  const usersWithTenants = await Promise.all(
    (users || []).map(async (u: any) => {
      const { data: tenantUser } = await supabaseAdmin
        .from('tenant_users')
        .select('tenant:tenants(name), role')
        .eq('user_id', u.id)
        .maybeSingle()
      return {
        ...u,
        tenant: tenantUser?.tenant,
        role: tenantUser?.role,
      }
    })
  )

  // tenants 조회도 서비스 역할 키 사용
  const { data: tenants } = await supabaseAdmin
    .from('tenants')
    .select('id, name')
    .order('name')

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">사용자 관리</h1>
      </div>

      <div className="bg-white shadow-xl rounded-xl mb-6 p-6 border border-gray-100">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2 flex items-center">
            <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            새 사용자 생성
          </h2>
          <p className="text-sm text-gray-500">새로운 사용자 계정을 생성합니다</p>
        </div>
        <UserForm tenants={tenants || []} />
      </div>

      <div className="bg-white shadow-xl rounded-xl overflow-hidden">
        <div className="bg-gradient-to-r from-green-500 to-teal-600 px-6 py-4">
          <h2 className="text-xl font-semibold text-white flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            사용자 목록
          </h2>
        </div>
        {usersWithTenants && usersWithTenants.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    이메일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    이름
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    고객사
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    역할
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    생성일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {usersWithTenants.map((u: any) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                          {u.email.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-semibold text-gray-900">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {u.name || <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {u.tenant?.name || <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                        u.role === 'operator_admin' 
                          ? 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 border border-purple-300' 
                          : 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300'
                      }`}>
                        {u.role === 'operator_admin' ? '운영 관리자' : '고객'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(u.created_at).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link 
                        href={`/admin/users/${u.id}`} 
                        className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        수정
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <p className="mt-4 text-sm text-gray-500">사용자가 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  )
}

