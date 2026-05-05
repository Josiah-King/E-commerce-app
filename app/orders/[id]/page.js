'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'

// Status steps in order
const STATUS_STEPS = [
  { key: 'PENDING', label: 'Order Placed', icon: '📋' },
  { key: 'PAID', label: 'Payment Confirmed', icon: '✅' },
  { key: 'PREPARING', label: 'Being Prepared', icon: '👨‍🍳' },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: '🛵' },
  { key: 'DELIVERED', label: 'Delivered', icon: '📦' },
  { key: 'COMPLETED', label: 'Completed', icon: '🎉' },
]

export default function OrderTrackingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const orderId = params.id

  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Redirect to login if not logged in
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  // Fetch order details
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

  // Fetch order when page loads
  useEffect(() => {
    if (status !== 'authenticated') return
    fetchOrder()
  }, [status, orderId])

  // Auto refresh every 10 seconds to check for status updates
  useEffect(() => {
    if (status !== 'authenticated') return

    const interval = setInterval(() => {
      fetchOrder()
    }, 10000)

    // Cleanup interval when page is closed
    return () => clearInterval(interval)
  }, [status, orderId])

  // Get the index of the current status
  function getCurrentStepIndex() {
    return STATUS_STEPS.findIndex((step) => step.key === order?.status)
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center">
        <p className="text-orange-500 text-lg font-medium">
          Loading your order...
        </p>
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
            className="bg-orange-500 text-white px-6 py-2 rounded-lg"
          >
            Back to Menu
          </button>
        </div>
      </div>
    )
  }

  const currentStepIndex = getCurrentStepIndex()

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
          <h1 className="text-xl font-bold text-orange-500">Track Order</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* ── Order Status Card ── */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold text-gray-800 text-lg">Order Status</h2>
            <span className="text-xs text-gray-400">
              Updates every 10s
            </span>
          </div>

          {/* Status Steps */}
          <div className="space-y-4">
            {STATUS_STEPS.map((step, index) => {
              const isCompleted = index <= currentStepIndex
              const isCurrent = index === currentStepIndex

              return (
                <div key={step.key} className="flex items-center gap-4">

                  {/* Step Icon */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${
                      isCompleted
                        ? 'bg-orange-500'
                        : 'bg-gray-100'
                    }`}
                  >
                    {step.icon}
                  </div>

                  {/* Step Label */}
                  <div className="flex-1">
                    <p
                      className={`font-medium ${
                        isCurrent
                          ? 'text-orange-500'
                          : isCompleted
                          ? 'text-gray-800'
                          : 'text-gray-300'
                      }`}
                    >
                      {step.label}
                    </p>
                    {isCurrent && (
                      <p className="text-xs text-orange-400 mt-0.5">
                        Current status
                      </p>
                    )}
                  </div>

                  {/* Checkmark for completed steps */}
                  {isCompleted && (
                    <span className="text-orange-500 font-bold">✓</span>
                  )}

                </div>
              )
            })}
          </div>
        </div>

        {/* ── Order Summary ── */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="font-bold text-gray-800 text-lg mb-4">
            Order Summary
          </h2>

          <div className="space-y-3">
            {order?.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-gray-800">
                    {item.product.name}
                  </p>
                  <p className="text-sm text-gray-400">x{item.quantity}</p>
                </div>
                <p className="font-semibold text-gray-800">
                  Ksh {item.price * item.quantity}
                </p>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="border-t border-gray-100 mt-4 pt-4 flex justify-between">
            <p className="font-bold text-gray-800">Total</p>
            <p className="font-bold text-orange-500 text-lg">
              Ksh {order?.total}
            </p>
          </div>
        </div>

        {/* ── Delivery Details ── */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="font-bold text-gray-800 text-lg mb-4">
            Delivery Details
          </h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <p className="text-gray-500">Hostel</p>
              <p className="font-medium text-gray-800">{order?.hostel}</p>
            </div>
            <div className="flex justify-between">
              <p className="text-gray-500">Room</p>
              <p className="font-medium text-gray-800">{order?.roomNo}</p>
            </div>
            <div className="flex justify-between">
              <p className="text-gray-500">Phone</p>
              <p className="font-medium text-gray-800">{order?.phone}</p>
            </div>
          </div>
        </div>

        {/* ── Order Again Button ── */}
        {order?.status === 'COMPLETED' && (
          <button
            onClick={() => router.push('/menu')}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-4 rounded-2xl shadow-lg transition"
          >
            Order Again 🍟
          </button>
        )}

      </main>
    </div>
  )
}
