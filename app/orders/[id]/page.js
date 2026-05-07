'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'

const STEPS = [
  {
    key: 'ORDER_PLACED',
    label: 'Order Placed',
    icon: '📋',
    doneIcon: '✓',
  },
  {
    key: 'RECEIVED',
    label: 'Received',
    icon: '👨‍🍳',
    doneIcon: '✓',
  },
  {
    key: 'ON_DELIVERY',
    label: 'On Delivery',
    icon: '🛵',
    doneIcon: '✓',
  },
  {
    key: 'COMPLETED',
    label: 'Completed',
    icon: '🎉',
    doneIcon: '✓',
  },
]

// Map database status to step index
function getStepIndex(status) {
  switch (status) {
    case 'PENDING':
    case 'PAID':
      return 0
    case 'PREPARING':
      return 1
    case 'OUT_FOR_DELIVERY':
      return 2
    case 'DELIVERED':
    case 'COMPLETED':
      return 3
    default:
      return 0
  }
}

// Hero content per status
function getHeroContent(status) {
  switch (status) {
    case 'PENDING':
      return {
        icon: '📋',
        label: 'Order Placed',
        sub: 'Waiting for payment confirmation',
        bg: 'bg-orange-500',
      }
    case 'PAID':
      return {
        icon: '✅',
        label: 'Payment Confirmed',
        sub: 'Your order has been received',
        bg: 'bg-orange-500',
      }
    case 'PREPARING':
      return {
        icon: '👨‍🍳',
        label: 'Being Prepared',
        sub: 'Your food is being prepared',
        bg: 'bg-orange-500',
      }
    case 'OUT_FOR_DELIVERY':
      return {
        icon: '🛵',
        label: 'On Delivery',
        sub: 'Your order is on the way!',
        bg: 'bg-orange-500',
      }
    case 'DELIVERED':
      return {
        icon: '📦',
        label: 'Delivered',
        sub: 'Your order has been delivered',
        bg: 'bg-green-500',
      }
    case 'COMPLETED':
      return {
        icon: '🎉',
        label: 'Completed',
        sub: 'Enjoy your meal!',
        bg: 'bg-green-500',
      }
    case 'CANCELLED':
      return {
        icon: '❌',
        label: 'Order Cancelled',
        sub: 'This order was cancelled',
        bg: 'bg-red-500',
      }
    default:
      return {
        icon: '📋',
        label: 'Order Placed',
        sub: 'Processing your order',
        bg: 'bg-orange-500',
      }
  }
}

