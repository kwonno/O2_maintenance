'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Tenant {
  id: string
  name: string
}

export default function AssetForm({ tenants, asset, onSuccess }: { tenants: Tenant[], asset?: any, onSuccess?: () => void }) {
  const [formData, setFormData] = useState({
    tenant_id: asset?.tenant_id || tenants[0]?.id || '',
    vendor_id: asset?.vendor_id || '',
    vendor: asset?.vendor || '', // 기존 데이터 호환성
    model_id: asset?.model_id || '',
    model: asset?.model || '', // 기존 데이터 호환성
    location_id: asset?.location_id || '',
    location: asset?.location || '', // 기존 데이터 호환성
    serial: asset?.serial || '',
    alias: asset?.alias || '',
    status: asset?.status || 'active',
    eos_date: asset?.eos_date || '',
    eol_date: asset?.eol_date || '',
  })
  const [vendors, setVendors] = useState<any[]>([])
  const [models, setModels] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

  useEffect(() => {
    fetchOptions()
  }, [])

  useEffect(() => {
    if (formData.vendor_id) {
      fetchModels(formData.vendor_id)
    } else {
      setModels([])
    }
  }, [formData.vendor_id])

  const fetchOptions = async () => {
    try {
      const [vendorsRes, locationsRes] = await Promise.all([
        fetch('/api/admin/vendors'),
        fetch('/api/admin/locations'),
      ])

      if (vendorsRes.ok) {
        const data = await vendorsRes.json()
        setVendors(data.vendors || [])
      }

      if (locationsRes.ok) {
        const data = await locationsRes.json()
        setLocations(data.locations || [])
      }
    } catch (error) {
      console.error('옵션 로딩 실패:', error)
    }
  }

  const fetchModels = async (vendorId: string) => {
    try {
      const res = await fetch(`/api/admin/vendors/models?vendor_id=${vendorId}`)
      if (res.ok) {
        const data = await res.json()
        setModels(data.models || [])
      }
    } catch (error) {
      console.error('모델 로딩 실패:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      if (asset) {
        // 수정은 기존 방식 유지 (페이지에서 처리)
        // vendor_id, model_id, location_id를 사용하되, 기존 데이터 호환성을 위해 vendor, model, location도 포함
        const submitData = {
          ...formData,
          vendor: vendors.find(v => v.id === formData.vendor_id)?.name || formData.vendor,
          model: models.find(m => m.id === formData.model_id)?.name || formData.model,
          location: locations.find(l => l.id === formData.location_id)?.name || formData.location,
        }
        const response = await fetch(`/api/admin/assets/${asset.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(submitData),
        })

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || '자산 수정에 실패했습니다.')
        }
        setMessage('자산이 수정되었습니다.')
      } else {
        // 생성은 API 사용
        // vendor_id, model_id, location_id를 사용하되, 기존 데이터 호환성을 위해 vendor, model, location도 포함
        const submitData = {
          ...formData,
          vendor: vendors.find(v => v.id === formData.vendor_id)?.name || '',
          model: models.find(m => m.id === formData.model_id)?.name || '',
          location: locations.find(l => l.id === formData.location_id)?.name || '',
        }
        const response = await fetch('/api/admin/assets', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(submitData),
        })

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || '자산 생성에 실패했습니다.')
        }
        setMessage('자산이 생성되었습니다.')
        setFormData({
          tenant_id: tenants[0]?.id || '',
          vendor_id: '',
          vendor: '',
          model_id: '',
          model: '',
          location_id: '',
          location: '',
          serial: '',
          alias: '',
          status: 'active',
          eos_date: '',
          eol_date: '',
        })
        if (onSuccess) {
          setTimeout(() => onSuccess(), 500)
        }
      }
      router.refresh()
    } catch (error: any) {
      setMessage(error.message || '자산 저장에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="tenant_id" className="block text-sm font-medium text-gray-700">
            고객사
          </label>
          <select
            id="tenant_id"
            required
            value={formData.tenant_id}
            onChange={(e) => setFormData({ ...formData, tenant_id: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            {tenants.map(tenant => (
              <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700">
            상태
          </label>
          <select
            id="status"
            required
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="active">활성</option>
            <option value="inactive">비활성</option>
            <option value="retired">폐기</option>
          </select>
        </div>
        <div>
          <label htmlFor="vendor_id" className="block text-sm font-medium text-gray-700">
            제조사
          </label>
          <select
            id="vendor_id"
            value={formData.vendor_id}
            onChange={(e) => {
              setFormData({ 
                ...formData, 
                vendor_id: e.target.value,
                model_id: '', // 제조사 변경 시 모델 초기화
              })
            }}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">선택하세요</option>
            {vendors.map(vendor => (
              <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="model_id" className="block text-sm font-medium text-gray-700">
            모델
          </label>
          <select
            id="model_id"
            value={formData.model_id}
            onChange={(e) => setFormData({ ...formData, model_id: e.target.value })}
            disabled={!formData.vendor_id}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">{formData.vendor_id ? '선택하세요' : '제조사를 먼저 선택하세요'}</option>
            {models.map(model => (
              <option key={model.id} value={model.id}>{model.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="serial" className="block text-sm font-medium text-gray-700">
            시리얼 번호
          </label>
          <input
            id="serial"
            type="text"
            value={formData.serial}
            onChange={(e) => setFormData({ ...formData, serial: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label htmlFor="alias" className="block text-sm font-medium text-gray-700">
            별칭
          </label>
          <input
            id="alias"
            type="text"
            value={formData.alias}
            onChange={(e) => setFormData({ ...formData, alias: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label htmlFor="location_id" className="block text-sm font-medium text-gray-700">
            위치
          </label>
          <select
            id="location_id"
            value={formData.location_id}
            onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">선택하세요</option>
            {locations.map(location => (
              <option key={location.id} value={location.id}>{location.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="eos_date" className="block text-sm font-medium text-gray-700">
            EOS 날짜
          </label>
          <input
            id="eos_date"
            type="date"
            value={formData.eos_date}
            onChange={(e) => setFormData({ ...formData, eos_date: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label htmlFor="eol_date" className="block text-sm font-medium text-gray-700">
            EOL 날짜
          </label>
          <input
            id="eol_date"
            type="date"
            value={formData.eol_date}
            onChange={(e) => setFormData({ ...formData, eol_date: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {message && (
        <div className={`p-3 rounded ${message.includes('실패') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {message}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full sm:w-auto px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
      >
        {loading ? '저장 중...' : asset ? '수정' : '생성'}
      </button>
    </form>
  )
}

