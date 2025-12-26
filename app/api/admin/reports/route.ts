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

    const formData = await request.formData()
    const tenant_id = formData.get('tenant_id') as string
    const title = formData.get('title') as string
    const inspection_date = formData.get('inspection_date') as string
    const summary = formData.get('summary') as string
    const file = formData.get('file') as File | null
    const signaturePositionX = formData.get('signature_position_x') as string
    const signaturePositionY = formData.get('signature_position_y') as string
    const signaturePositionPage = formData.get('signature_position_page') as string

    if (!tenant_id || !title || !inspection_date) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다.' },
        { status: 400 }
      )
    }

    // yyyy_mm은 title에서 추출하거나 날짜에서 생성 (하위 호환성)
    const date = new Date(inspection_date)
    const yyyy_mm = `${date.getFullYear()}_${String(date.getMonth() + 1).padStart(2, '0')}`

    const supabase = createAdminClient()

    // 점검 생성
    const { data: inspection, error: inspectionError } = await supabase
      .from('inspections')
      .insert({
        tenant_id,
        yyyy_mm,
        inspection_date,
        performed_by: user.id,
      })
      .select()
      .single()

    if (inspectionError) {
      return NextResponse.json(
        { error: inspectionError.message || '점검 생성에 실패했습니다.' },
        { status: 500 }
      )
    }

    // 파일 업로드
    if (file) {
      const reportId = crypto.randomUUID()
      
      // 파일 확장자 확인
      const fileName = file.name.toLowerCase()
      let fileExtension = 'pdf'
      let contentType: string | undefined = 'application/pdf'
      
      if (fileName.endsWith('.xlsx')) {
        fileExtension = 'xlsx'
        // Supabase Storage가 허용하는 MIME type 사용
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      } else if (fileName.endsWith('.xls')) {
        fileExtension = 'xls'
        contentType = 'application/vnd.ms-excel'
      }
      
      const filePath = `tenant/${tenant_id}/inspections/${yyyy_mm}/${reportId}.${fileExtension}`
      
      // 파일을 Blob으로 변환
      const fileBuffer = await file.arrayBuffer()
      
      // 업로드 옵션 - 모든 파일에 대해 명시적으로 contentType 설정
      const uploadOptions: any = {
        cacheControl: '3600',
        upsert: false,
        contentType: contentType,
      }
      
      const { error: uploadError } = await supabase.storage
        .from('reports')
        .upload(filePath, fileBuffer, uploadOptions)

      if (uploadError) {
        return NextResponse.json(
          { error: uploadError.message || '파일 업로드에 실패했습니다.' },
          { status: 500 }
        )
      }

      // 서명 위치 설정
      let signaturePosition = null
      if (signaturePositionX && signaturePositionY && signaturePositionPage) {
        signaturePosition = {
          x: parseInt(signaturePositionX) || 0,
          y: parseInt(signaturePositionY) || 0,
          page: parseInt(signaturePositionPage) || 1,
        }
      }

      // 보고서 레코드 생성
      const { error: reportError } = await supabase
        .from('inspection_reports')
        .insert({
          tenant_id,
          inspection_id: inspection.id,
          file_path: filePath,
          title: title,
          summary: summary || null,
          file_type: fileExtension,
          signature_status: 'pending',
          signature_position: signaturePosition,
        })

      if (reportError) {
        return NextResponse.json(
          { error: reportError.message || '보고서 생성에 실패했습니다.' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ success: true, inspection })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '보고서 생성에 실패했습니다.' },
      { status: 500 }
    )
  }
}

