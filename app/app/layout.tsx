import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AppSidebar from '@/components/app/sidebar'
import AppHeader from '@/components/app/header'

// 동적 렌더링 강제 (쿠키 사용)
export const dynamic = 'force-dynamic'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  try {
    // requireAuth 대신 getCurrentUser를 사용하여 리다이렉트 루프 방지
    const user = await getCurrentUser()
    if (!user) {
      redirect('/login')
    }

    return (
      <div className="min-h-screen bg-[#FCFCFF]">
        <AppSidebar />
        <AppHeader />
        <main className="lg:ml-64 mt-16 p-4 lg:p-6">
          {children}
        </main>
      </div>
    )
  } catch (error) {
    // 쿠키 읽기 실패 시 로그인 페이지로 리다이렉트
    console.error('AppLayout error:', error)
    redirect('/login')
  }
}

