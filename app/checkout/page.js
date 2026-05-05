'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function CheckoutPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // Cart items loaded from sessionStorage
  const [cartItems, setCartItems] = useState([])

  // Delivery details — pre filled from profile
  const [phone, setPhone] = useState('')
  const [hostel, setHostel] = useState('')
  const [roomNo, setRoomNo] = useState('')

  // Form state
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Redirect to login if not logged in
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  // Load cart from sessionStorage and pre fill delivery details
  useEffect(() => {
    if (status !== 'authenticated') return

    // Load cart
    const savedCart = sessionStorage.getItem('cart')
    if (!savedCart) {
      // No cart found — go back to menu
      router.push('/menu')
      return
    }

    const cartObject = JSON.parse(savedCart)
    const items = Object.values(cartObject)

    if (items.length === 0) {
      router.push('/menu')
      return
    }

    setCartItems(items)

    // Pre fill delivery details from session
    setHostel(session?.user?.hostel || '')
    setRoomNo(session?.user?.roomNo || '')

  }, [status, session, router])

  // Calculate total price
  const totalPrice = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  )

  // Calculate total items
  const totalItems = cartItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  )

  // Format phone number to 254 format
  function formatPhone(phone) {
    let cleaned = phone.replace(/\D/g, '')
    if (cleaned.startsWith('0')) {
      cleaned = '254' + cleaned.slice(1)
    }
    if (cleaned.startsWith('+')) {
      cleaned = cleaned.slice(1)
    }
    return cleaned
  }

  async function handlePlaceOrder(e) {
    e.preventDefault()
    setError('')

    // Validate phone number
    if (!phone) {
      setError('Please enter your M-Pesa phone number')
      return
    }

    const formattedPhone = formatPhone(phone)

    if (formattedPhone.length !== 12) {
      setError('Please enter a valid Safaricom number e.g. 0712345678')
      return
    }

    if (!hostel || !roomNo) {
      setError('Please fill in your delivery details')
      return
    }

    setLoading(true)

    try {
      // Send order to backend
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartItems.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
            price: item.product.price,
          })),
          total: totalPrice,
          phone: formattedPhone,
          hostel,
          roomNo,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to place order. Please try again.')
        setLoading(false)
        return
      }

      // Clear cart from sessionStorage
      sessionStorage.removeItem('cart')

      // Redirect to order tracking page
      router.push(`/orders/${data.orderId}`)

    } catch (error) {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  if (status === 'loading' || cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center">
        <p className="text-orange-500 text-lg font-medium">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-orange-50">

      {/* ── Header ── */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="text-gray-500 hover:text-gray-700 transition"
          >
            ← Back
          </button>
          <h1 className="text-xl font-bold text-orange-500">Your Order</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* ── Order Summary ── */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="font-bold text-gray-800 text-lg mb-4">
            Order Summary
          </h2>

          <div className="space-y-3">
            {cartItems.map((item) => (
              <div
                key={item.product.id}
                className="flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-gray-800">{item.product.name}</p>
                  <p className="text-sm text-gray-400">x{item.quantity}</p>
                </div>
                <p className="font-semibold text-gray-800">
                  Ksh {item.product.price * item.quantity}
                </p>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100 mt-4 pt-4 flex justify-between">
            <div>
              <p className="text-gray-500 text-sm">
                {totalItems} {totalItems === 1 ? 'item' : 'items'}
              </p>
              <p className="font-bold text-gray-800 text-lg">Total</p>
            </div>
            <p className="font-bold text-orange-500 text-xl">
              Ksh {totalPrice}
            </p>
          </div>
        </div>

        {/* ── Delivery Details ── */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="font-bold text-gray-800 text-lg mb-4">
            Delivery Details
          </h2>

          <div className="space-y-4">
            {/* Hostel */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hostel
              </label>
              <input
                type="text"
                value={hostel}
                onChange={(e) => setHostel(e.target.value)}
                placeholder="e.g. Block A Hostel"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            {/* Room Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Room Number
              </label>
              <input
                type="text"
                value={roomNo}
                onChange={(e) => setRoomNo(e.target.value)}
                placeholder="e.g. A12"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
          </div>
        </div>

        {/* ── M-Pesa Payment ── */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="font-bold text-gray-800 text-lg mb-1">
            Pay with M-Pesa
          </h2>
          <p className="text-gray-400 text-sm mb-4">
            You will receive a payment prompt on your phone
          </p>

          {/* Phone Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              M-Pesa Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 0712345678"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <p className="text-xs text-gray-400 mt-1">
              Enter the Safaricom number to pay from
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* ── Place Order Button ── */}
        <button
          onClick={handlePlaceOrder}
          disabled={loading}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-4 rounded-2xl shadow-lg transition disabled:opacity-50 mb-8"
        >
          {loading
            ? 'Placing order...'
            : `Pay Ksh ${totalPrice} via M-Pesa`}
        </button>

      </main>
    </div>
  )
}
