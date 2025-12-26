import { requireAuth } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getTenantUserByUserId } from '@/lib/auth/tenant-helper'
import Link from 'next/link'
import { format, differenceInDays } from 'date-fns'
import { ko } from 'date-fns/locale'

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: { search?: string; vendor?: string; status?: string; expiring?: string; eos?: string }
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
    .order('created_at', { ascending: false })

  if (!isOperatorAdmin) {
    query = query.eq('tenant_id', tenantId)
  }

  if (searchParams.search) {
    query = query.or(`serial.ilike.%${searchParams.search}%,alias.ilike.%${searchParams.search}%`)
  }

  if (searchParams.vendor) {
    query = query.eq('vendor', searchParams.vendor)
  }

  if (searchParams.status) {
    query = query.eq('status', searchParams.status)
  }

  const { data: assets } = await query

  // 각 자산에 대한 계약 정보 조회
  const assetsWithContracts = await Promise.all(
    (assets || []).map(async (asset) => {
      const { data: contractItems } = await supabase
        .from('contract_items')
        .select(`
          *,
          contract:contracts(*)
        `)
        .eq('asset_id', asset.id)
        .order('contract(end_date)', { ascending: false })
        .limit(1) // 가장 최근 계약만

      return {
        ...asset,
        activeContract: contractItems && contractItems.length > 0 ? contractItems[0] : null,
      }
    })
  )

  const today = new Date()
  const thirtyDaysLater = new Date(today)
  thirtyDaysLater.setDate(today.getDate() + 30)

  let filteredAssets = assetsWithContracts || []

  if (searchParams.expiring === 'true') {
    filteredAssets = filteredAssets.filter(asset => {
      if (!asset.eol_date) return false
      const eolDate = new Date(asset.eol_date)
      return eolDate >= today && eolDate <= thirtyDaysLater
    })
  }

  if (searchParams.eos === 'true') {
    filteredAssets = filteredAssets.filter(asset => {
      if (!asset.eos_date) return false
      const eosDate = new Date(asset.eos_date)
      return eosDate >= today && eosDate <= thirtyDaysLater
    })
  }

  const vendors = Array.from(new Set(assets?.map(a => a.vendor).filter(Boolean) || []))

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A4D] mb-1">자산</h1>
          <p className="text-sm text-gray-600">고객사 자산 목록</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg mb-6 p-4 shadow-sm">
        <form method="get" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
            <input
              type="text"
              name="search"
              placeholder="시리얼/별칭 검색"
              defaultValue={searchParams.search}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#1A1A4D] focus:ring-[#1A1A4D] sm:text-sm"
            />
            <select
              name="vendor"
              defaultValue={searchParams.vendor}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#1A1A4D] focus:ring-[#1A1A4D] sm:text-sm"
            >
              <option value="">전체 제조사</option>
              {vendors.map(vendor => (
                <option key={vendor} value={vendor}>{vendor}</option>
              ))}
            </select>
            <select
              name="status"
              defaultValue={searchParams.status}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#1A1A4D] focus:ring-[#1A1A4D] sm:text-sm"
            >
              <option value="">전체 상태</option>
              <option value="active">활성</option>
              <option value="inactive">비활성</option>
              <option value="retired">폐기</option>
            </select>
            <label className="flex items-center">
              <input
                type="checkbox"
                name="expiring"
                value="true"
                defaultChecked={searchParams.expiring === 'true'}
                className="rounded border-gray-300 text-[#1A1A4D] focus:ring-[#1A1A4D]"
              />
              <span className="ml-2 text-sm text-gray-700">만료 임박</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                name="eos"
                value="true"
                defaultChecked={searchParams.eos === 'true'}
                className="rounded border-gray-300 text-[#1A1A4D] focus:ring-[#1A1A4D]"
              />
              <span className="ml-2 text-sm text-gray-700">EOS 임박</span>
            </label>
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#1A1A4D] hover:bg-[#0F0C29]"
          >
            검색
          </button>
        </form>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-[#F3F3FB]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#1A1A4D] uppercase tracking-wider">
                  제조사
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#1A1A4D] uppercase tracking-wider">
                  모델
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#1A1A4D] uppercase tracking-wider">
                  시리얼번호
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#1A1A4D] uppercase tracking-wider">
                  계약기간(시작)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#1A1A4D] uppercase tracking-wider">
                  계약기간(종료)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#1A1A4D] uppercase tracking-wider">
                  EOL
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#1A1A4D] uppercase tracking-wider">
                  발주번호
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#1A1A4D] uppercase tracking-wider">
                  비고
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#1A1A4D] uppercase tracking-wider">
                  상태
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAssets.map((asset: any) => {
                const contract = asset.activeContract?.contract
                const contractEndDate = contract ? new Date(contract.end_date) : null
                const contractDaysLeft = contractEndDate ? differenceInDays(contractEndDate, today) : null
                const isContractExpired = contractEndDate ? contractEndDate < today : false
                const isContractExpiringSoon = contractDaysLeft !== null && contractDaysLeft >= 0 && contractDaysLeft <= 30

                return (
                  <tr key={asset.id} className="hover:bg-[#F3F3FB] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <Link href={`/app/assets/${asset.id}`} className="text-[#1A1A4D] hover:text-[#F12711]">
                        {asset.vendor || '-'}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {asset.model || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {asset.serial || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {contract ? format(new Date(contract.start_date), 'yyyy-MM-dd', { locale: ko }) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center space-x-2">
                        <span>{contract ? format(contractEndDate!, 'yyyy-MM-dd', { locale: ko }) : '-'}</span>
                        {contract && (
                          <>
                            {isContractExpired ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                만료됨
                              </span>
                            ) : isContractExpiringSoon ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                                D-{contractDaysLeft}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                유효
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {asset.eol_date ? format(new Date(asset.eol_date), 'yyyy-MM-dd', { locale: ko }) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {asset.order_number || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {asset.remarks || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        asset.status === 'active' ? 'bg-green-100 text-green-800' :
                        asset.status === 'inactive' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {asset.status === 'active' ? '활성' : asset.status === 'inactive' ? '비활성' : '폐기'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {filteredAssets.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">자산이 없습니다.</p>
        </div>
      )}
    </div>
  )
}

