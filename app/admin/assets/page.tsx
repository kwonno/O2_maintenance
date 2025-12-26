'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AssetModal from '@/components/admin/asset-modal'

interface Asset {
  id: string
  tenant_id: string
  vendor: string
  model: string
  serial: string
  alias: string
  location: string
  status: string
  tenant?: { name: string }
}

interface Tenant {
  id: string
  name: string
}

export default function AdminAssetsPage() {
  const router = useRouter()
  const [assets, setAssets] = useState<Asset[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTenant, setFilterTenant] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [assetsRes, tenantsRes] = await Promise.all([
        fetch('/api/admin/assets/list'),
        fetch('/api/admin/tenants/list'),
      ])

      if (assetsRes.ok) {
        const assetsData = await assetsRes.json()
        setAssets(assetsData.assets || [])
      }

      if (tenantsRes.ok) {
        const tenantsData = await tenantsRes.json()
        setTenants(tenantsData.tenants || [])
      }
    } catch (error) {
      console.error('데이터 로딩 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch = 
      asset.serial?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.alias?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.vendor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.model?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTenant = !filterTenant || asset.tenant?.name === filterTenant
    const matchesStatus = !filterStatus || asset.status === filterStatus
    return matchesSearch && matchesTenant && matchesStatus
  })

  if (loading) {
    return <div className="px-4 py-6 sm:px-0">로딩 중...</div>
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A4D] mb-1">자산 관리</h1>
          <p className="text-sm text-gray-600">모든 고객사의 자산을 관리합니다</p>
        </div>
        <div className="flex space-x-2">
          <Link
            href="/admin/assets/upload"
            className="inline-flex items-center px-4 py-2 bg-[#F12711] text-white font-medium rounded-lg hover:bg-[#F53C05] transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            일괄 업로드
          </Link>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-[#1A1A4D] text-white font-medium rounded-lg hover:bg-[#0F0C29] transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            자산 생성
          </button>
        </div>
      </div>

      {/* 검색 및 필터 */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <input
              type="text"
              placeholder="시리얼, 별칭, 제조사, 모델 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A1A4D] focus:border-[#1A1A4D]"
            />
          </div>
          <div>
            <select
              value={filterTenant}
              onChange={(e) => setFilterTenant(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A1A4D] focus:border-[#1A1A4D]"
            >
              <option value="">모든 고객사</option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.name}>
                  {tenant.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A1A4D] focus:border-[#1A1A4D]"
            >
              <option value="">모든 상태</option>
              <option value="active">활성</option>
              <option value="inactive">비활성</option>
              <option value="retired">폐기</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">

        {filteredAssets.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-[#F3F3FB]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#1A1A4D] uppercase tracking-wider">
                    고객사
                  </th>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#1A1A4D] uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAssets.map((asset: any) => {
                  const contract = asset.activeContract?.contract
                  return (
                    <tr key={asset.id} className="hover:bg-[#F3F3FB] transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {asset.tenant?.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {asset.vendor || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {asset.model || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {asset.serial || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {contract ? new Date(contract.start_date).toLocaleDateString('ko-KR') : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {contract ? new Date(contract.end_date).toLocaleDateString('ko-KR') : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {asset.eol_date ? new Date(asset.eol_date).toLocaleDateString('ko-KR') : '-'}
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Link 
                          href={`/admin/assets/${asset.id}`} 
                          className="inline-flex items-center px-3 py-1.5 bg-[#1A1A4D] text-white rounded-lg hover:bg-[#0F0C29] transition-colors"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          수정
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
            <p className="mt-4 text-sm text-gray-500">자산이 없습니다.</p>
          </div>
        )}
      </div>

      <AssetModal 
        tenants={tenants} 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false)
          fetchData()
        }} 
      />
    </div>
  )
}
