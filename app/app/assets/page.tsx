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
        <h1 className="text-3xl font-bold text-gray-900">자산</h1>
      </div>

      <div className="bg-white shadow rounded-lg mb-6 p-4">
        <form method="get" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
            <input
              type="text"
              name="search"
              placeholder="시리얼/별칭 검색"
              defaultValue={searchParams.search}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
            <select
              name="vendor"
              defaultValue={searchParams.vendor}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="">전체 제조사</option>
              {vendors.map(vendor => (
                <option key={vendor} value={vendor}>{vendor}</option>
              ))}
            </select>
            <select
              name="status"
              defaultValue={searchParams.status}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
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
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">만료 임박</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                name="eos"
                value="true"
                defaultChecked={searchParams.eos === 'true'}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">EOS 임박</span>
            </label>
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            검색
          </button>
        </form>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <ul className="divide-y divide-gray-200">
          {filteredAssets.map((asset: any) => {
            const contract = asset.activeContract?.contract
            const contractEndDate = contract ? new Date(contract.end_date) : null
            const contractDaysLeft = contractEndDate ? differenceInDays(contractEndDate, today) : null
            const isContractExpired = contractEndDate ? contractEndDate < today : false
            const isContractExpiringSoon = contractDaysLeft !== null && contractDaysLeft >= 0 && contractDaysLeft <= 30

            return (
              <li key={asset.id}>
                <Link href={`/app/assets/${asset.id}`} className="block hover:bg-[#F3F3FB] transition-colors">
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium text-[#1A1A4D]">
                              {asset.alias || asset.serial || '이름 없음'}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              {asset.vendor} {asset.model} {asset.serial && `(${asset.serial})`}
                            </p>
                            {asset.location && (
                              <p className="text-sm text-gray-500">위치: {asset.location}</p>
                            )}
                          </div>
                        </div>
                        {/* 유지보수 계약 기간 (가장 중요) */}
                        {contract ? (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-semibold text-[#1A1A4D]">유지보수 계약:</span>
                              <span className="text-xs text-gray-700">
                                {format(new Date(contract.start_date), 'yyyy-MM-dd', { locale: ko })} ~
                                {format(contractEndDate!, 'yyyy-MM-dd', { locale: ko })}
                              </span>
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
                            </div>
                          </div>
                        ) : (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <span className="text-xs text-gray-400">유지보수 계약 없음</span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end space-y-2 ml-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          asset.status === 'active' ? 'bg-green-100 text-green-800' :
                          asset.status === 'inactive' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {asset.status === 'active' ? '활성' : asset.status === 'inactive' ? '비활성' : '폐기'}
                        </span>
                        {(asset.eol_date && new Date(asset.eol_date) <= thirtyDaysLater) && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            EOL 임박
                          </span>
                        )}
                        {(asset.eos_date && new Date(asset.eos_date) <= thirtyDaysLater) && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            EOS 임박
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>

      {filteredAssets.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">자산이 없습니다.</p>
        </div>
      )}
    </div>
  )
}

