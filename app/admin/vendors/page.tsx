'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminVendorsPage() {
  const router = useRouter()
  const [vendors, setVendors] = useState<any[]>([])
  const [models, setModels] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'vendors' | 'models' | 'locations'>('vendors')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [formData, setFormData] = useState({ name: '', vendor_id: '' })

  useEffect(() => {
    fetchData()
  }, [activeTab])

  const fetchData = async () => {
    try {
      if (activeTab === 'vendors') {
        const res = await fetch('/api/admin/vendors')
        if (res.ok) {
          const data = await res.json()
          setVendors(data.vendors || [])
        }
      } else if (activeTab === 'models') {
        const vendorsRes = await fetch('/api/admin/vendors')
        if (vendorsRes.ok) {
          const vendorsData = await vendorsRes.json()
          setVendors(vendorsData.vendors || [])
        }
        const modelsRes = await fetch('/api/admin/vendors/models')
        if (modelsRes.ok) {
          const modelsData = await modelsRes.json()
          setModels(modelsData.models || [])
        }
      } else if (activeTab === 'locations') {
        const res = await fetch('/api/admin/locations')
        if (res.ok) {
          const data = await res.json()
          setLocations(data.locations || [])
        }
      }
    } catch (error) {
      console.error('데이터 로딩 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (activeTab === 'vendors') {
        const url = editingItem 
          ? `/api/admin/vendors/${editingItem.id}`
          : '/api/admin/vendors'
        const method = editingItem ? 'PUT' : 'POST'

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: formData.name }),
        })

        if (res.ok) {
          setIsModalOpen(false)
          setEditingItem(null)
          setFormData({ name: '', vendor_id: '' })
          fetchData()
        } else {
          const data = await res.json()
          alert(data.error || '저장에 실패했습니다.')
        }
      } else if (activeTab === 'models') {
        const url = editingItem 
          ? `/api/admin/vendors/models/${editingItem.id}`
          : '/api/admin/vendors/models'
        const method = editingItem ? 'PUT' : 'POST'

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vendor_id: formData.vendor_id, name: formData.name }),
        })

        if (res.ok) {
          setIsModalOpen(false)
          setEditingItem(null)
          setFormData({ name: '', vendor_id: '' })
          fetchData()
        } else {
          const data = await res.json()
          alert(data.error || '저장에 실패했습니다.')
        }
      } else if (activeTab === 'locations') {
        const url = editingItem 
          ? `/api/admin/locations/${editingItem.id}`
          : '/api/admin/locations'
        const method = editingItem ? 'PUT' : 'POST'

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: formData.name }),
        })

        if (res.ok) {
          setIsModalOpen(false)
          setEditingItem(null)
          setFormData({ name: '', vendor_id: '' })
          fetchData()
        } else {
          const data = await res.json()
          alert(data.error || '저장에 실패했습니다.')
        }
      }
    } catch (error) {
      alert('저장에 실패했습니다.')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      let url = ''
      if (activeTab === 'vendors') {
        url = `/api/admin/vendors/${id}`
      } else if (activeTab === 'models') {
        url = `/api/admin/vendors/models/${id}`
      } else if (activeTab === 'locations') {
        url = `/api/admin/locations/${id}`
      }

      const res = await fetch(url, { method: 'DELETE' })

      if (res.ok) {
        fetchData()
      } else {
        const data = await res.json()
        alert(data.error || '삭제에 실패했습니다.')
      }
    } catch (error) {
      alert('삭제에 실패했습니다.')
    }
  }

  if (loading) {
    return <div className="px-4 py-6 sm:px-0">로딩 중...</div>
  }

  const currentItems = activeTab === 'vendors' ? vendors : activeTab === 'models' ? models : locations

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">제조사/모델/위치 관리</h1>
        <button
          onClick={() => {
            setEditingItem(null)
            setFormData({ name: '', vendor_id: vendors[0]?.id || '' })
            setIsModalOpen(true)
          }}
          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {activeTab === 'vendors' ? '제조사 추가' : activeTab === 'models' ? '모델 추가' : '위치 추가'}
        </button>
      </div>

      {/* 탭 */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'vendors', label: '제조사' },
            { id: 'models', label: '모델' },
            { id: 'locations', label: '위치' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any)
                setLoading(true)
                fetchData()
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="bg-white shadow-xl rounded-xl overflow-hidden">
        <div className={`bg-gradient-to-r px-6 py-4 ${
          activeTab === 'vendors' ? 'from-blue-500 to-indigo-600' :
          activeTab === 'models' ? 'from-purple-500 to-pink-600' :
          'from-green-500 to-teal-600'
        }`}>
          <h2 className="text-xl font-semibold text-white">
            {activeTab === 'vendors' ? '제조사 목록' : activeTab === 'models' ? '모델 목록' : '위치 목록'}
          </h2>
        </div>

        <div className="p-6">
          {activeTab === 'models' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                제조사별 필터
              </label>
              <select
                value={formData.vendor_id}
                onChange={(e) => {
                  setFormData({ ...formData, vendor_id: e.target.value })
                  if (e.target.value) {
                    fetch(`/api/admin/vendors/models?vendor_id=${e.target.value}`)
                      .then(res => res.json())
                      .then(data => setModels(data.models || []))
                  } else {
                    fetchData()
                  }
                }}
                className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-md"
              >
                <option value="">모든 제조사</option>
                {vendors.map(vendor => (
                  <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                ))}
              </select>
            </div>
          )}

          {currentItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentItems.map((item) => (
                <div
                  key={item.id}
                  className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{item.name}</h3>
                      {activeTab === 'models' && item.vendor && (
                        <p className="text-sm text-gray-500 mt-1">
                          제조사: {vendors.find(v => v.id === item.vendor_id)?.name || item.vendor?.name}
                        </p>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setEditingItem(item)
                          setFormData({ 
                            name: item.name, 
                            vendor_id: item.vendor_id || vendors[0]?.id || '' 
                          })
                          setIsModalOpen(true)
                        }}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">
                {activeTab === 'vendors' ? '제조사' : activeTab === 'models' ? '모델' : '위치'}가 없습니다.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setIsModalOpen(false)}></div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {editingItem 
                      ? (activeTab === 'vendors' ? '제조사 수정' : activeTab === 'models' ? '모델 수정' : '위치 수정')
                      : (activeTab === 'vendors' ? '제조사 추가' : activeTab === 'models' ? '모델 추가' : '위치 추가')
                    }
                  </h3>
                  <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <form onSubmit={handleSubmit}>
                  {activeTab === 'models' && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        제조사
                      </label>
                      <select
                        required
                        value={formData.vendor_id}
                        onChange={(e) => setFormData({ ...formData, vendor_id: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">선택하세요</option>
                        {vendors.map(vendor => (
                          <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {activeTab === 'vendors' ? '제조사명' : activeTab === 'models' ? '모델명' : '위치명'}
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder={activeTab === 'vendors' ? '예: Extreme Networks' : activeTab === 'models' ? '예: X460-G2' : '예: 본사 3층 서버실'}
                    />
                  </div>
                  <div className="mt-4 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      {editingItem ? '수정' : '추가'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
