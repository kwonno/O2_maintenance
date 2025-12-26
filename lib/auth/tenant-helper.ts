import { createAdminClient } from '@/lib/supabase/admin'

// tenant_users 조회를 위한 헬퍼 함수 (RLS 우회)
export async function getTenantUserByUserId(userId: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('tenant_users')
    .select('tenant_id, role, tenant:tenants(*)')
    .eq('user_id', userId)
    .maybeSingle()
  
  if (error || !data) {
    return null
  }
  
  return {
    tenant_id: data.tenant_id,
    role: data.role,
    tenant: data.tenant,
  }
}

export async function isOperatorAdminByUserId(userId: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('tenant_users')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'operator_admin')
  
  if (error) {
    return false
  }
  
  return !!(data && data.length > 0)
}

