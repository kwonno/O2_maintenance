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

      <div className="bg-white shadow rounded-lg mb-6 p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">새 사용자 생성</h2>
        <UserForm tenants={tenants || []} />
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">사용자 목록</h2>
          {users && users.length > 0 ? (
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
                    <tr key={u.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {u.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {u.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {u.tenant?.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          u.role === 'operator_admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {u.role === 'operator_admin' ? '운영 관리자' : '고객'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(u.created_at).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Link href={`/admin/users/${u.id}`} className="text-blue-600 hover:text-blue-900">
                          수정
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500">사용자가 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  )
}

