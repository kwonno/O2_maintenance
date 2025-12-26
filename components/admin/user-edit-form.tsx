'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Tenant {
  id: string
  name: string
}

interface User {
  id: string
  email: string
  name: string | null
}

interface TenantUser {
  tenant_id: string
  role: 'customer' | 'operator_admin'
}

export default function UserEditForm({
  user,
  tenantUser,
  tenants,
}: {
  user: User
  tenantUser: TenantUser | null
  tenants: Tenant[]
}) {
  const [formData, setFormData] = useState({
    email: user.email,
    name: user.name || '',
    tenant_id: tenantUser?.tenant_id || tenants[0]?.id || '',
    role: (tenantUser?.role || 'customer') as 'customer' | 'operator_admin',
    password: '',
    confirmPassword: '',
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    // 비밀번호 확인
    if (formData.password && formData.password !== formData.confirmPassword) {
      setMessage('비밀번호가 일치하지 않습니다.')
      setLoading(false)
      return
    }

    try {
      const updateData: any = {
        email: formData.email,
        name: formData.name || null,
        tenant_id: formData.tenant_id,
        role: formData.role,
      }

      if (formData.password) {
        updateData.password = formData.password
      }

      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '사용자 수정에 실패했습니다.')
      }

      setMessage('사용자 정보가 수정되었습니다.')
      setTimeout(() => {
        router.push('/admin/users')
        router.refresh()
      }, 1000)
    } catch (error: any) {
      setMessage(error.message || '사용자 수정에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('정말 이 사용자를 삭제하시겠습니까?')) {
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '사용자 삭제에 실패했습니다.')
      }

      setMessage('사용자가 삭제되었습니다.')
      setTimeout(() => {
        router.push('/admin/users')
        router.refresh()
      }, 1000)
    } catch (error: any) {
      setMessage(error.message || '사용자 삭제에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            이메일
          </label>
          <input
            id="email"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            이름
          </label>
          <input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
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
          <label htmlFor="role" className="block text-sm font-medium text-gray-700">
            역할
          </label>
          <select
            id="role"
            required
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value as 'customer' | 'operator_admin' })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="customer">고객</option>
            <option value="operator_admin">운영 관리자</option>
          </select>
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            새 비밀번호 (변경하지 않으려면 비워두세요)
          </label>
          <input
            id="password"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
            새 비밀번호 확인
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {message && (
        <div className={`p-3 rounded ${message.includes('실패') || message.includes('삭제') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {message}
        </div>
      )}

      <div className="flex justify-between">
        <div>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? '저장 중...' : '저장'}
          </button>
        </div>
        <div>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
          >
            {loading ? '삭제 중...' : '삭제'}
          </button>
        </div>
      </div>
    </form>
  )
}

