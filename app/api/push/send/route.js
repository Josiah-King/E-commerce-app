import { NextResponse } from 'next/server'
import webpush from 'web-push'
import { subscriptions } from '../route'

webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

export async function POST(request) {
  try {
    const { title, body, url } = await request.json()

    const payload = JSON.stringify({ title, body, url })

    const sendPromises = []
    subscriptions.forEach((subString) => {
      const subscription = JSON.parse(subString)
      sendPromises.push(
        webpush.sendNotification(subscription, payload).catch((err) => {
          console.error('Push send error:', err)
        })
      )
    })

    await Promise.all(sendPromises)

    return NextResponse.json({ message: 'Notifications sent' })
  } catch (error) {
    console.error('Push send error:', error)
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    )
  }
}
