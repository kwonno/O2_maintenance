import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, isOperatorAdmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

// 고객사 생성 (클라이언트 컴포넌트에서 사용)
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

    const { name } = await request.json()

    if (!name) {
      return NextResponse.json(
        { error: '고객사 이름을 입력해주세요.' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('tenants')
      .insert({ name })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message || '고객사 생성에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, tenant: data })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '고객사 생성에 실패했습니다.' },
      { status: 500 }
    )
  }
}




