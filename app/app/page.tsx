import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { getTenantUserByUserId } from '@/lib/auth/tenant-helper'
import Link from 'next/link'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

export default async function DashboardPage() {
  const user = await requireAuth()
  const supabase = await createClient()

  // 사용자의 tenant_id 가져오기 (서비스 역할 키 사용하여 RLS 우회)
  const tenantUserData = await getTenantUserByUserId(user.id)

  if (!tenantUserData) {
    return <div>고객사 정보를 찾을 수 없습니다.</div>
  }

  const tenantId = tenantUserData.tenant_id
  const isOperatorAdmin = tenantUserData.role === 'operator_admin'

  // 자산 수 조회
  let assetsQuery = supabase
    .from('assets')
    .select('id, eos_date, eol_date', { count: 'exact' })

  if (!isOperatorAdmin) {
    assetsQuery = assetsQuery.eq('tenant_id', tenantId)
  }

  const { data: assets, count: totalAssets } = await assetsQuery

  const today = new Date()
  const thirtyDaysLater = new Date(today)
  thirtyDaysLater.setDate(today.getDate() + 30)

  const expiringSoon = assets?.filter(asset => {
    if (!asset.eol_date) return false
    const eolDate = new Date(asset.eol_date)
    return eolDate >= today && eolDate <= thirtyDaysLater
  }).length || 0

  const eosSoon = assets?.filter(asset => {
    if (!asset.eos_date) return false
    const eosDate = new Date(asset.eos_date)
    return eosDate >= today && eosDate <= thirtyDaysLater
  }).length || 0

  // 최근 보고서 조회
  let reportsQuery = supabase
    .from('inspection_reports')
    .select(`
      id,
      summary,
      created_at,
      inspection:inspections(
        id,
        yyyy_mm,
        inspection_date
      )
    `)
    .order('created_at', { ascending: false })
    .limit(3)

  if (!isOperatorAdmin) {
    reportsQuery = reportsQuery.eq('tenant_id', tenantId)
  }

  const { data: reports } = await reportsQuery

  return (
    <div className="px-4 py-6 sm:px-0">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">대시보드</h1>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-2xl font-bold text-gray-900">{totalAssets || 0}</div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">전체 자산</dt>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-2xl font-bold text-orange-600">{expiringSoon}</div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">만료 임박 (30일)</dt>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-2xl font-bold text-red-600">{eosSoon}</div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">EOS 임박 (30일)</dt>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">최근 보고서</h2>
          {reports && reports.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {reports.map((report: any) => (
                <li key={report.id} className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {report.inspection?.yyyy_mm} 점검 보고서
                      </p>
                      <p className="text-sm text-gray-500">
                        {report.inspection?.inspection_date && format(new Date(report.inspection.inspection_date), 'yyyy년 MM월 dd일', { locale: ko })}
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
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">보고서가 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  )
}

