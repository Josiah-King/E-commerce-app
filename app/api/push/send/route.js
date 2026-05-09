import { NextResponse } from 'next/server'
import { subscriptions } from '../route'

export async function POST(request) {
  try {
    const { title, body, url } = await request.json()

    const payload = JSON.stringify({ title, body, url })

    // Send to all subscribed owners
    const sendPromises = []
    subscriptions.forEach((subString) => {
      const subscription = JSON.parse(subString)
      sendPromises.push(
        fetch(subscription.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: payload,
        }).catch((err) => console.error('Push send error:', err))
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
