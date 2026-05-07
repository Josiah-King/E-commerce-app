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
      return NextResponse.json(
        { error: 'You must be logged in' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        nickname: true,
        hostel: true,
        roomNo: true,
        email: true,
      },
    })

    return NextResponse.json({ user })

  } catch (error) {
    console.error('Profile fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    // Check if the user is logged in
    const session = await auth()

    if (!session) {
      return NextResponse.json(
        { error: 'You must be logged in' },
        { status: 401 }
      )
    }

    // Get the data from the form
    const { nickname, hostel, roomNo } = await request.json()

    // Check all fields are filled
    if (!nickname || !hostel || !roomNo) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Validate nickname — only letters, numbers, underscores
    // between 3 and 15 characters
    const nicknameRegex = /^[a-zA-Z0-9_]{3,15}$/
    if (!nicknameRegex.test(nickname)) {
      return NextResponse.json(
        {
          error:
            'Nickname must be 3-15 characters and contain only letters, numbers or underscores',
        },
        { status: 400 }
      )
    }

    // Check if nickname is already taken by someone else
    const existingNickname = await prisma.user.findUnique({
      where: { nickname },
    })

    if (existingNickname && existingNickname.id !== session.user.id) {
      return NextResponse.json(
        { error: 'This nickname is already taken. Try another one.' },
        { status: 400 }
      )
    }

    // Save the profile details to the database
    await prisma.user.update({
      where: { id: session.user.id },
      data: { nickname, hostel, roomNo },
    })

    return NextResponse.json(
      { message: 'Profile updated successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
