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

    // 보고서 확인
    const { data: report, error: reportError } = await supabase
      .from('inspection_reports')
      .select('file_path, signature_path')
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

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '보고서 삭제에 실패했습니다.' },
      { status: 500 }
    )
  }
}

