import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { auth } from '@/auth'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

export async function GET() {
  try {
    const session = await auth()

    if (!session) {
      return NextResponse.json({ hasProfile: false })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    return NextResponse.json({
      hasProfile: !!user?.nickname,
    })
  } catch (error) {
    console.error('Profile check error:', error)
    return NextResponse.json({ hasProfile: false })
  }
}
