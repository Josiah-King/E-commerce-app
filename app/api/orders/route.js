import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { auth } from '@/auth'
import webpush from 'web-push'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

async function sendPushNotification(title, body, url) {
  // Run in background — don't await so order creation isn't blocked
  Promise.resolve().then(async () => {
    try {
      const subscriptions = await prisma.pushSubscription.findMany()
      if (subscriptions.length === 0) {
        console.log('No subscriptions found in database')
        return
      }

      console.log(`Sending push to ${subscriptions.length} subscription(s)`)

      const payload = JSON.stringify({ title, body, url })

      await Promise.all(
        subscriptions.map((sub) =>
          webpush
            .sendNotification(
              {
                endpoint: sub.endpoint,
                keys: {
                  p256dh: sub.p256dh,
                  auth: sub.auth,
                },
              },
              payload
            )
            .then(() => console.log('Push sent successfully'))
            .catch((err) => {
              console.error('Push send failed:', err.message)
              if (err.statusCode === 410) {
                return prisma.pushSubscription.delete({
                  where: { endpoint: sub.endpoint },
                })
              }
            })
        )
      )
    } catch (err) {
      console.error('Push notification error:', err.message)
    }
  })
}

export async function POST(request) {
  try {
    const session = await auth()

    if (!session) {
      return NextResponse.json(
        { error: 'You must be logged in' },
        { status: 401 }
      )
    }

    const { items, total, phone, hostel, roomNo } = await request.json()

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

    // Get student nickname
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { nickname: true, email: true },
    })

    const studentName = user?.nickname || user?.email

    // Create the order
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

    // Send push notification immediately
    await sendPushNotification(
      '🍟 New Order!',
      `@${studentName} ordered — Ksh ${total} · ${hostel} Room ${roomNo}`,
      '/dashboard'
    )

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

export async function GET() {
  try {
    const session = await auth()

    if (!session || session.user.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 401 }
      )
    }

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
