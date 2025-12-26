'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'

export default function AdminSidebar() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const isActive = (path: string) => {
    if (path === '/admin') {
      return pathname === '/admin'
    }
    return pathname.startsWith(path)
  }

  const menuItems = [
    { href: '/admin', label: '대시보드', icon: '📊' },
    { href: '/admin/tenants', label: '고객사', icon: '🏢' },
    { href: '/admin/users', label: '사용자', icon: '👥' },
    { href: '/admin/assets', label: '자산', icon: '💻' },
    { href: '/admin/reports', label: '보고서', icon: '📋' },
    { href: '/admin/vendors', label: '제조사/모델/위치', icon: '🔧' },
  ]

  return (
    <>
      {/* 데스크톱 사이드바 */}
      <aside className="hidden lg:fixed lg:left-0 lg:top-0 lg:h-full lg:w-64 lg:bg-[#1A1A4D] lg:text-white lg:flex lg:flex-col lg:z-50">
        {/* 로고 영역 */}
        <div className="h-16 flex items-center justify-center border-b border-[#0F0C29]">
          <Link href="/admin" className="text-xl font-bold text-white">
            관리자 대시보드
          </Link>
        </div>

        {/* 메뉴 영역 */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {menuItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? 'bg-[#F12711] text-white'
                      : 'text-gray-300 hover:bg-[#0F0C29] hover:text-white'
                  }`}
                >
                  <span className="mr-3 text-lg">{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* 고객 포털 링크 (하단) */}
        <div className="border-t border-[#0F0C29] p-3">
          <Link
            href="/app"
            className="flex items-center px-4 py-3 rounded-lg text-sm font-medium text-gray-300 hover:bg-[#0F0C29] hover:text-white transition-colors"
          >
            <span className="mr-3 text-lg">🏠</span>
            고객 포털
          </Link>
        </div>
      </aside>

      {/* 모바일 햄버거 메뉴 버튼 */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-[#1A1A4D] text-white rounded-lg"
      >
        {mobileMenuOpen ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {/* 모바일 사이드바 오버레이 */}
      {mobileMenuOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="lg:hidden fixed left-0 top-0 h-full w-64 bg-[#1A1A4D] text-white flex flex-col z-50">
            {/* 로고 영역 */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-[#0F0C29]">
              <Link href="/admin" className="text-xl font-bold text-white">
                관리자 대시보드
              </Link>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 메뉴 영역 */}
            <nav className="flex-1 overflow-y-auto py-4">
              <ul className="space-y-1 px-3">
                {menuItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                        isActive(item.href)
                          ? 'bg-[#F12711] text-white'
                          : 'text-gray-300 hover:bg-[#0F0C29] hover:text-white'
                      }`}
                    >
                      <span className="mr-3 text-lg">{item.icon}</span>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {/* 고객 포털 링크 (하단) */}
            <div className="border-t border-[#0F0C29] p-3">
              <Link
                href="/app"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center px-4 py-3 rounded-lg text-sm font-medium text-gray-300 hover:bg-[#0F0C29] hover:text-white transition-colors"
              >
                <span className="mr-3 text-lg">🏠</span>
                고객 포털
              </Link>
            </div>
          </aside>
        </>
      )}
    </>
  )
}

