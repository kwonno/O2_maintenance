import { requireAuth } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getTenantUserByUserId } from '@/lib/auth/tenant-helper'
import Link from 'next/link'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

export default async function DashboardPage() {
  const user = await requireAuth()

  // 사용자의 tenant_id 가져오기 (서비스 역할 키 사용하여 RLS 우회)
  const tenantUserData = await getTenantUserByUserId(user.id)

  if (!tenantUserData) {
    return <div>고객사 정보를 찾을 수 없습니다.</div>
  }

  const tenantId = tenantUserData.tenant_id
  const isOperatorAdmin = tenantUserData.role === 'operator_admin'

  // RLS 문제를 피하기 위해 서비스 역할 키 사용
  const supabase = createAdminClient()

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

  // 최근 보고서 조회 (RLS 우회)
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
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">대시보드</h1>
        <p className="text-gray-600">자산 현황을 한눈에 확인하세요</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 mb-8">
        <div className="group relative bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 overflow-hidden shadow-lg rounded-xl card-hover">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200 opacity-30 rounded-full -mr-16 -mt-16"></div>
          <div className="p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-200 rounded-lg">
                <svg className="w-6 h-6 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </div>
            <div className="text-4xl font-bold text-blue-700 mb-2">{totalAssets || 0}</div>
            <p className="text-blue-600 text-sm font-medium">전체 자산</p>
          </div>
        </div>

        <div className="group relative bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200 overflow-hidden shadow-lg rounded-xl card-hover">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-200 opacity-30 rounded-full -mr-16 -mt-16"></div>
          <div className="p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-200 rounded-lg">
                <svg className="w-6 h-6 text-orange-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="text-4xl font-bold text-orange-700 mb-2">{expiringSoon}</div>
            <p className="text-orange-600 text-sm font-medium">만료 임박 (30일)</p>
          </div>
        </div>

        <div className="group relative bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200 overflow-hidden shadow-lg rounded-xl card-hover">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-200 opacity-30 rounded-full -mr-16 -mt-16"></div>
          <div className="p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-red-200 rounded-lg">
                <svg className="w-6 h-6 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <div className="text-4xl font-bold text-red-700 mb-2">{eosSoon}</div>
            <p className="text-red-600 text-sm font-medium">EOS 임박 (30일)</p>
          </div>
        </div>
      </div>

      <div className="bg-white shadow-xl rounded-xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-100 to-purple-100 border-b-2 border-blue-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center">
            <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            최근 보고서
          </h2>
        </div>
        <div className="px-6 py-5">
          {reports && reports.length > 0 ? (
            <div className="space-y-4">
              {reports.map((report: any) => (
                <div key={report.id} className="group p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <div className="p-2 bg-blue-100 rounded-lg mr-3">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <p className="text-sm font-semibold text-gray-900">
                          {report.inspection?.yyyy_mm} 점검 보고서
                        </p>
                      </div>
                      <p className="text-sm text-gray-600 ml-11 mb-1">
                        {report.inspection?.inspection_date && format(new Date(report.inspection.inspection_date), 'yyyy년 MM월 dd일', { locale: ko })}
                      </p>
                      {report.summary && (
                        <p className="text-sm text-gray-500 ml-11">{report.summary}</p>
                      )}
                    </div>
                    <Link
                      href={`/app/reports/${report.id}`}
                      className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors shadow-sm"
                    >
                      보기
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mt-4 text-sm text-gray-500">보고서가 없습니다.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

