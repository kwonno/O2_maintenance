'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function AppHeader() {
  const [userName, setUserName] = useState('')
  const [companyName, setCompanyName] = useState('')

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
        <Link
          href="/auth/logout"
          className="px-3 lg:px-4 py-2 text-sm text-gray-700 hover:text-[#F12711] transition-colors"
        >
          로그아웃
        </Link>
      </div>
    </header>
  )
}

