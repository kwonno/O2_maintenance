import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, isOperatorAdmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
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

    const resolvedParams = await Promise.resolve(params)
    const contractId = resolvedParams.id

    const body = await request.json()
    const { name, start_date, end_date } = body

    if (!name) {
      return NextResponse.json(
        { error: '계약명을 입력해주세요.' },
        { status: 400 }
      )
    }

    if (!start_date || !end_date) {
      return NextResponse.json(
        { error: '계약 기간을 입력해주세요.' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('contracts')
      .update({
        name,
        start_date,
        end_date,
        updated_at: new Date().toISOString(),
      })
      .eq('id', contractId)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message || '계약 수정에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, contract: data })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '계약 수정에 실패했습니다.' },
      { status: 500 }
    )
  }
}



