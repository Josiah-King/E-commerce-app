import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { auth } from '@/auth'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

// Gets the settings row, creating it (shop open) if it doesn't exist yet
async function getSettings() {
  return prisma.shopSettings.upsert({
    where: { id: 'main' },
    update: {},
    create: { id: 'main' },
  })
}

// GET: any logged-in user can check if the shop is open
export async function GET() {
  try {
    const session = await auth()

    if (!session) {
      return NextResponse.json(
        { error: 'You must be logged in' },
        { status: 401 }
      )
    }

    const settings = await getSettings()

    return NextResponse.json({
      isOpen: settings.isOpen,
      closedMessage: settings.closedMessage,
    })
  } catch (error) {
    console.error('Shop settings fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to load shop status' },
      { status: 500 }
    )
  }
}

// PATCH: only the owner can open or close the shop
export async function PATCH(request) {
  try {
    const session = await auth()

    if (!session || session.user.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 401 }
      )
    }

    const { isOpen, closedMessage } = await request.json()

    if (typeof isOpen !== 'boolean') {
      return NextResponse.json(
        { error: 'isOpen must be true or false' },
        { status: 400 }
      )
    }

    // Clean up the message: trim spaces, limit length, empty becomes null
    let message = null
    if (typeof closedMessage === 'string') {
      message = closedMessage.trim().slice(0, 120) || null
    }

    // When opening the shop, clear the old closed message
    const settings = await prisma.shopSettings.upsert({
      where: { id: 'main' },
      update: {
        isOpen,
        closedMessage: isOpen ? null : message,
      },
      create: {
        id: 'main',
        isOpen,
        closedMessage: isOpen ? null : message,
      },
    })

    return NextResponse.json({
      isOpen: settings.isOpen,
      closedMessage: settings.closedMessage,
    })
  } catch (error) {
    console.error('Shop settings update error:', error)
    return NextResponse.json(
      { error: 'Failed to update shop status' },
      { status: 500 }
    )
  }
}
