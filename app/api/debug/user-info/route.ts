import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getTenantUser, isOperatorAdmin } from '@/lib/auth/tenant'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // 서비스 역할 키를 사용하여 RLS 우회
    const supabase = createAdminClient()
    
    // tenant_users 정보 조회
    const { data: tenantUsers, error: tenantUsersError } = await supabase
      .from('tenant_users')
      .select('*, tenant:tenants(*)')
      .eq('user_id', user.id)

    const isAdmin = await isOperatorAdmin(user.id)
    const tenantUser = await getTenantUser(user.id)

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      tenantUsers: tenantUsers || [],
      tenantUsersError: tenantUsersError ? {
        message: tenantUsersError.message,
        code: tenantUsersError.code,
      } : null,
      isOperatorAdmin: isAdmin,
      tenantUser: tenantUser,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get user info' },
      { status: 500 }
    )
  }
}

