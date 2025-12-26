import { NextRequest, NextResponse } from 'next/server'
import { verifyPassword } from '@/lib/auth/db'
import { cookies } from 'next/headers'

const SESSION_COOKIE_NAME = 'session_id'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7일

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    console.log('로그인 요청 받음:', { email, hasPassword: !!password })

    if (!email || !password) {
      return NextResponse.json(
        { error: '이메일과 비밀번호를 입력해주세요.' },
        { status: 400 }
      )
    }

    console.log('비밀번호 검증 시작...')
    const user = await verifyPassword(email, password)
    
    if (!user) {
      console.error('Login failed: Invalid credentials for', email)
      return NextResponse.json(
        { error: '이메일 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      )
    }

    console.log('로그인 성공:', { userId: user.id, email: user.email })

    // 세션 생성 (쿠키 설정)
    const sessionId = crypto.randomUUID()
    
    const response = NextResponse.json({ 
      success: true, 
      user: { id: user.id, email: user.email, name: user.name } 
    })

    // 쿠키 설정 (개발 환경에서는 secure: false)
    const isProduction = process.env.NODE_ENV === 'production'
    
    response.cookies.set(SESSION_COOKIE_NAME, sessionId, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE,
      path: '/',
    })

    response.cookies.set('user_id', user.id, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE,
      path: '/',
    })

    console.log('쿠키 설정 완료')
    return response
  } catch (error: any) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: error.message || '로그인에 실패했습니다.' },
      { status: 500 }
    )
  }
}

