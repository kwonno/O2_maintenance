import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, isOperatorAdmin } from '@/lib/auth'
import { createUser } from '@/lib/auth/db'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const isAdmin = await isOperatorAdmin(user.id)

    if (!isAdmin) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    const { email, password, name, tenant_id, role } = await request.json()

    if (!email || !password || !tenant_id || !role) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다.' },
        { status: 400 }
      )
    }

    // 사용자 생성
    const newUser = await createUser(email, password, name)
    if (!newUser) {
      return NextResponse.json(
        { error: '사용자 생성에 실패했습니다. 이메일이 이미 사용 중일 수 있습니다.' },
        { status: 400 }
      )
    }

    // tenant_users에 연결
    const supabase = await createClient()
    const { error: tenantUserError } = await supabase
      .from('tenant_users')
      .insert({
        user_id: newUser.id,
        tenant_id,
        role,
      })

    if (tenantUserError) {
      return NextResponse.json(
        { error: '테넌트 연결에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, user: newUser })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '사용자 생성에 실패했습니다.' },
      { status: 500 }
    )
  }
}

