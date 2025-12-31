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
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, email, name, created_at')
      .order('created_at', { ascending: false })

    const usersWithTenants = await Promise.all(
      (users || []).map(async (u: any) => {
        const { data: tenantUser } = await supabaseAdmin
          .from('tenant_users')
          .select('tenant:tenants(name), role')
          .eq('user_id', u.id)
          .maybeSingle()
        return {
          ...u,
          tenant: tenantUser?.tenant,
          role: tenantUser?.role,
        }
      })
    )

    return NextResponse.json({ users: usersWithTenants })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '사용자 목록 조회에 실패했습니다.' },
      { status: 500 }
    )
  }
}




