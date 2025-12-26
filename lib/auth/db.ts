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
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('users')
    .select('id, email, name, created_at, password_hash')
    .eq('email', email.toLowerCase())
    .single()

  if (error || !data) {
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

