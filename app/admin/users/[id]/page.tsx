import { requireAuth, isOperatorAdmin } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import UserEditForm from '@/components/admin/user-edit-form'

export default async function AdminUserEditPage({
  params,
}: {
  params: { id: string }
}) {
  const user = await requireAuth()
  const isAdmin = await isOperatorAdmin(user.id)

  if (!isAdmin) {
    redirect('/app')
  }

  const supabase = createAdminClient()

  // 사용자 정보 조회
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, email, name, created_at')
    .eq('id', params.id)
    .single()

  if (userError || !userData) {
    return <div>사용자를 찾을 수 없습니다.</div>
  }

  // tenant_users 정보 조회
  const { data: tenantUser } = await supabase
    .from('tenant_users')
    .select('tenant_id, role')
    .eq('user_id', params.id)
    .maybeSingle()

  // 고객사 목록 조회
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, name')
    .order('name')

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">사용자 수정</h1>
        <a
          href="/admin/users"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← 목록으로
        </a>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <UserEditForm
          user={userData}
          tenantUser={tenantUser}
          tenants={tenants || []}
        />
      </div>
    </div>
  )
}

