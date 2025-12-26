import { create } from 'zustand'

interface Tenant {
  id: string
  name: string
}

interface TenantUser {
  id: string
  user_id: string
  tenant_id: string
  role: 'customer' | 'operator_admin'
  tenant: Tenant
}

interface TenantStore {
  tenantUser: TenantUser | null
  setTenantUser: (tenantUser: TenantUser | null) => void
  isOperatorAdmin: boolean
}

export const useTenantStore = create<TenantStore>((set) => ({
  tenantUser: null,
  setTenantUser: (tenantUser) => set({ 
    tenantUser,
    isOperatorAdmin: tenantUser?.role === 'operator_admin'
  }),
  isOperatorAdmin: false,
}))

