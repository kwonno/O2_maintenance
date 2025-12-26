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
    const { data, error } = await supabase
      .from('users')
      .select('id, email, name, created_at, password_hash')
      .eq('email', email.toLowerCase())
      .single()

    if (error) {
      console.error('Database error:', error)
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

    const isValid = await bcrypt.compare(password, data.password_hash)
    if (!isValid) {
      console.error('Password mismatch for user:', email)
      return null
    }

    return {
      id: data.id,
      email: data.email,
      name: data.name,
      created_at: data.created_at,
    }
  } catch (error) {
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

