import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getTenantUserByUserId } from '@/lib/auth/tenant-helper'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await requireAuth()
    const tenantUser = await getTenantUserByUserId(user.id)

    if (!tenantUser) {
      return NextResponse.json(
        { error: '고객사 정보를 찾을 수 없습니다.' },
        { status: 403 }
      )
    }

    // 고객사 사용자만 서명 가능 (관리자는 제외)
    if (tenantUser.role === 'operator_admin') {
      return NextResponse.json(
        { error: '관리자는 서명할 수 없습니다.' },
        { status: 403 }
      )
    }

    const resolvedParams = await Promise.resolve(params)
    const body = await request.json()
    const { signatureData, signatureType, position, signatureName, textPosition } = body

    if (!signatureData) {
      return NextResponse.json(
        { error: '서명 데이터가 필요합니다.' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // 보고서 확인
    const { data: report, error: reportError } = await supabase
      .from('inspection_reports')
      .select('*')
      .eq('id', resolvedParams.id)
      .eq('tenant_id', tenantUser.tenant_id)
      .single()

    if (reportError || !report) {
      return NextResponse.json(
        { error: '보고서를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 서명 이미지를 Storage에 업로드 (선택사항)
    let signaturePath = null
    if (signatureType === 'upload' && signatureData.startsWith('data:image')) {
      try {
        // base64를 Blob으로 변환
        const base64Data = signatureData.split(',')[1]
        const buffer = Buffer.from(base64Data, 'base64')
        
        const signatureId = crypto.randomUUID()
        signaturePath = `tenant/${tenantUser.tenant_id}/signatures/${resolvedParams.id}/${signatureId}.png`
        
        const { error: uploadError } = await supabase.storage
          .from('reports')
          .upload(signaturePath, buffer, {
            cacheControl: '3600',
            upsert: false,
            contentType: 'image/png',
          })

        if (uploadError) {
          console.error('Signature upload error:', uploadError)
          // 업로드 실패해도 계속 진행 (signature_data에 저장)
        }
      } catch (err) {
        console.error('Signature upload error:', err)
        // 업로드 실패해도 계속 진행
      }
    }

    // 보고서 업데이트
    const updateData: any = {
      signature_data: signatureData,
      signature_status: 'signed',
      signed_by: user.id,
      signed_at: new Date().toISOString(),
    }

    if (position) {
      updateData.signature_position = position
    }

    if (signaturePath) {
      updateData.signature_path = signaturePath
    }

    if (signatureName) {
      updateData.signature_name = signatureName
    }

    // 이름이 있고 생성 시 이름 위치가 설정되어 있으면 그 위치에 자동 배치
    if (signatureName && report.name_position_x !== undefined && report.name_position_y !== undefined) {
      updateData.text_position = {
        x: report.name_position_x,
        y: report.name_position_y,
        text: signatureName,
      }
    } else if (textPosition) {
      updateData.text_position = textPosition
      // 이름 위치도 별도로 저장
      if (textPosition.x !== undefined && textPosition.y !== undefined) {
        updateData.name_position_x = textPosition.x
        updateData.name_position_y = textPosition.y
      }
    }

    const { error: updateError } = await supabase
      .from('inspection_reports')
      .update(updateData)
      .eq('id', resolvedParams.id)

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || '서명 저장에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '서명 저장에 실패했습니다.' },
      { status: 500 }
    )
  }
}


