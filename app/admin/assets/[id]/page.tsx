import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth, isOperatorAdmin } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import AssetForm from '@/components/admin/asset-form'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AdminAssetEditPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string }
}) {
  const user = await requireAuth()
  const isAdmin = await isOperatorAdmin(user.id)

  if (!isAdmin) {
    redirect('/app')
  }

  // Next.js 14+ App Router에서 params가 Promise일 수 있음
  const resolvedParams = await Promise.resolve(params)
  const assetId = resolvedParams.id

  const supabase = createAdminClient()
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, name')
    .order('name')

  const { data: asset, error } = await supabase
    .from('assets')
    .select('*')
    .eq('id', assetId)
    .single()

  if (error || !asset) {
    console.error('Asset fetch error:', error)
    notFound()
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6">
        <Link href="/admin/assets" className="text-[#1A1A4D] hover:text-[#F12711] text-sm">
          ← 자산 목록으로
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-[#1A1A4D] mb-1">자산 수정</h1>
          <p className="text-sm text-gray-600">자산 정보를 수정합니다</p>
        </div>
        <AssetForm tenants={tenants || []} asset={asset} />
      </div>
    </div>
  )
}

