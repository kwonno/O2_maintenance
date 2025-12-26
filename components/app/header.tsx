'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AppHeader() {
  const [userName, setUserName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // 사용자 정보 가져오기
    fetch('/api/debug/user-info')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUserName(data.user.name || '')
          // tenant 정보가 있으면 회사명 표시
          if (data.tenantUser?.tenant) {
            setCompanyName(data.tenantUser.tenant.name || '')
          }
        }
      })
      .catch(() => {})
  }, [])

  const handleLogout = async () => {
    if (isLoggingOut) return
    
    setIsLoggingOut(true)
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
      
      if (response.ok) {
        // 쿠키 삭제 후 강제 페이지 리로드
        window.location.href = '/login'
      } else {
        // 실패해도 로그인 페이지로 이동
        window.location.href = '/login'
      }
    } catch (error) {
      console.error('Logout error:', error)
      // 에러가 발생해도 로그인 페이지로 이동
      window.location.href = '/login'
    }
  }

  return (
    <header className="fixed top-0 left-0 lg:left-64 right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 z-40">
      <div className="flex items-center">
        {/* 빵부스러기 네비게이션은 필요시 추가 */}
      </div>
      <div className="flex items-center space-x-2 lg:space-x-4">
        {companyName && (
          <span className="hidden sm:inline text-sm text-gray-600">
            {companyName}, {userName}님 안녕하세요!
          </span>
        )}
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="px-3 lg:px-4 py-2 text-sm text-gray-700 hover:text-[#F12711] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoggingOut ? '로그아웃 중...' : '로그아웃'}
        </button>
      </div>
    </header>
  )
}

