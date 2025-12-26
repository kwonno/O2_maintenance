import { NextResponse } from 'next/server'
import { deleteSession } from '@/lib/auth/session'

export async function POST() {
  try {
    await deleteSession()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}

// GET 요청도 지원 (기존 호환성)
export async function GET() {
  try {
    await deleteSession()
    return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'))
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'))
  }
}

