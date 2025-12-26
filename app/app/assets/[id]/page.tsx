import { requireAuth } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getTenantUserByUserId } from '@/lib/auth/tenant-helper'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format, differenceInDays } from 'date-fns'
import { ko } from 'date-fns/locale'

export default async function AssetDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const user = await requireAuth()
  const tenantUser = await getTenantUserByUserId(user.id)

  if (!tenantUser) {
    return <div>고객사 정보를 찾을 수 없습니다.</div>
  }

  const tenantId = tenantUser.tenant_id
  const isOperatorAdmin = tenantUser.role === 'operator_admin'

  // RLS 문제를 피하기 위해 서비스 역할 키 사용
  const supabase = createAdminClient()
  let query = supabase
    .from('assets')
    .select('*')
    .eq('id', params.id)

  if (!isOperatorAdmin) {
    query = query.eq('tenant_id', tenantId)
  }

  const { data: asset, error } = await query.single()

  if (error || !asset) {
    notFound()
  }

  // 연결된 계약 조회 (RLS 우회)
  const { data: contractItems } = await supabase
    .from('contract_items')
    .select(`
      *,
      contract:contracts(*)
    `)
    .eq('asset_id', asset.id)

  // 연결된 보고서 조회 (RLS 우회)
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
    .eq('tenant_id', asset.tenant_id)
    .order('created_at', { ascending: false })
    .limit(10)

  if (!isOperatorAdmin) {
    reportsQuery = reportsQuery.eq('tenant_id', tenantId)
  }

  const { data: reports } = await reportsQuery

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6">
        <Link href="/app/assets" className="text-blue-600 hover:text-blue-800 text-sm">
          ← 자산 목록으로
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-6 shadow-sm">
        <div className="px-4 py-5 sm:p-6">
          <h1 className="text-2xl font-bold text-[#1A1A4D] mb-6">
            {asset.alias || asset.serial || '이름 없음'}
          </h1>

          {/* 유지보수 계약 정보 (가장 중요 - 상단에 표시) */}
          {contractItems && contractItems.length > 0 && (
            <div className="mb-6 p-4 bg-[#F3F3FB] rounded-lg border-l-4 border-[#F12711]">
              <h2 className="text-sm font-semibold text-[#1A1A4D] mb-3">유지보수 계약</h2>
              <div className="space-y-3">
                {contractItems.map((item: any) => {
                  const contract = item.contract
                  const endDate = new Date(contract.end_date)
                  const today = new Date()
                  const daysLeft = differenceInDays(endDate, today)
                  const isExpired = endDate < today
                  const isExpiringSoon = daysLeft >= 0 && daysLeft <= 30

                  return (
                    <div key={item.id} className="bg-white p-3 rounded border border-gray-200">
                      <Link href={`/app/contracts/${item.contract_id}`} className="block">
                        <p className="font-medium text-[#1A1A4D] mb-1">{contract.name}</p>
                        <div className="flex items-center space-x-2 flex-wrap">
                          <span className="text-sm text-gray-700">
                            {format(new Date(contract.start_date), 'yyyy-MM-dd', { locale: ko })} ~
                            {format(endDate, 'yyyy-MM-dd', { locale: ko })}
                          </span>
                          {isExpired ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                              만료됨
                            </span>
                          ) : isExpiringSoon ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                              D-{daysLeft}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              유효
                            </span>
                          )}
                          {item.coverage_tier && (
                            <span className="text-xs text-gray-500">커버리지: {item.coverage_tier}</span>
                          )}
                        </div>
                      </Link>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {(!contractItems || contractItems.length === 0) && (
            <div className="mb-6 p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
              <p className="text-sm text-yellow-800 font-medium">유지보수 계약이 없습니다.</p>
            </div>
          )}

          {/* 기본 정보 */}
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">제조사</dt>
              <dd className="mt-1 text-sm text-gray-900">{asset.vendor || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">모델</dt>
              <dd className="mt-1 text-sm text-gray-900">{asset.model || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">시리얼 번호</dt>
              <dd className="mt-1 text-sm text-gray-900">{asset.serial || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">별칭</dt>
              <dd className="mt-1 text-sm text-gray-900">{asset.alias || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">위치</dt>
              <dd className="mt-1 text-sm text-gray-900">{asset.location || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">상태</dt>
              <dd className="mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  asset.status === 'active' ? 'bg-green-100 text-green-800' :
                  asset.status === 'inactive' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {asset.status === 'active' ? '활성' : asset.status === 'inactive' ? '비활성' : '폐기'}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">EOS 날짜</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {asset.eos_date ? format(new Date(asset.eos_date), 'yyyy년 MM월 dd일', { locale: ko }) : '-'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">EOL 날짜</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {asset.eol_date ? format(new Date(asset.eol_date), 'yyyy년 MM월 dd일', { locale: ko }) : '-'}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {reports && reports.length > 0 && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">보고서</h2>
            <ul className="divide-y divide-gray-200">
              {reports.map((report: any) => (
                <li key={report.id} className="py-4">
                  <Link href={`/app/reports/${report.id}`} className="block hover:text-blue-600">
                    <p className="text-sm font-medium text-gray-900">
                      {report.inspection?.yyyy_mm} 점검 보고서
                    </p>
                    <p className="text-sm text-gray-500">
                      {report.inspection?.inspection_date && format(new Date(report.inspection.inspection_date), 'yyyy년 MM월 dd일', { locale: ko })}
                    </p>
                    {report.summary && (
                      <p className="text-sm text-gray-500 mt-1">{report.summary}</p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

