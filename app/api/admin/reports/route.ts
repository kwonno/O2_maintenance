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
    const signaturePositionCell = formData.get('signature_position_cell') as string // 엑셀 셀 주소
    const enableNamePosition = formData.get('enable_name_position') === 'true'
    const namePositionX = formData.get('name_position_x') as string
    const namePositionY = formData.get('name_position_y') as string
    const namePositionCell = formData.get('name_position_cell') as string // 엑셀 셀 주소

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

    // 파일이 필수입니다
    if (!file) {
      return NextResponse.json(
        { error: '보고서 파일이 필요합니다.' },
        { status: 400 }
      )
    }

    const reportId = crypto.randomUUID()
    
    // 파일 확장자 확인
    const fileName = file.name.toLowerCase()
    let fileExtension = 'pdf'
    let contentType: string = 'application/pdf'
    
    if (fileName.endsWith('.xlsx')) {
      fileExtension = 'xlsx'
      // Supabase Storage 버킷에 허용된 MIME type 사용
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
    
    // 파일 업로드 (실패 시 보고서 레코드 생성하지 않음)
    const { error: uploadError } = await supabase.storage
      .from('reports')
      .upload(filePath, fileBuffer, uploadOptions)

    if (uploadError) {
      // 파일 업로드 실패 시 점검 레코드도 삭제
      await supabase
        .from('inspections')
        .delete()
        .eq('id', inspection.id)
      
      return NextResponse.json(
        { error: `파일 업로드에 실패했습니다: ${uploadError.message}. 파일 타입: ${contentType}. Supabase Storage 버킷의 "Allowed MIME types"에 "${contentType}"이 포함되어 있는지 확인하세요.` },
        { status: 500 }
      )
    }

    // 서명 위치 설정
    let signaturePosition = null
    if (signaturePositionCell) {
      // 엑셀 파일인 경우 셀 주소 사용
      signaturePosition = {
        x: parseInt(signaturePositionX) || 0, // 참고용
        y: parseInt(signaturePositionY) || 0, // 참고용
        page: parseInt(signaturePositionPage) || 1,
        cell: signaturePositionCell, // 셀 주소 (예: "F35")
      }
    } else if (signaturePositionX && signaturePositionY && signaturePositionPage) {
      // PDF 파일인 경우 포인트 좌표 사용
      signaturePosition = {
        x: parseInt(signaturePositionX) || 0,
        y: parseInt(signaturePositionY) || 0,
        page: parseInt(signaturePositionPage) || 1,
      }
    }

    // 이름 위치 설정 (enable_name_position이 true일 때만)
    let textPosition = null
    if (enableNamePosition) {
      if (namePositionCell) {
        // 엑셀 파일인 경우 셀 주소 사용
        textPosition = {
          x: parseInt(namePositionX) || 0, // 참고용
          y: parseInt(namePositionY) || 0, // 참고용
          text: '', // 이름은 검수 시 입력
          cell: namePositionCell, // 셀 주소 (예: "G35")
        }
      } else if (namePositionX && namePositionY) {
        // PDF 파일인 경우 포인트 좌표 사용
        textPosition = {
          x: parseInt(namePositionX) || 0,
          y: parseInt(namePositionY) || 0,
          text: '', // 이름은 검수 시 입력
        }
      }
    }

    // 보고서 레코드 생성
    const reportData: any = {
      tenant_id,
      inspection_id: inspection.id,
      file_path: filePath,
      title: title,
      summary: summary || null,
      file_type: fileExtension,
      signature_status: 'pending',
      signature_position: signaturePosition,
    }

    // 이름 위치만 저장 (이름 자체는 검수 시 입력)

    if (textPosition) {
      reportData.text_position = textPosition
    }

    // 이름 위치도 별도로 저장 (검수 시 사용)
    if (namePositionX && namePositionY) {
      reportData.name_position_x = parseInt(namePositionX) || 0
      reportData.name_position_y = parseInt(namePositionY) || 0
    }

    const { error: reportError } = await supabase
      .from('inspection_reports')
      .insert(reportData)

    if (reportError) {
      // 보고서 레코드 생성 실패 시 업로드한 파일도 삭제
      await supabase.storage
        .from('reports')
        .remove([filePath])
      
      // 점검 레코드도 삭제
      await supabase
        .from('inspections')
        .delete()
        .eq('id', inspection.id)
      
      return NextResponse.json(
        { error: reportError.message || '보고서 생성에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, inspection })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '보고서 생성에 실패했습니다.' },
      { status: 500 }
    )
  }
}

