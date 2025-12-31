import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// 서비스 역할 키를 사용하는 관리자 클라이언트
// RLS를 우회하여 모든 데이터에 접근 가능
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}



