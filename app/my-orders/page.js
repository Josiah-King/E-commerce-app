'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

// Color coding for each status badge
const STATUS_COLORS = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  PAID: 'bg-blue-100 text-blue-700',
  PREPARING: 'bg-purple-100 text-purple-700',
  OUT_FOR_DELIVERY: 'bg-orange-100 text-orange-700',
  DELIVERED: 'bg-green-100 text-green-700',
  COMPLETED: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-red-100 text-red-600',
}

const STATUS_LABELS = {
  PENDING: 'Pending',
  PAID: 'Paid',
  PREPARING: 'Preparing',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

// These statuses mean the order is still active
const ACTIVE_STATUSES = [
  'PENDING',
  'PAID',
  'PREPARING',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
]

export default function MyOrdersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Redirect to login if not logged in
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  // Fetch orders when page loads
  useEffect(() => {
    if (status !== 'authenticated') return

    async function fetchOrders() {
      try {
        const response = await fetch('/api/my-orders')
        const data = await response.json()

        if (!response.ok) {
          setError('Failed to load your orders')
          return
        }

        setOrders(data.orders)
      } catch (error) {
        setError('Failed to load your orders')
      } finally {
        setLoading(false)
      }
    }

    fetchOrders()
  }, [status])

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center">
        <p className="text-orange-500 text-lg font-medium">
          Loading your orders...
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-orange-50">

      {/* ── Header ── */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.push('/menu')}
            className="text-gray-500 hover:text-gray-700 transition"
          >
            ← Menu
          </button>
          <h1 className="text-xl font-bold text-orange-500">My Orders</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">

        {/* Error */}
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        {/* Empty State */}
        {orders.length === 0 && !error && (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">🛒</p>
            <p className="text-gray-500 text-lg font-medium">
              No orders yet
            </p>
            <p className="text-gray-400 text-sm mt-1 mb-6">
              Your orders will appear here after you place them
            </p>
            <button
              onClick={() => router.push('/menu')}
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-xl transition"
            >
              Order Now 🍟
            </button>
          </div>
        )}

        {/* ── Orders List ── */}
        <div className="space-y-4">
          {orders.map((order) => {
            const isActive = ACTIVE_STATUSES.includes(order.status)

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl shadow-sm p-5"
              >

                {/* Order Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[order.status]}`}
                    >
                      {STATUS_LABELS[order.status]}
                    </span>
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(order.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <p className="font-bold text-orange-500 text-lg">
                    Ksh {order.total}
                  </p>
                </div>

                {/* Order Items */}
                <div className="bg-gray-50 rounded-xl p-3 mb-4 space-y-1">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between text-sm"
                    >
                      <span className="text-gray-700">
                        {item.product.name}{' '}
                        <span className="text-gray-400">
                          x{item.quantity}
                        </span>
                      </span>
                      <span className="font-medium text-gray-800">
                        Ksh {item.price * item.quantity}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Delivery Info */}
                <div className="text-sm text-gray-500 mb-4">
                  🏠 {order.hostel}, Room {order.roomNo}
                </div>

                {/* Track Order Button for active orders */}
                {isActive && (
                  <button
                    onClick={() => router.push(`/orders/${order.id}`)}
                    className="w-full border border-orange-500 text-orange-500 hover:bg-orange-50 font-semibold py-2.5 rounded-xl transition text-sm"
                  >
                    Track Order →
                  </button>
                )}

              </div>
            )
          })}
        </div>

      </main>
    </div>
  )
}
