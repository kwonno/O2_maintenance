import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, isOperatorAdmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function DELETE(
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
    const supabase = createAdminClient()

    // 먼저 자산이 존재하는지 확인
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select('id')
      .eq('id', resolvedParams.id)
      .single()

    if (assetError || !asset) {
      return NextResponse.json(
        { error: '자산을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // contract_items에서 연결된 항목 확인
    const { data: contractItems } = await supabase
      .from('contract_items')
      .select('id')
      .eq('asset_id', resolvedParams.id)

    if (contractItems && contractItems.length > 0) {
      // contract_items에서 먼저 삭제
      const { error: deleteItemsError } = await supabase
        .from('contract_items')
        .delete()
        .eq('asset_id', resolvedParams.id)

      if (deleteItemsError) {
        return NextResponse.json(
          { error: '계약 항목 삭제에 실패했습니다.' },
          { status: 500 }
        )
      }
    }

    // 자산 삭제
    const { error: deleteError } = await supabase
      .from('assets')
      .delete()
      .eq('id', resolvedParams.id)

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message || '자산 삭제에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '자산 삭제에 실패했습니다.' },
      { status: 500 }
    )
  }
}

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
      .eq('id', resolvedParams.id)
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

