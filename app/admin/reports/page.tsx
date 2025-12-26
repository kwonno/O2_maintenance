'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ReportModal from '@/components/admin/report-modal'

interface Inspection {
  id: string
  tenant_id: string
  yyyy_mm: string
  inspection_date: string
  tenant?: { name: string }
  reports?: any[]
}

interface Tenant {
  id: string
  name: string
}

export default function AdminReportsPage() {
  const router = useRouter()
  const [inspections, setInspections] = useState<Inspection[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTenant, setFilterTenant] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [inspectionsRes, tenantsRes] = await Promise.all([
        fetch('/api/admin/inspections/list'),
        fetch('/api/admin/tenants/list'),
      ])

      if (inspectionsRes.ok) {
        const inspectionsData = await inspectionsRes.json()
        setInspections(inspectionsData.inspections || [])
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

  const filteredInspections = inspections.filter((inspection) => {
    const matchesSearch = 
      inspection.yyyy_mm?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTenant = !filterTenant || inspection.tenant?.name === filterTenant
    return matchesSearch && matchesTenant
  })

  if (loading) {
    return <div className="px-4 py-6 sm:px-0">로딩 중...</div>
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">보고서 관리</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          보고서 생성
        </button>
      </div>

      <div className="bg-white shadow-xl rounded-xl overflow-hidden">
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 px-6 py-4">
          <h2 className="text-xl font-semibold text-white flex items-center mb-4">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            점검 목록
          </h2>
          
          {/* 검색 및 필터 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <input
                type="text"
                placeholder="년월 검색 (예: 2024_01)..."
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
          </div>
        </div>

        <div className="px-6 py-5">
          {filteredInspections.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {filteredInspections.map((inspection) => (
                <li key={inspection.id} className="py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {inspection.tenant?.name} - {inspection.yyyy_mm} 점검
                      </p>
                      <p className="text-sm text-gray-500">
                        점검일: {inspection.inspection_date}
                      </p>
                      {inspection.reports && inspection.reports.length > 0 && (
                        <p className="text-sm text-green-600 mt-1">
                          보고서 {inspection.reports.length}개 업로드됨
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mt-4 text-sm text-gray-500">점검이 없습니다.</p>
            </div>
          )}
        </div>
      </div>

      <ReportModal 
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
