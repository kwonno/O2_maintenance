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
    const { data: vendors, error } = await supabase
      .from('vendors')
      .select(`
        *,
        models(count)
      `)
      .order('name')

    if (error) {
      return NextResponse.json(
        { error: error.message || '제조사 목록 조회에 실패했습니다.' },
        { status: 500 }
      )
    }

    // 모델 개수 계산
    const vendorsWithCount = await Promise.all(
      (vendors || []).map(async (vendor: any) => {
        const { count } = await supabase
          .from('models')
          .select('*', { count: 'exact', head: true })
          .eq('vendor_id', vendor.id)
        
        return {
          ...vendor,
          model_count: count || 0,
        }
      })
    )

    return NextResponse.json({ vendors: vendorsWithCount })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '제조사 목록 조회에 실패했습니다.' },
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
      return NextResponse.json({ error: '제조사명을 입력해주세요.' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('vendors')
      .insert({ name: name.trim() })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: '이미 존재하는 제조사명입니다.' }, { status: 400 })
      }
      return NextResponse.json(
        { error: error.message || '제조사 생성에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ vendor: data })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '제조사 생성에 실패했습니다.' },
      { status: 500 }
    )
  }
}


