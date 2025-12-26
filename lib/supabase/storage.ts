// 서버 전용 함수들
export async function getSignedUrl(filePath: string, expiresIn: number = 3600) {
  // Admin client를 사용하여 RLS 우회
  const { createAdminClient } = await import('./admin')
  const supabase = createAdminClient()
  const { data, error } = await supabase.storage
    .from('reports')
    .createSignedUrl(filePath, expiresIn)

  if (error) {
    console.error('Failed to create signed URL:', error)
    throw error
  }
  return data.signedUrl
}

