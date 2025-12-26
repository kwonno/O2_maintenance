import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { User } from './db'

const SESSION_COOKIE_NAME = 'session_id'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7일

export async function createSession(userId: string): Promise<string> {
  const sessionId = crypto.randomUUID()

  // 세션을 DB에 저장 (또는 메모리/Redis 사용 가능)
  // 간단하게 쿠키에만 저장하되, 나중에 확장 가능하도록 구조화
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })

  // 세션 정보를 별도 테이블에 저장 (선택사항, 현재는 쿠키만 사용)
  // 향후 확장을 위해 구조만 준비
  return sessionId
}

export async function getSession(): Promise<string | null> {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value
  return sessionId || null
}

export async function getCurrentUser(): Promise<User | null> {
  const sessionId = await getSession()
  if (!sessionId) {
    return null
  }

  // 쿠키에서 userId를 직접 저장하지 않고, 세션 테이블을 사용하거나
  // JWT를 사용할 수 있지만, 간단하게 쿠키에 userId를 저장하는 방식 사용
  // 보안을 위해 JWT로 전환 권장
  const cookieStore = await cookies()
  const userId = cookieStore.get('user_id')?.value

  if (!userId) {
    return null
  }

  // 서비스 역할 키를 사용하여 RLS 우회
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('users')
    .select('id, email, name, created_at')
    .eq('id', userId)
    .single()

  if (error || !data) {
    console.error('getCurrentUser error:', error)
    return null
  }

  return {
    id: data.id,
    email: data.email,
    name: data.name,
    created_at: data.created_at,
  }
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
  cookieStore.delete('user_id')
}

export async function setUserId(userId: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set('user_id', userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })
}

