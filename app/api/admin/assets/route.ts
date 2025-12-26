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

    if (!tenant_id) {
      return NextResponse.json(
        { error: '고객사를 선택해주세요.' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()
    
    // 삽입할 데이터 준비 (null 값은 제외)
    const insertData: any = {
      tenant_id,
      status: status || 'active',
    }

    // vendor_id가 있으면 추가, 없으면 vendor 텍스트 사용
    if (vendor_id) {
      insertData.vendor_id = vendor_id
    }
    if (vendor) {
      insertData.vendor = vendor
    }

    // model_id가 있으면 추가, 없으면 model 텍스트 사용
    if (model_id) {
      insertData.model_id = model_id
    }
    if (model) {
      insertData.model = model
    }

    // location_id가 있으면 추가, 없으면 location 텍스트 사용
    if (location_id) {
      insertData.location_id = location_id
    }
    if (location) {
      insertData.location = location
    }

    // 나머지 필드들
    if (serial) insertData.serial = serial
    if (alias) insertData.alias = alias
    if (eos_date) insertData.eos_date = eos_date
    if (eol_date) insertData.eol_date = eol_date
    if (order_number) insertData.order_number = order_number
    if (remarks) insertData.remarks = remarks

    const { data, error } = await supabase
      .from('assets')
      .insert(insertData)
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

