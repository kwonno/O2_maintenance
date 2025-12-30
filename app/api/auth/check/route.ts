import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { isOperatorAdmin } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ authenticated: false })
    }

    const isAdmin = await isOperatorAdmin(user.id)

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      isAdmin,
    })
  } catch (error: any) {
    return NextResponse.json(
      { authenticated: false, error: error.message },
      { status: 500 }
    )
  }
}


