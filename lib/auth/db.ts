import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import bcrypt from 'bcryptjs'

export interface User {
  id: string
  email: string
  name: string | null
  created_at: string
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('users')
    .select('id, email, name, created_at, password_hash')
    .eq('email', email.toLowerCase())
    .single()

  if (error || !data) {
    return null
  }

  return {
    id: data.id,
    email: data.email,
    name: data.name,
    created_at: data.created_at,
  }
}

export async function verifyPassword(email: string, password: string): Promise<User | null> {
  try {
    if (!email || !password) {
      return null
    }

    // users 테이블은 RLS가 없거나 간단하므로 일반 클라이언트 사용 가능
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('users')
      .select('id, email, name, created_at, password_hash')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (error) {
      console.error('Database error:', error)
      return null
    }

    if (!data || !data.password_hash) {
      return null
    }

    const isValid = await bcrypt.compare(password, data.password_hash)
    
    if (!isValid) {
      return null
    }

    return {
      id: data.id,
      email: data.email,
      name: data.name,
      created_at: data.created_at,
    }
  } catch (error: any) {
    console.error('verifyPassword error:', error)
    return null
  }
}

export async function createUser(email: string, password: string, name?: string): Promise<User | null> {
  const supabase = await createClient()
  const passwordHash = await bcrypt.hash(password, 10)

  const { data, error } = await supabase
    .from('users')
    .insert({
      email: email.toLowerCase(),
      password_hash: passwordHash,
      name: name || null,
    })
    .select('id, email, name, created_at')
    .single()

  if (error || !data) {
    return null
  }

  return {
    id: data.id,
    email: data.email,
    name: data.name,
    created_at: data.created_at,
  }
}

