import { NextRequest, NextResponse } from 'next/server'
import { verifyPassword } from '@/lib/auth/db'
import { createSession, setUserId } from '@/lib/auth/session'

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
      return NextResponse.json(
        { error: '이메일 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      )
    }

    // 세션 생성
    await createSession(user.id)
    await setUserId(user.id)

    return NextResponse.json({ success: true, user: { id: user.id, email: user.email, name: user.name } })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '로그인에 실패했습니다.' },
      { status: 500 }
    )
  }
}

