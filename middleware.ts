import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const userId = request.cookies.get('user_id')?.value
  const sessionId = request.cookies.get('session_id')?.value

  const isAuthenticated = !!(userId && sessionId)

  // 보호된 라우트 체크
  if (!isAuthenticated && request.nextUrl.pathname.startsWith('/app')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (!isAuthenticated && request.nextUrl.pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isAuthenticated && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/app', request.url))
  }

  // 쿠키를 명시적으로 전달하여 세션 유지
  const response = NextResponse.next()
  
  // 쿠키를 명시적으로 전달하여 세션 유지
  // 쿠키가 있으면 응답에 다시 설정 (만료 시간 갱신)
  if (userId && sessionId) {
    const isProduction = process.env.NODE_ENV === 'production'
    response.cookies.set('user_id', userId, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7일
      path: '/',
    })
    
    response.cookies.set('session_id', sessionId, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7일
      path: '/',
    })
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

