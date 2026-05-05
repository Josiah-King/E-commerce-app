import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { auth } from '@/auth'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

// CREATE ORDER
export async function POST(request) {
  try {
    // Check if user is logged in
    const session = await auth()

    if (!session) {
      return NextResponse.json(
        { error: 'You must be logged in' },
        { status: 401 }
      )
    }

    const { items, total, phone, hostel, roomNo } = await request.json()

    // Validate the order
    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'Your order is empty' },
        { status: 400 }
      )
    }

    if (!phone || !hostel || !roomNo) {
      return NextResponse.json(
        { error: 'Please fill in all delivery details' },
        { status: 400 }
      )
    }

    // Create the order in the database
    const order = await prisma.order.create({
      data: {
        userId: session.user.id,
        total,
        phone,
        hostel,
        roomNo,
        status: 'PENDING',
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
    })

    return NextResponse.json(
      { message: 'Order created successfully', orderId: order.id },
      { status: 201 }
    )

  } catch (error) {
    console.error('Order creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create order. Please try again.' },
      { status: 500 }
    )
  }
}

// GET ALL ORDERS (OWNER ONLY)
export async function GET() {
  try {
    const session = await auth()

    // Only owner can see all orders
    if (!session || session.user.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 401 }
      )
    }

    // Fetch all orders, newest first
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            nickname: true,
            email: true,
          },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
    })

    return NextResponse.json({ orders })

  } catch (error) {
    console.error('Orders fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}