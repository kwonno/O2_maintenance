import { createClient } from '@/lib/supabase/server'

export async function getTenantUser(userId: string) {
  const supabase = await createClient()
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
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('tenant_users')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'operator_admin')
    
    // .single() 대신 배열로 받아서 확인
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
