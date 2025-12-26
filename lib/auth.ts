import { getCurrentUser as getCurrentUserFromSession } from './auth/session'
import { getTenantUser as getTenantUserFromDB, isOperatorAdmin as isOperatorAdminFromDB } from './auth/tenant'
import { redirect } from 'next/navigation'

export async function getCurrentUser() {
  return await getCurrentUserFromSession()
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }
  return user
}

export async function getTenantUser(userId: string) {
  return await getTenantUserFromDB(userId)
}

export async function isOperatorAdmin(userId: string) {
  return await isOperatorAdminFromDB(userId)
}

