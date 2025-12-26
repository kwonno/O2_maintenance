import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import Link from 'next/link'

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: { search?: string; vendor?: string; status?: string; expiring?: string; eos?: string }
}) {
  const user = await requireAuth()
  const supabase = await createClient()

  const { data: tenantUser } = await supabase
    .from('tenant_users')
    .select('tenant_id, role')
    .eq('user_id', user.id)
    .single()

  if (!tenantUser) {
    return <div>테넌트 정보를 찾을 수 없습니다.</div>
  }

  const tenantId = tenantUser.tenant_id
  const isOperatorAdmin = tenantUser.role === 'operator_admin'

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

  const today = new Date()
  const thirtyDaysLater = new Date(today)
  thirtyDaysLater.setDate(today.getDate() + 30)

  let filteredAssets = assets || []

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

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {filteredAssets.map((asset) => (
            <li key={asset.id}>
              <Link href={`/app/assets/${asset.id}`} className="block hover:bg-gray-50">
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {asset.alias || asset.serial || '이름 없음'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {asset.vendor} {asset.model} {asset.serial && `(${asset.serial})`}
                        </p>
                        {asset.location && (
                          <p className="text-sm text-gray-500">위치: {asset.location}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        asset.status === 'active' ? 'bg-green-100 text-green-800' :
                        asset.status === 'inactive' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {asset.status === 'active' ? '활성' : asset.status === 'inactive' ? '비활성' : '폐기'}
                      </span>
                      {asset.eol_date && new Date(asset.eol_date) <= thirtyDaysLater && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          만료 임박
                        </span>
                      )}
                      {asset.eos_date && new Date(asset.eos_date) <= thirtyDaysLater && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          EOS 임박
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          ))}
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

