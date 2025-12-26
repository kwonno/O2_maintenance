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

    return NextResponse.json({ assets: assets || [] })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '자산 목록 조회에 실패했습니다.' },
      { status: 500 }
    )
  }
}

