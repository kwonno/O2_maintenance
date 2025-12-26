import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { notFound } from 'next/navigation'
import { getSignedUrl } from '@/lib/supabase/storage'
import Link from 'next/link'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

export default async function ReportDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const user = await requireAuth()
  const supabase = await createClient()

  const { getTenantUserByUserId } = await import('@/lib/auth/tenant-helper')
  const tenantUser = await getTenantUserByUserId(user.id)

  if (!tenantUser) {
    return <div>고객사 정보를 찾을 수 없습니다.</div>
  }

  const tenantId = tenantUser.tenant_id
  const isOperatorAdmin = tenantUser.role === 'operator_admin'

  let query = supabase
    .from('inspection_reports')
    .select(`
      *,
      inspection:inspections(*)
    `)
    .eq('id', params.id)

  if (!isOperatorAdmin) {
    query = query.eq('tenant_id', tenantId)
  }

  const { data: report, error } = await query.single()

  if (error || !report) {
    notFound()
  }

  // Signed URL 생성
  let signedUrl = null
  try {
    signedUrl = await getSignedUrl(report.file_path, 3600) // 1시간 유효
  } catch (err) {
    console.error('Failed to generate signed URL:', err)
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6">
        <Link href="/app/reports" className="text-blue-600 hover:text-blue-800 text-sm">
          ← 보고서 목록으로
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
        <div className="px-4 py-5 sm:p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {report.inspection?.yyyy_mm} 점검 보고서
          </h1>

          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 mb-6">
            <div>
              <dt className="text-sm font-medium text-gray-500">점검일</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {report.inspection?.inspection_date && format(new Date(report.inspection.inspection_date), 'yyyy년 MM월 dd일', { locale: ko })}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">보고서 ID</dt>
              <dd className="mt-1 text-sm text-gray-900">{report.id}</dd>
            </div>
          </dl>

          {report.summary && (
            <div className="mb-6">
              <dt className="text-sm font-medium text-gray-500 mb-2">요약</dt>
              <dd className="text-sm text-gray-900">{report.summary}</dd>
            </div>
          )}

          {signedUrl && (
            <div className="space-y-4">
              <div>
                <a
                  href={signedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  PDF 열기
                </a>
                <a
                  href={signedUrl}
                  download
                  className="ml-3 inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  PDF 다운로드
                </a>
              </div>
              <div className="mt-4">
                <iframe
                  src={signedUrl}
                  className="w-full h-screen border border-gray-300 rounded"
                  title="보고서 PDF"
                />
              </div>
            </div>
          )}

          {!signedUrl && (
            <div className="text-sm text-red-600">
              보고서 파일을 불러올 수 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

