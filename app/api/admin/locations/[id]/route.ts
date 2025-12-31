import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, isOperatorAdmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const isAdmin = await isOperatorAdmin(user.id)

    if (!isAdmin) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    const body = await request.json()
    const { name } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: '위치명을 입력해주세요.' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('locations')
      .update({ name: name.trim(), updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: '이미 존재하는 위치명입니다.' }, { status: 400 })
      }
      return NextResponse.json(
        { error: error.message || '위치 수정에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ location: data })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '위치 수정에 실패했습니다.' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const isAdmin = await isOperatorAdmin(user.id)

    if (!isAdmin) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    const supabase = createAdminClient()
    
    // 자산에 사용 중인지 확인
    const { count } = await supabase
      .from('assets')
      .select('*', { count: 'exact', head: true })
      .eq('location_id', params.id)

    if (count && count > 0) {
      return NextResponse.json(
        { error: '자산에 사용 중인 위치는 삭제할 수 없습니다.' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('locations')
      .delete()
      .eq('id', params.id)

    if (error) {
      return NextResponse.json(
        { error: error.message || '위치 삭제에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '위치 삭제에 실패했습니다.' },
      { status: 500 }
    )
  }
}



