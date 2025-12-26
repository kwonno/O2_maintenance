import { requireAuth, isOperatorAdmin } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import TenantForm from '@/components/admin/tenant-form'

export default async function AdminTenantsPage() {
  const user = await requireAuth()
  const isAdmin = await isOperatorAdmin(user.id)

  if (!isAdmin) {
    redirect('/app')
  }

  // 서비스 역할 키를 사용하여 RLS 우회
  const supabase = createAdminClient()
  const { data: tenants, error } = await supabase
    .from('tenants')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Tenants fetch error:', error)
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">고객사 관리</h1>
      </div>

      <div className="bg-white shadow rounded-lg mb-6 p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">새 고객사 생성</h2>
        <TenantForm />
      </div>

      <div className="bg-white shadow-xl rounded-xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4">
          <h2 className="text-xl font-semibold text-white flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            고객사 목록
          </h2>
        </div>
        <div className="px-6 py-5">
          {tenants && tenants.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tenants.map((tenant) => (
                <div key={tenant.id} className="group p-5 bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-lg transition-all">
                  <div className="flex items-center">
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg mr-4">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-lg font-semibold text-gray-900 mb-1">{tenant.name}</p>
                      <p className="text-xs text-gray-500 font-mono">ID: {tenant.id.substring(0, 8)}...</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <p className="mt-4 text-sm text-gray-500">고객사가 없습니다.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

