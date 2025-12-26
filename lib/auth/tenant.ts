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
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tenant_users')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'operator_admin')
    .single()
  
  return !error && !!data
}
