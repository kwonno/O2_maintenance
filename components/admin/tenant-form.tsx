'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

// 주의: Supabase Auth를 사용하지 않으므로 테넌트만 생성합니다.
// 사용자는 /admin/users에서 별도로 생성하세요.

export default function TenantForm() {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({ name })
        .select()
        .single()

      if (tenantError) throw tenantError

      // 테넌트 생성 완료
      // 사용자는 /admin/users에서 별도로 생성하고 테넌트에 연결하세요.

      setMessage('테넌트가 생성되었습니다.')
      setName('')
      router.refresh()
    } catch (error: any) {
      setMessage(error.message || '테넌트 생성에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          테넌트 이름
        </label>
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="고객사 이름"
        />
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
        {loading ? '생성 중...' : '테넌트 생성'}
      </button>
    </form>
  )
}

