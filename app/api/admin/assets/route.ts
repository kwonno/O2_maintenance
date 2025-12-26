import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, isOperatorAdmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

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

    const body = await request.json()
    const { tenant_id, vendor, model, serial, alias, location, status, eos_date, eol_date } = body

    if (!tenant_id) {
      return NextResponse.json(
        { error: '고객사를 선택해주세요.' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('assets')
      .insert({
        tenant_id,
        vendor: vendor || null,
        model: model || null,
        serial: serial || null,
        alias: alias || null,
        location: location || null,
        status: status || 'active',
        eos_date: eos_date || null,
        eol_date: eol_date || null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message || '자산 생성에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, asset: data })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '자산 생성에 실패했습니다.' },
      { status: 500 }
    )
  }
}

