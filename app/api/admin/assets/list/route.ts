import { NextResponse } from 'next/server'
import { getCurrentUser, isOperatorAdmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const isAdmin = await isOperatorAdmin(user.id)
    if (!isAdmin) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    const supabaseAdmin = createAdminClient()
    const { data: assets } = await supabaseAdmin
      .from('assets')
      .select('*, tenant:tenants(name)')
      .order('created_at', { ascending: false })

    // 각 자산에 대한 계약 정보 조회
    const assetsWithContracts = await Promise.all(
      (assets || []).map(async (asset: any) => {
        const { data: contractItems } = await supabaseAdmin
          .from('contract_items')
          .select(`
            *,
            contract:contracts(*)
          `)
          .eq('asset_id', asset.id)
          .order('contract(end_date)', { ascending: false })
          .limit(1)

        return {
          ...asset,
          activeContract: contractItems && contractItems.length > 0 ? contractItems[0] : null,
        }
      })
    )

    return NextResponse.json({ assets: assetsWithContracts || [] })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '자산 목록 조회에 실패했습니다.' },
      { status: 500 }
    )
  }
}

