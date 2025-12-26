import { requireAuth } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getTenantUserByUserId } from '@/lib/auth/tenant-helper'
import { notFound } from 'next/navigation'
import { getSignedUrl } from '@/lib/supabase/storage'
import Link from 'next/link'
import ReportDetailClient from '@/components/reports/report-detail-client'

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string }
}) {
  const user = await requireAuth()
  const tenantUser = await getTenantUserByUserId(user.id)

  if (!tenantUser) {
    return <div>고객사 정보를 찾을 수 없습니다.</div>
  }

  const resolvedParams = await Promise.resolve(params)
  const tenantId = tenantUser.tenant_id
  const isOperatorAdmin = tenantUser.role === 'operator_admin'

  // RLS 문제를 피하기 위해 서비스 역할 키 사용
  const supabase = createAdminClient()
  let query = supabase
    .from('inspection_reports')
    .select(`
      *,
      inspection:inspections(*)
    `)
    .eq('id', resolvedParams.id)

  if (!isOperatorAdmin) {
    query = query.eq('tenant_id', tenantId)
  }

  const { data: report, error } = await query.single()

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

  // 고객사 사용자만 서명 가능 (관리자 제외)
  const canSign = !isOperatorAdmin && tenantUser.role !== 'operator_admin'

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6">
        <Link href="/app/reports" className="text-[#1A1A4D] hover:text-[#F12711] text-sm">
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

