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
        <h1 className="text-3xl font-bold text-gray-900">자산 관리</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          자산 생성
        </button>
      </div>

      <div className="bg-white shadow-xl rounded-xl overflow-hidden">
        <div className="bg-gradient-to-r from-orange-500 to-pink-600 px-6 py-4">
          <h2 className="text-xl font-semibold text-white flex items-center mb-4">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
            자산 목록
          </h2>
          
          {/* 검색 및 필터 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <input
                type="text"
                placeholder="시리얼, 별칭, 제조사, 모델 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-white border-opacity-30 rounded-lg bg-white bg-opacity-20 text-white placeholder-white placeholder-opacity-70 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
              />
            </div>
            <div>
              <select
                value={filterTenant}
                onChange={(e) => setFilterTenant(e.target.value)}
                className="w-full px-4 py-2 border border-white border-opacity-30 rounded-lg bg-white bg-opacity-20 text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
              >
                <option value="">모든 고객사</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.name} className="text-gray-900">
                    {tenant.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-2 border border-white border-opacity-30 rounded-lg bg-white bg-opacity-20 text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
              >
                <option value="">모든 상태</option>
                <option value="active" className="text-gray-900">활성</option>
                <option value="inactive" className="text-gray-900">비활성</option>
                <option value="retired" className="text-gray-900">폐기</option>
              </select>
            </div>
          </div>
        </div>

        {filteredAssets.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    고객사
                  </th>
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
                    상태
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAssets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {asset.tenant?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {asset.alias || asset.serial || '이름 없음'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {asset.vendor} {asset.model}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {asset.serial || '-'}
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
                        className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        수정
                      </Link>
                    </td>
                  </tr>
                ))}
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
