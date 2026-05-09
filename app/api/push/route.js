import { NextResponse } from 'next/server'
import { auth } from '@/auth'

// Store subscriptions in memory for now
// In production you'd save these to the database
const subscriptions = new Set()

export async function POST(request) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 401 }
      )
    }

    const { subscription } = await request.json()
    subscriptions.add(JSON.stringify(subscription))

    return NextResponse.json({ message: 'Subscribed successfully' })
  } catch (error) {
    console.error('Push subscription error:', error)
    return NextResponse.json(
      { error: 'Failed to subscribe' },
      { status: 500 }
    )
  }
}

export { subscriptions }
