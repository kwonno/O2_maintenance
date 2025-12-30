'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'

interface Contract {
  id: string
  tenant_id: string
  name: string
  start_date: string
  end_date: string
}

export default function ContractEditForm({ contract }: { contract: Contract }) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: contract.name || '',
    start_date: contract.start_date ? format(new Date(contract.start_date), 'yyyy-MM-dd') : '',
    end_date: contract.end_date ? format(new Date(contract.end_date), 'yyyy-MM-dd') : '',
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const response = await fetch(`/api/admin/contracts/${contract.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || '계약 수정에 실패했습니다.')
      }

      setMessage('계약이 수정되었습니다.')
      setTimeout(() => {
        router.push('/admin/contracts')
        router.refresh()
      }, 1000)
    } catch (error: any) {
      setMessage(error.message || '계약 수정에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          계약명 *
        </label>
        <input
          id="name"
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#1A1A4D] focus:border-[#1A1A4D]"
          placeholder="계약명을 입력하세요"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="start_date" className="block text-sm font-medium text-gray-700">
            계약 시작일 *
          </label>
          <input
            id="start_date"
            type="date"
            required
            value={formData.start_date}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#1A1A4D] focus:border-[#1A1A4D]"
          />
        </div>
        <div>
          <label htmlFor="end_date" className="block text-sm font-medium text-gray-700">
            계약 종료일 *
          </label>
          <input
            id="end_date"
            type="date"
            required
            value={formData.end_date}
            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#1A1A4D] focus:border-[#1A1A4D]"
          />
        </div>
      </div>

      {message && (
        <div className={`p-3 rounded ${message.includes('실패') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {message}
        </div>
      )}

      <div className="flex space-x-2">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-[#1A1A4D] text-white rounded-lg hover:bg-[#0F0C29] disabled:opacity-50 transition-colors"
        >
          {loading ? '수정 중...' : '수정'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/admin/contracts')}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
        >
          취소
        </button>
      </div>
    </form>
  )
}


