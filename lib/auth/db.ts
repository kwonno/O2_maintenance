import { createClient } from '@/lib/supabase/server'
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
    const supabase = await createClient()
    
    if (!email || !password) {
      console.error('Missing email or password')
      return null
    }

    const { data, error } = await supabase
      .from('users')
      .select('id, email, name, created_at, password_hash')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (error) {
      console.error('Database error:', error)
      console.error('Error code:', error.code)
      console.error('Error message:', error.message)
      return null
    }

    if (!data) {
      console.error('User not found:', email)
      return null
    }

    if (!data.password_hash) {
      console.error('Password hash missing for user:', email)
      return null
    }

    console.log('비밀번호 비교 시작...', { 
      email, 
      hashLength: data.password_hash.length,
      hashPrefix: data.password_hash.substring(0, 20)
    })

    const isValid = await bcrypt.compare(password, data.password_hash)
    
    console.log('비밀번호 비교 결과:', isValid)
    
    if (!isValid) {
      console.error('Password mismatch for user:', email)
      // 디버깅: 해시 확인
      console.error('Stored hash:', data.password_hash.substring(0, 30) + '...')
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
    console.error('Error stack:', error.stack)
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

