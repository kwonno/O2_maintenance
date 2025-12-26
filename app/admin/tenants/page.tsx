import { createClient } from '@/lib/supabase/server'
import { requireAuth, isOperatorAdmin } from '@/lib/auth'
import { redirect } from 'next/navigation'
import TenantForm from '@/components/admin/tenant-form'

export default async function AdminTenantsPage() {
  const user = await requireAuth()
  const isAdmin = await isOperatorAdmin(user.id)

  if (!isAdmin) {
    redirect('/app')
  }

  const supabase = await createClient()
  const { data: tenants } = await supabase
    .from('tenants')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">테넌트 관리</h1>
      </div>

      <div className="bg-white shadow rounded-lg mb-6 p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">새 테넌트 생성</h2>
        <TenantForm />
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">테넌트 목록</h2>
          {tenants && tenants.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {tenants.map((tenant) => (
                <li key={tenant.id} className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{tenant.name}</p>
                      <p className="text-sm text-gray-500">ID: {tenant.id}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">테넌트가 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  )
}

