import { requireAuth, isOperatorAdmin } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import ReportForm from '@/components/admin/report-form'

export default async function AdminReportsPage() {
  const user = await requireAuth()
  const isAdmin = await isOperatorAdmin(user.id)

  if (!isAdmin) {
    redirect('/app')
  }

  // 서비스 역할 키를 사용하여 RLS 우회
  const supabase = createAdminClient()
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, name')
    .order('name')

  const { data: inspections } = await supabase
    .from('inspections')
    .select(`
      *,
      tenant:tenants(name),
      reports:inspection_reports(*)
    `)
    .order('created_at', { ascending: false })

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">보고서 관리</h1>
      </div>

      <div className="bg-white shadow rounded-lg mb-6 p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">새 점검 및 보고서 생성</h2>
        <ReportForm tenants={tenants || []} />
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">점검 목록</h2>
          {inspections && inspections.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {inspections.map((inspection: any) => (
                <li key={inspection.id} className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {inspection.tenant?.name} - {inspection.yyyy_mm} 점검
                      </p>
                      <p className="text-sm text-gray-500">
                        점검일: {inspection.inspection_date}
                      </p>
                      {inspection.reports && inspection.reports.length > 0 && (
                        <p className="text-sm text-green-600 mt-1">
                          보고서 {inspection.reports.length}개 업로드됨
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">점검이 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  )
}

