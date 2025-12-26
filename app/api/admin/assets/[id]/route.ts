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
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { 
      tenant_id, 
      vendor_id, 
      vendor, 
      model_id, 
      model, 
      location_id, 
      location,
      serial, 
      alias, 
      status, 
      eos_date, 
      eol_date 
    } = body

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('assets')
      .update({
        tenant_id,
        vendor_id: vendor_id || null,
        vendor: vendor || null, // 호환성 유지
        model_id: model_id || null,
        model: model || null, // 호환성 유지
        location_id: location_id || null,
        location: location || null, // 호환성 유지
        serial: serial || null,
        alias: alias || null,
        status: status || 'active',
        eos_date: eos_date || null,
        eol_date: eol_date || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message || '자산 수정에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, asset: data })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '자산 수정에 실패했습니다.' },
      { status: 500 }
    )
  }
}

