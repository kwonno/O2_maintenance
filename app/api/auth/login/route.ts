import { NextRequest, NextResponse } from 'next/server'
import { verifyPassword } from '@/lib/auth/db'

const SESSION_COOKIE_NAME = 'session_id'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7일

export async function POST(request: NextRequest) {
  try {
    // 요청 본문 읽기
    let body
    try {
      const text = await request.text()
      if (!text) {
        return NextResponse.json(
          { error: '요청 본문이 비어있습니다.' },
          { status: 400 }
        )
      }
      body = JSON.parse(text)
    } catch (e: any) {
      console.error('JSON parse error:', e)
      return NextResponse.json(
        { error: '잘못된 요청 형식입니다.' },
        { status: 400 }
      )
    }

    const { email, password } = body || {}

    if (!email || !password) {
      return NextResponse.json(
        { error: '이메일과 비밀번호를 입력해주세요.' },
        { status: 400 }
      )
    }

    // 비밀번호 검증
    const user = await verifyPassword(email, password)
    
    if (!user) {
      return NextResponse.json(
        { error: '이메일 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      )
    }

    // 세션 생성
    const sessionId = crypto.randomUUID()
    const isProduction = process.env.NODE_ENV === 'production'
    
    // 응답 생성
    const responseData = { 
      success: true, 
      user: { id: user.id, email: user.email, name: user.name } 
    }

    const response = NextResponse.json(responseData, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      }
    })

    // 쿠키 설정
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

    return response
  } catch (error: any) {
    console.error('Login API error:', error)
    console.error('Error stack:', error?.stack)
    
    // 항상 유효한 JSON 응답 반환
    return NextResponse.json(
      { 
        error: error?.message || '로그인에 실패했습니다.',
        type: 'server_error'
      },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        }
      }
    )
  }
}
