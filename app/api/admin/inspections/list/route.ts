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
    const { data: inspections } = await supabaseAdmin
      .from('inspections')
      .select(`
        *,
        tenant:tenants(name),
        reports:inspection_reports(*)
      `)
      .order('created_at', { ascending: false })

    return NextResponse.json({ inspections: inspections || [] })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '점검 목록 조회에 실패했습니다.' },
      { status: 500 }
    )
  }
}

