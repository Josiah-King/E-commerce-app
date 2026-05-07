'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function getInitials(nickname, email) {
  const name = nickname || email || '?'
  return name.slice(0, 2).toUpperCase()
}

export default function MenuPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [products, setProducts] = useState([])
  const [cart, setCart] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeOrder, setActiveOrder] = useState(null)

  // Redirect to login if not logged in
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  // Fetch products
  useEffect(() => {
    async function fetchProducts() {
      try {
        const response = await fetch('/api/products')
        const data = await response.json()
        if (!response.ok) {
          setError('Failed to load menu. Please refresh.')
          return
        }
        setProducts(data.products)
      } catch (error) {
        setError('Failed to load menu. Please refresh.')
      } finally {
        setLoading(false)
      }
    }
    fetchProducts()
  }, [])

  // Check for active orders
  useEffect(() => {
    if (status !== 'authenticated') return

    async function checkActiveOrder() {
      try {
        const response = await fetch('/api/my-orders')
        const data = await response.json()
        if (!response.ok) return

        const active = data.orders.find((o) =>
          ['PENDING', 'PAID', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED']
            .includes(o.status)
        )
        setActiveOrder(active || null)
      } catch (error) {
        console.error('Active order check failed:', error)
      }
    }

    checkActiveOrder()
  }, [status])

  function addToCart(product) {
    setCart((prev) => ({
      ...prev,
      [product.id]: {
        product,
        quantity: prev[product.id] ? prev[product.id].quantity + 1 : 1,
      },
    }))
  }

  function removeFromCart(productId) {
    setCart((prev) => {
      const existing = prev[productId]
      if (!existing) return prev
      if (existing.quantity === 1) {
        const newCart = { ...prev }
        delete newCart[productId]
        return newCart
      }
      return {
        ...prev,
        [productId]: { ...existing, quantity: existing.quantity - 1 },
      }
    })
  }

  const totalItems = Object.values(cart).reduce(
    (sum, item) => sum + item.quantity, 0
  )

  const totalPrice = Object.values(cart).reduce(
    (sum, item) => sum + item.product.price * item.quantity, 0
  )

  // Separate available and out of stock products
  const availableProducts = products.filter((p) => p.available)
  const outOfStockProducts = products.filter((p) => !p.available)
  const sortedProducts = [...availableProducts, ...outOfStockProducts]

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">🍟</div>
          <p className="text-orange-500 font-medium">Loading menu...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-orange-50 pb-32">

      {/* ── Header ── */}
      <div className="bg-orange-500 px-4 pt-6 pb-8">
        <div className="max-w-2xl mx-auto">

          {/* Top Row */}
          <div className="flex items-start justify-between mb-4">

            {/* Left — Greeting */}
            <div>
              <p className="text-orange-100 text-sm">
                {getGreeting()},
              </p>
              <h1 className="text-white text-xl font-bold">
                @{session?.user?.nickname || session?.user?.email}
              </h1>
            </div>

            {/* Right — My Orders + Avatar + Logout */}
            {/* Right — My Orders + Avatar + Logout */}
            <div className="flex flex-col items-end gap-2">

              {/* My Orders + Avatar on same horizontal line */}
              <div className="flex items-center gap-3">

                {/* My Orders */}
                <button
                  onClick={() => router.push('/my-orders')}
                  className="bg-orange-400 hover:bg-orange-300 text-white text-xs font-medium px-3 py-1.5 rounded-xl transition"
                >
                  My Orders
                </button>

                {/* Avatar */}
                <button
                  onClick={() => router.push('/profile-edit')}
                  className="w-10 h-10 rounded-full bg-orange-400 hover:bg-orange-300 flex items-center justify-center text-white font-bold text-sm transition"
                  title="Edit profile"
                >
                  {getInitials(
                    session?.user?.nickname,
                    session?.user?.email
                  )}
                </button>

              </div>

              {/* Logout — below avatar, slightly pushed down, bigger text */}
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="text-orange-200 hover:text-white text-sm font-medium mt-1 transition"
              >
                Logout
              </button>

            </div>
          </div>

          {/* Delivery Badge */}
          <div className="inline-flex items-center gap-2 bg-orange-400 rounded-2xl px-4 py-2">
            <span className="text-white text-xs">📍</span>
            <span className="text-white text-sm font-medium">
              {session?.user?.hostel || 'Set your hostel'}
              {session?.user?.roomNo
                ? ` · Room ${session?.user?.roomNo}`
                : ''}
            </span>
          </div>

        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4">

        {/* ── Active Order Banner ── */}
        {activeOrder && (
          <div
            onClick={() => router.push(`/orders/${activeOrder.id}`)}
            className="mt-4 bg-orange-100 border border-orange-200 rounded-2xl px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-orange-200 transition"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">🛵</span>
              <div>
                <p className="text-orange-800 text-sm font-medium">
                  You have an active order
                </p>
                <p className="text-orange-500 text-xs mt-0.5">
                  Tap to track your delivery
                </p>
              </div>
            </div>
            <span className="text-orange-500 font-bold">→</span>
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div className="mt-4 bg-red-50 text-red-600 px-4 py-3 rounded-2xl text-sm">
            {error}
          </div>
        )}

        {/* ── Menu Label ── */}
        <div className="flex items-center justify-between mt-6 mb-4">
          <h2 className="text-lg font-bold text-gray-800">Menu</h2>
          {/*<p className="text-sm text-gray-400">
            {availableProducts.length} items available
          </p>*/}
        </div> 

        {/* ── Products Grid ── */}
        <div className="grid grid-cols-2 gap-3">
          {sortedProducts.map((product) => {
            const cartItem = cart[product.id]
            const isOutOfStock = !product.available

            return (
              <div
                key={product.id}
                className={`bg-white rounded-2xl overflow-hidden border transition ${
                  isOutOfStock
                    ? 'border-gray-100 opacity-60'
                    : 'border-orange-100'
                }`}
              >
                {/* Product Image */}
                <div className="relative w-full h-50 bg-orange-50">
                  {product.image ? (
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-4xl">🍟</span>
                    </div>
                  )}

                  {/* Out of Stock Overlay */}
                  {isOutOfStock && (
                    <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center">
                      <span className="text-xs font-semibold text-red-500 bg-red-50 px-2 py-1 rounded-full border border-red-100">
                        Out of stock
                      </span>
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-3">
                  <p className={`font-semibold text-sm ${
                    isOutOfStock ? 'text-gray-400' : 'text-gray-800'
                  }`}>
                    {product.name}
                  </p>
                  <p className="text-gray-400 text-xs mt-0.5 leading-relaxed line-clamp-2">
                    {product.description}
                  </p>

                  {/* Price + Controls */}
                  <div className="flex items-center justify-between mt-3">
                    <p className={`font-bold text-sm ${
                      isOutOfStock ? 'text-gray-300' : 'text-orange-500'
                    }`}>
                      Ksh {product.price}
                    </p>

                    {/* Add to Cart */}
                    {!isOutOfStock && (
                      <>
                        {cartItem ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => removeFromCart(product.id)}
                              className="w-7 h-7 rounded-full bg-orange-100 text-orange-600 font-bold flex items-center justify-center hover:bg-orange-200 transition text-base"
                            >
                              −
                            </button>
                            <span className="font-bold text-gray-800 text-sm w-4 text-center">
                              {cartItem.quantity}
                            </span>
                            <button
                              onClick={() => addToCart(product)}
                              className="w-7 h-7 rounded-full bg-orange-500 text-white font-bold flex items-center justify-center hover:bg-orange-600 transition text-base"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addToCart(product)}
                            className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition"
                          >
                            Add
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

      </div>

      {/* ── Floating Cart Button ── */}
      {totalItems > 0 && (
        <div className="fixed bottom-6 left-0 right-0 px-4 z-50">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={() => {
                sessionStorage.setItem('cart', JSON.stringify(cart))
                router.push('/checkout')
              }}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-2xl shadow-lg flex items-center justify-between px-5 py-4 transition"
            >
              {/* Left — Item Count Badge */}
              <span className="bg-orange-600 text-white text-xs font-bold px-2.5 py-1 rounded-xl">
                {totalItems} {totalItems === 1 ? 'item' : 'items'}
              </span>

              {/* Middle — Label */}
              <span className="font-semibold text-base">
                View Order
              </span>

              {/* Right — Total */}
              <span className="font-bold text-base">
                Ksh {totalPrice}
              </span>
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
