import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, isOperatorAdmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import bcrypt from 'bcryptjs'

// 사용자 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const isAdmin = await isOperatorAdmin(user.id)

    if (!isAdmin) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    const { email, name, tenant_id, role, password } = await request.json()
    const supabase = createAdminClient()

    // 사용자 정보 업데이트
    const updateData: any = {}
    if (email) updateData.email = email.toLowerCase().trim()
    if (name !== undefined) updateData.name = name || null
    if (password) {
      updateData.password_hash = await bcrypt.hash(password, 10)
    }

    if (Object.keys(updateData).length > 0) {
      const { error: userError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', params.id)

      if (userError) {
        return NextResponse.json(
          { error: '사용자 정보 업데이트에 실패했습니다.' },
          { status: 500 }
        )
      }
    }

    // tenant_users 업데이트 (tenant_id 또는 role이 변경된 경우)
    if (tenant_id && role) {
      const { error: tenantUserError } = await supabase
        .from('tenant_users')
        .update({ tenant_id, role })
        .eq('user_id', params.id)

      if (tenantUserError) {
        return NextResponse.json(
          { error: '고객사 연결 업데이트에 실패했습니다.' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '사용자 수정에 실패했습니다.' },
      { status: 500 }
    )
  }
}

// 사용자 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const isAdmin = await isOperatorAdmin(user.id)

    if (!isAdmin) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    // 자기 자신은 삭제할 수 없음
    if (user.id === params.id) {
      return NextResponse.json(
        { error: '자기 자신은 삭제할 수 없습니다.' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // users 테이블에서 삭제하면 CASCADE로 tenant_users도 자동 삭제됨
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', params.id)

    if (error) {
      return NextResponse.json(
        { error: '사용자 삭제에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '사용자 삭제에 실패했습니다.' },
      { status: 500 }
    )
  }
}


