import { NextRequest, NextResponse } from 'next/server'
import { verifyPassword } from '@/lib/auth/db'
import { cookies } from 'next/headers'

const SESSION_COOKIE_NAME = 'session_id'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7일

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: '이메일과 비밀번호를 입력해주세요.' },
        { status: 400 }
      )
    }

    const user = await verifyPassword(email, password)
    if (!user) {
      console.error('Login failed:', { email, error: 'Invalid credentials' })
      return NextResponse.json(
        { error: '이메일 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      )
    }

    // 세션 생성 (쿠키 설정)
    const sessionId = crypto.randomUUID()
    const cookieStore = await cookies()
    
    const response = NextResponse.json({ 
      success: true, 
      user: { id: user.id, email: user.email, name: user.name } 
    })

    // 쿠키 설정
    response.cookies.set(SESSION_COOKIE_NAME, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE,
      path: '/',
    })

    response.cookies.set('user_id', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE,
      path: '/',
    })

    return response
  } catch (error: any) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: error.message || '로그인에 실패했습니다.' },
      { status: 500 }
    )
  }
}

