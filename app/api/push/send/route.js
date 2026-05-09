import { NextResponse } from 'next/server'
import webpush from 'web-push'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

export async function POST(request) {
  try {
    const { title, body, url } = await request.json()

    // Fetch all subscriptions from database
    const subscriptions = await prisma.pushSubscription.findMany()

    if (subscriptions.length === 0) {
      console.log('No push subscriptions found')
      return NextResponse.json({ message: 'No subscribers' })
    }

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
          .catch((err) => {
            console.error('Push send error:', err)
            if (err.statusCode === 410) {
              return prisma.pushSubscription.delete({
                where: { endpoint: sub.endpoint },
              })
            }
          })
      )
    )

    return NextResponse.json({ message: 'Notifications sent' })
  } catch (error) {
    console.error('Push send error:', error)
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    )
  }
}
