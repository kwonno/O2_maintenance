'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTenantStore } from '@/store/tenant-store'

export function useTenant() {
  const { tenantUser, setTenantUser, isOperatorAdmin } = useTenantStore()
  const supabase = createClient()

  useEffect(() => {
    async function loadTenant() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setTenantUser(null)
        return
      }

      const { data, error } = await supabase
        .from('tenant_users')
        .select('*, tenant:tenants(*)')
        .eq('user_id', user.id)
        .single()

      if (error || !data) {
        setTenantUser(null)
        return
      }

      setTenantUser(data as any)
    }

    loadTenant()
  }, [supabase, setTenantUser])

  return {
    tenantUser,
    tenantId: tenantUser?.tenant_id,
    isOperatorAdmin,
    isLoading: tenantUser === null,
  }
}

