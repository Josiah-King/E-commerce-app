import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { auth } from '@/auth'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

export async function GET() {
  try {
    const session = await auth()

    if (!session || session.user.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 401 }
      )
    }

    // Fetch all orders newest first with user and items
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { nickname: true, email: true },
        },
        items: {
          include: { product: true },
        },
      },
    })

    // Build last 7 days revenue data for bar chart
    const last7Days = []
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        date.setHours(0, 0, 0, 0)

        const nextDate = new Date(date)
        nextDate.setDate(nextDate.getDate() + 1)

        const dayOrders = orders.filter((o) => {
            const orderDate = new Date(o.createdAt)
            return (
                orderDate >= date &&
                orderDate < nextDate &&
                o.status !== 'CANCELLED'
            )
        })

        const revenue = dayOrders.reduce((sum, o) => sum + o.total, 0)

        // Use actual day name from the date itself
        last7Days.push({
            label: dayNames[date.getDay()],
            revenue,
        })
    }

    return NextResponse.json({ orders, last7Days })

  } catch (error) {
    console.error('Analytics fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
