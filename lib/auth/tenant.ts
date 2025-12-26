import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function getTenantUser(userId: string) {
  // RLS 문제를 피하기 위해 서비스 역할 키 사용
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('tenant_users')
    .select('*, tenant:tenants(*)')
    .eq('user_id', userId)
    .single()
  
  if (error || !data) {
    return null
  }
  
  return data
}

export async function isOperatorAdmin(userId: string) {
  try {
    // RLS 문제를 피하기 위해 서비스 역할 키 사용
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('tenant_users')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'operator_admin')
    
    if (error) {
      console.error('isOperatorAdmin error:', error)
      return false
    }
    
    // operator_admin 역할이 하나라도 있으면 true
    return !!(data && data.length > 0)
  } catch (error) {
    console.error('isOperatorAdmin exception:', error)
    return false
  }
}
