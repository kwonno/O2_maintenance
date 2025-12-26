// 서버 전용 함수들
export async function getSignedUrl(filePath: string, expiresIn: number = 3600) {
  const { createClient } = await import('./server')
  const supabase = await createClient()
  const { data, error } = await supabase.storage
    .from('reports')
    .createSignedUrl(filePath, expiresIn)

  if (error) throw error
  return data.signedUrl
}

