'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Tenant {
  id: string
  name: string
}

export default function AssetForm({ tenants, asset, onSuccess }: { tenants: Tenant[], asset?: any, onSuccess?: () => void }) {
  const [formData, setFormData] = useState({
    tenant_id: asset?.tenant_id || tenants[0]?.id || '',
    vendor: asset?.vendor || '',
    model: asset?.model || '',
    serial: asset?.serial || '',
    alias: asset?.alias || '',
    location: asset?.location || '',
    status: asset?.status || 'active',
    eos_date: asset?.eos_date || '',
    eol_date: asset?.eol_date || '',
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      if (asset) {
        // 수정은 기존 방식 유지 (페이지에서 처리)
        const response = await fetch(`/api/admin/assets/${asset.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        })

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || '자산 수정에 실패했습니다.')
        }
        setMessage('자산이 수정되었습니다.')
      } else {
        // 생성은 API 사용
        const response = await fetch('/api/admin/assets', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        })

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || '자산 생성에 실패했습니다.')
        }
        setMessage('자산이 생성되었습니다.')
        setFormData({
          tenant_id: tenants[0]?.id || '',
          vendor: '',
          model: '',
          serial: '',
          alias: '',
          location: '',
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
          <label htmlFor="vendor" className="block text-sm font-medium text-gray-700">
            제조사
          </label>
          <input
            id="vendor"
            type="text"
            value={formData.vendor}
            onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label htmlFor="model" className="block text-sm font-medium text-gray-700">
            모델
          </label>
          <input
            id="model"
            type="text"
            value={formData.model}
            onChange={(e) => setFormData({ ...formData, model: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
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
          <label htmlFor="location" className="block text-sm font-medium text-gray-700">
            위치
          </label>
          <input
            id="location"
            type="text"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
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

