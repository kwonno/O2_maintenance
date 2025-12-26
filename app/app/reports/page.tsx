import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import Link from 'next/link'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

export default async function ReportsPage() {
  const user = await requireAuth()
  const supabase = await createClient()

  const { getTenantUserByUserId } = await import('@/lib/auth/tenant-helper')
  const tenantUser = await getTenantUserByUserId(user.id)

  if (!tenantUser) {
    return <div>테넌트 정보를 찾을 수 없습니다.</div>
  }

  const tenantId = tenantUser.tenant_id
  const isOperatorAdmin = tenantUser.role === 'operator_admin'

  let query = supabase
    .from('inspections')
    .select(`
      *,
      reports:inspection_reports(*)
    `)
    .order('yyyy_mm', { ascending: false })

  if (!isOperatorAdmin) {
    query = query.eq('tenant_id', tenantId)
  }

  const { data: inspections } = await query

  // yyyy_mm별로 그룹화
  const groupedByMonth = inspections?.reduce((acc: any, inspection: any) => {
    if (!acc[inspection.yyyy_mm]) {
      acc[inspection.yyyy_mm] = []
    }
    acc[inspection.yyyy_mm].push(inspection)
    return acc
  }, {}) || {}

  return (
    <div className="px-4 py-6 sm:px-0">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">보고서</h1>

      <div className="space-y-6">
        {Object.keys(groupedByMonth).map((yyyyMm) => {
          const monthInspections = groupedByMonth[yyyyMm]
          const [year, month] = yyyyMm.split('_')

          return (
            <div key={yyyyMm} className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-4 py-5 sm:p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  {year}년 {month}월
                </h2>
                <ul className="divide-y divide-gray-200">
                  {monthInspections.map((inspection: any) => (
                    <li key={inspection.id} className="py-4">
                      {inspection.reports && inspection.reports.length > 0 ? (
                        inspection.reports.map((report: any) => (
                          <div key={report.id} className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {format(new Date(inspection.inspection_date), 'yyyy년 MM월 dd일', { locale: ko })} 점검 보고서
                              </p>
                              {report.summary && (
                                <p className="text-sm text-gray-500 mt-1">{report.summary}</p>
                              )}
                            </div>
                            <Link
                              href={`/app/reports/${report.id}`}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              보기 →
                            </Link>
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-gray-500">
                          {format(new Date(inspection.inspection_date), 'yyyy년 MM월 dd일', { locale: ko })} 점검 (보고서 없음)
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )
        })}
      </div>

      {Object.keys(groupedByMonth).length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">보고서가 없습니다.</p>
        </div>
      )}
    </div>
  )
}

