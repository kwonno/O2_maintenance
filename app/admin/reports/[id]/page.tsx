import { requireAuth, isOperatorAdmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import { getSignedUrl } from '@/lib/supabase/storage'
import Link from 'next/link'
import ReportDetailClient from '@/components/reports/report-detail-client'

export default async function AdminReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string }
}) {
  const user = await requireAuth()
  const isAdmin = await isOperatorAdmin(user.id)

  if (!isAdmin) {
    redirect('/app')
  }

  const resolvedParams = await Promise.resolve(params)
  const supabase = createAdminClient()

  const { data: report, error } = await supabase
    .from('inspection_reports')
    .select(`
      *,
      inspection:inspections(*)
    `)
    .eq('id', resolvedParams.id)
    .single()

  if (error || !report) {
    notFound()
  }

  // Signed URL 생성
  let signedUrl = null
  if (report.file_path) {
    try {
      signedUrl = await getSignedUrl(report.file_path, 3600) // 1시간 유효
    } catch (err) {
      console.error('Failed to generate signed URL:', err)
    }
  }

  // 관리자는 서명할 수 없음
  const canSign = false

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6">
        <Link href="/admin/reports" className="text-[#1A1A4D] hover:text-[#F12711] text-sm">
          ← 보고서 목록으로
        </Link>
      </div>

      <ReportDetailClient 
        report={report} 
        signedUrl={signedUrl} 
        canSign={canSign}
      />
    </div>
  )
}

