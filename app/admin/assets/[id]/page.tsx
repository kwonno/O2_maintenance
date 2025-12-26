import { createClient } from '@/lib/supabase/server'
import { requireAuth, isOperatorAdmin } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import AssetForm from '@/components/admin/asset-form'
import Link from 'next/link'

export default async function AdminAssetEditPage({
  params,
}: {
  params: { id: string }
}) {
  const user = await requireAuth()
  const isAdmin = await isOperatorAdmin(user.id)

  if (!isAdmin) {
    redirect('/app')
  }

  const supabase = await createClient()
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, name')
    .order('name')

  const { data: asset, error } = await supabase
    .from('assets')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !asset) {
    notFound()
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6">
        <Link href="/admin/assets" className="text-blue-600 hover:text-blue-800 text-sm">
          ← 자산 목록으로
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">자산 수정</h1>
        <AssetForm tenants={tenants || []} asset={asset} />
      </div>
    </div>
  )
}

