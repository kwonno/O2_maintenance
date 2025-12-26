'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Logo from '@/components/logo'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      console.log('로그인 시도:', { email })
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include', // 쿠키 포함
      })

      const data = await response.json()
      console.log('로그인 응답:', { status: response.status, data })

      if (!response.ok) {
        throw new Error(data.error || '로그인에 실패했습니다.')
      }

      console.log('로그인 성공, 리다이렉트 중...')
      
      // 관리자 여부 확인
      const checkAdminRes = await fetch('/api/auth/check')
      const checkAdminData = await checkAdminRes.json()
      
      // 쿠키가 설정되도록 약간의 지연 후 리다이렉트
      setTimeout(() => {
        if (checkAdminData.isAdmin) {
          window.location.href = '/admin'
        } else {
          window.location.href = '/app'
        }
      }, 100)
    } catch (error: any) {
      console.error('로그인 에러:', error)
      setMessage(error.message || '로그인에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FCFCFF]">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col items-center">
          <Logo width={180} height={36} className="mb-4" />
          <h2 className="text-center text-xl font-semibold text-[#1A1A4D] mt-2">
            통합유지보수 시스템
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              이메일
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#1A1A4D] hover:bg-[#0F0C29] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1A1A4D] disabled:opacity-50 transition-colors"
          >
            {loading ? '처리 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  )
}

