import { createClient as createServerClient } from './server'
import { createClient as createBrowserClient } from './client'

export async function getSignedUrl(filePath: string, expiresIn: number = 3600) {
  const supabase = await createServerClient()
  const { data, error } = await supabase.storage
    .from('reports')
    .createSignedUrl(filePath, expiresIn)

  if (error) throw error
  return data.signedUrl
}

export async function uploadReport(
  tenantId: string,
  yyyyMm: string,
  reportId: string,
  file: File,
  isClient: boolean = false
) {
  const supabase = isClient ? createBrowserClient() : await createServerClient()
  const filePath = `tenant/${tenantId}/inspections/${yyyyMm}/${reportId}.pdf`

  const { data, error } = await supabase.storage
    .from('reports')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) throw error
  return filePath
}