export default function TrackOrderPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const orderId = params.id

  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Redirect if not logged in
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  // Fetch order
  async function fetchOrder() {
    try {
      const response = await fetch(`/api/orders/${orderId}`)
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || 'Failed to load order')
        return
      }
      setOrder(data.order)
    } catch (error) {
      setError('Failed to load order. Please refresh.')
    } finally {
      setLoading(false)
    }
  }

  // Fetch on load
  useEffect(() => {
    if (status !== 'authenticated') return
    fetchOrder()
  }, [status, orderId])

  // Auto refresh every 10 seconds
  useEffect(() => {
    if (status !== 'authenticated') return
    const interval = setInterval(() => {
      fetchOrder()
    }, 10000)
    return () => clearInterval(interval)
  }, [status, orderId])

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-3">🛵</p>
          <p className="text-orange-500 font-medium">
            Loading your order...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => router.push('/menu')}
            className="bg-orange-500 text-white px-6 py-2 rounded-xl"
          >
            Back to Menu
          </button>
        </div>
      </div>
    )
  }

  const isCancelled = order?.status === 'CANCELLED'
  const currentStepIndex = getStepIndex(order?.status)
  const hero = getHeroContent(order?.status)

  return (
    <div className="min-h-screen bg-orange-50">

      {/* ── Header ── */}
      <div className={`${hero.bg} px-4 pt-6 pb-10`}>
        <div className="max-w-md mx-auto">

          {/* Top Row */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => router.push('/menu')}
              className="text-white text-opacity-70 hover:text-white transition text-sm"
            >
              ← Menu
            </button>
            <h1 className="text-white text-lg font-bold">Track Order</h1>
          </div>

          {/* Status Hero */}
          <div className="text-center pb-4">
            <div className="text-5xl mb-3">{hero.icon}</div>
            <h2 className="text-white text-xl font-bold mb-1">
              {hero.label}
            </h2>
            <p className="text-white text-opacity-80 text-sm opacity-80">
              {hero.sub}
            </p>
          </div>

        </div>
      </div>

      <div className="max-w-md mx-auto px-4 -mt-4 pb-8 space-y-4">

        {/* ── Cancelled Banner ── */}
        {isCancelled && (
          <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-center">
            <p className="text-red-600 font-semibold text-sm">
              ❌ This order has been cancelled
            </p>
            <p className="text-red-400 text-xs mt-1">
              Please place a new order if you still want food
            </p>
          </div>
        )}

        {/* ── Step Bar ── */}
        <div className="bg-white rounded-2xl border border-orange-100 p-5">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const isDone = !isCancelled && index < currentStepIndex
              const isCurrent = !isCancelled && index === currentStepIndex
              const isUpcoming = isCancelled || index > currentStepIndex
              const isCancelledStep = isCancelled && index === 1

              return (
                <div key={step.key} className="flex items-center flex-1">

                  {/* Step */}
                  <div className="flex flex-col items-center gap-1.5">

                    {/* Circle */}
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                        isCancelledStep
                          ? 'bg-red-100 text-red-500'
                          : isDone
                          ? 'bg-orange-500 text-white'
                          : isCurrent
                          ? 'bg-orange-500 text-white ring-4 ring-orange-200'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {isCancelledStep
                        ? '✕'
                        : isDone
                        ? step.doneIcon
                        : isCurrent
                        ? step.icon
                        : step.icon}
                    </div>

                    {/* Label */}
                    <p
                      className={`text-xs font-medium text-center leading-tight max-w-14 ${
                        isCancelledStep
                          ? 'text-red-500'
                          : isDone || isCurrent
                          ? 'text-orange-500'
                          : 'text-gray-400'
                      }`}
                    >
                      {isCancelledStep ? 'Cancelled' : step.label}
                    </p>

                  </div>

                  {/* Connector line between steps */}
                  {index < STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-1 mb-5 ${
                        isCancelled
                          ? index === 0
                            ? 'bg-red-200'
                            : 'bg-gray-100'
                          : isDone
                          ? 'bg-orange-500'
                          : 'bg-gray-100'
                      }`}
                    />
                  )}

                </div>
              )
            })}
          </div>

          {/* Auto refresh note */}
          {!isCancelled && (
            <p className="text-center text-xs text-gray-400 mt-4">
              ↻ Updates every 10 seconds
            </p>
          )}
        </div>

        {/* ── Order Summary ── */}
        <div className="bg-white rounded-2xl border border-orange-100 p-5">
          <h3 className="font-bold text-gray-800 mb-4">Order Summary</h3>
          <div className="space-y-3">
            {order?.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {item.product.name}
                  </p>
                  <p className="text-xs text-gray-400">x{item.quantity}</p>
                </div>
                <p className="text-sm font-semibold text-gray-800">
                  Ksh {item.price * item.quantity}
                </p>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 mt-4 pt-4 flex justify-between">
            <p className="font-bold text-gray-800">Total</p>
            <p className="font-bold text-orange-500 text-lg">
              Ksh {order?.total}
            </p>
          </div>
        </div>

        {/* ── Delivery Details ── */}
        <div className="bg-white rounded-2xl border border-orange-100 p-5">
          <h3 className="font-bold text-gray-800 mb-4">Delivery Details</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <p className="text-sm text-gray-500">Hostel</p>
              <p className="text-sm font-medium text-gray-800">
                {order?.hostel}
              </p>
            </div>
            <div className="flex justify-between">
              <p className="text-sm text-gray-500">Room</p>
              <p className="text-sm font-medium text-gray-800">
                {order?.roomNo}
              </p>
            </div>
            <div className="flex justify-between">
              <p className="text-sm text-gray-500">Phone</p>
              <p className="text-sm font-medium text-gray-800">
                {order?.phone}
              </p>
            </div>
          </div>
        </div>

        {/* ── Order Again Button ── */}
        <button
          onClick={() => router.push('/menu')}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-4 rounded-2xl shadow-sm transition"
        >
          {isCancelled ? 'Order Again 🍟' : 'Back to Menu'}
        </button>

      </div>
    </div>
  )
}
