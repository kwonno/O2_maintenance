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

    // 보고서 확인 (inspection_id도 함께 가져오기)
    const { data: report, error: reportError } = await supabase
      .from('inspection_reports')
      .select('file_path, signature_path, inspection_id')
      .eq('id', resolvedParams.id)
      .single()

    if (reportError || !report) {
      return NextResponse.json(
        { error: '보고서를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // Storage에서 파일 삭제
    if (report.file_path) {
      const { error: fileDeleteError } = await supabase.storage
        .from('reports')
        .remove([report.file_path])

      if (fileDeleteError) {
        console.error('파일 삭제 실패:', fileDeleteError)
        // 파일 삭제 실패해도 DB 레코드는 삭제 진행
      }
    }

    // 서명 파일도 삭제
    if (report.signature_path) {
      const { error: signatureDeleteError } = await supabase.storage
        .from('reports')
        .remove([report.signature_path])

      if (signatureDeleteError) {
        console.error('서명 파일 삭제 실패:', signatureDeleteError)
      }
    }

    // 보고서 레코드 삭제
    const { error: deleteError } = await supabase
      .from('inspection_reports')
      .delete()
      .eq('id', resolvedParams.id)

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message || '보고서 삭제에 실패했습니다.' },
        { status: 500 }
      )
    }

    // 해당 inspection에 연결된 다른 보고서가 있는지 확인
    if (report.inspection_id) {
      const { data: remainingReports } = await supabase
        .from('inspection_reports')
        .select('id')
        .eq('inspection_id', report.inspection_id)
        .limit(1)

      // 보고서가 하나도 없으면 inspection도 삭제
      if (!remainingReports || remainingReports.length === 0) {
        const { error: inspectionDeleteError } = await supabase
          .from('inspections')
          .delete()
          .eq('id', report.inspection_id)

        if (inspectionDeleteError) {
          console.error('점검 삭제 실패:', inspectionDeleteError)
          // 점검 삭제 실패해도 보고서는 이미 삭제되었으므로 계속 진행
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '보고서 삭제에 실패했습니다.' },
      { status: 500 }
    )
  }
}

