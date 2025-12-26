import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

export default async function AssetDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const user = await requireAuth()
  const supabase = await createClient()

  const { getTenantUserByUserId } = await import('@/lib/auth/tenant-helper')
  const tenantUser = await getTenantUserByUserId(user.id)

  if (!tenantUser) {
    return <div>고객사 정보를 찾을 수 없습니다.</div>
  }

  const tenantId = tenantUser.tenant_id
  const isOperatorAdmin = tenantUser.role === 'operator_admin'

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

  // 연결된 계약 조회
  const { data: contractItems } = await supabase
    .from('contract_items')
    .select(`
      *,
      contract:contracts(*)
    `)
    .eq('asset_id', asset.id)

  // 연결된 보고서 조회
  const { data: reports } = await supabase
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

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6">
        <Link href="/app/assets" className="text-blue-600 hover:text-blue-800 text-sm">
          ← 자산 목록으로
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
        <div className="px-4 py-5 sm:p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {asset.alias || asset.serial || '이름 없음'}
          </h1>

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

      {contractItems && contractItems.length > 0 && (
        <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">연결된 계약</h2>
            <div className="space-y-4">
              {contractItems.map((item: any) => (
                <div key={item.id} className="border-l-4 border-blue-500 pl-4">
                  <Link href={`/app/contracts/${item.contract_id}`} className="text-blue-600 hover:text-blue-800">
                    <p className="font-medium">{item.contract?.name}</p>
                    <p className="text-sm text-gray-500">
                      {item.contract?.start_date && format(new Date(item.contract.start_date), 'yyyy-MM-dd', { locale: ko })} ~
                      {item.contract?.end_date && format(new Date(item.contract.end_date), 'yyyy-MM-dd', { locale: ko })}
                    </p>
                    {item.coverage_tier && (
                      <p className="text-sm text-gray-500">커버리지: {item.coverage_tier}</p>
                    )}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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

