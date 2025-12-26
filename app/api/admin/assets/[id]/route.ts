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
      eol_date,
      order_number,
      remarks
    } = body

    const supabase = createAdminClient()
    
    // 업데이트할 데이터 준비
    const updateData: any = {
      tenant_id,
      status: status || 'active',
      updated_at: new Date().toISOString(),
    }

    // vendor_id가 있으면 추가, 없으면 vendor 텍스트 사용
    if (vendor_id) {
      updateData.vendor_id = vendor_id
    } else {
      updateData.vendor_id = null
    }
    if (vendor) {
      updateData.vendor = vendor
    } else {
      updateData.vendor = null
    }

    // model_id가 있으면 추가, 없으면 model 텍스트 사용
    if (model_id) {
      updateData.model_id = model_id
    } else {
      updateData.model_id = null
    }
    if (model) {
      updateData.model = model
    } else {
      updateData.model = null
    }

    // location_id가 있으면 추가, 없으면 location 텍스트 사용
    if (location_id) {
      updateData.location_id = location_id
    } else {
      updateData.location_id = null
    }
    if (location) {
      updateData.location = location
    } else {
      updateData.location = null
    }

    // 나머지 필드들
    updateData.serial = serial || null
    updateData.alias = alias || null
    updateData.eos_date = eos_date || null
    updateData.eol_date = eol_date || null
    updateData.order_number = order_number || null
    updateData.remarks = remarks || null

    const { data, error } = await supabase
      .from('assets')
      .update(updateData)
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

