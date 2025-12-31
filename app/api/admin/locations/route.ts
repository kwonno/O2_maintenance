import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, isOperatorAdmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const user = await requireAuth()
    const isAdmin = await isOperatorAdmin(user.id)

    if (!isAdmin) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .order('name')

    if (error) {
      return NextResponse.json(
        { error: error.message || '위치 목록 조회에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ locations: data || [] })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '위치 목록 조회에 실패했습니다.' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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
      .insert({ name: name.trim() })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: '이미 존재하는 위치명입니다.' }, { status: 400 })
      }
      return NextResponse.json(
        { error: error.message || '위치 생성에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ location: data })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '위치 생성에 실패했습니다.' },
      { status: 500 }
    )
  }
}




