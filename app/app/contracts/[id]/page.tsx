import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format, differenceInDays } from 'date-fns'
import { ko } from 'date-fns/locale'

export default async function ContractDetailPage({
  params,
}: {
  params: { id: string }
}) {
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
    .from('contracts')
    .select('*')
    .eq('id', params.id)

  if (!isOperatorAdmin) {
    query = query.eq('tenant_id', tenantId)
  }

  const { data: contract, error } = await query.single()

  if (error || !contract) {
    notFound()
  }

  // 커버 자산 목록 조회
  const { data: contractItems } = await supabase
    .from('contract_items')
    .select(`
      *,
      asset:assets(*)
    `)
    .eq('contract_id', contract.id)

  const endDate = new Date(contract.end_date)
  const today = new Date()
  const daysLeft = differenceInDays(endDate, today)
  const isExpired = endDate < today
  const isExpiringSoon = daysLeft >= 0 && daysLeft <= 30

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6">
        <Link href="/app/contracts" className="text-blue-600 hover:text-blue-800 text-sm">
          ← 계약 목록으로
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">{contract.name}</h1>
            {isExpired ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                만료됨
              </span>
            ) : isExpiringSoon ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                D-{daysLeft}
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                유효
              </span>
            )}
          </div>

          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">시작일</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {format(new Date(contract.start_date), 'yyyy년 MM월 dd일', { locale: ko })}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">종료일</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {format(endDate, 'yyyy년 MM월 dd일', { locale: ko })}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {contractItems && contractItems.length > 0 && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">커버 자산 ({contractItems.length}개)</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      자산
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      제조사/모델
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      시리얼
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      커버리지
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {contractItems.map((item: any) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link href={`/app/assets/${item.asset_id}`} className="text-sm font-medium text-blue-600 hover:text-blue-800">
                          {item.asset?.alias || item.asset?.serial || '이름 없음'}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.asset?.vendor} {item.asset?.model}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.asset?.serial || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.coverage_tier || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {(!contractItems || contractItems.length === 0) && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:p-6 text-center">
            <p className="text-gray-500">커버 자산이 없습니다.</p>
          </div>
        </div>
      )}
    </div>
  )
}

