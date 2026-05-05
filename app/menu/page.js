'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function MenuPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // Stores all products fetched from database
  const [products, setProducts] = useState([])

  // Stores the cart — an object where keys are product IDs
  // Example: { 'abc123': { product: {...}, quantity: 2 } }
  const [cart, setCart] = useState({})

  // Loading and error states
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Redirect to login if not logged in
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  // Fetch products when page loads
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

  // Add a product to the cart
  function addToCart(product) {
    setCart((prevCart) => {
      const existing = prevCart[product.id]
      return {
        ...prevCart,
        [product.id]: {
          product,
          quantity: existing ? existing.quantity + 1 : 1,
        },
      }
    })
  }

  // Remove one unit of a product from the cart
  function removeFromCart(productId) {
    setCart((prevCart) => {
      const existing = prevCart[productId]
      if (!existing) return prevCart

      if (existing.quantity === 1) {
        // Remove the item completely
        const newCart = { ...prevCart }
        delete newCart[productId]
        return newCart
      }

      return {
        ...prevCart,
        [productId]: {
          ...existing,
          quantity: existing.quantity - 1,
        },
      }
    })
  }

  // Calculate total number of items in cart
  const totalItems = Object.values(cart).reduce(
    (sum, item) => sum + item.quantity,
    0
  )

  // Calculate total price
  const totalPrice = Object.values(cart).reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  )

  // Show loading screen while session or products load
  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center">
        <p className="text-orange-500 text-lg font-medium">Loading menu...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-orange-50">

      {/* ── Header ── */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-orange-500">🍟 Fries App</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              Hey, <span className="font-medium text-gray-700">
                {session?.user?.nickname || session?.user?.email}
              </span>
            </span>
            <button
              onClick={() => router.push('/my-orders')}
              className="text-sm text-orange-500 hover:text-orange-600 font-medium transition"
            >
              My Orders
            </button>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-sm text-red-400 hover:text-red-600 transition"
            >
              Logout
            </button>
          </div>  
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="max-w-2xl mx-auto px-4 py-6">

        {/* Welcome Message */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800">What are you craving? 😋</h2>
          <p className="text-gray-500 text-sm mt-1">
            Delivering to {session?.user?.hostel}, Room {session?.user?.roomNo}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        {/* ── Products Grid ── */}
        <div className="grid grid-cols-1 gap-4">
          {products.map((product) => {
            const cartItem = cart[product.id]
            return (
              <div
                key={product.id}
                className="bg-white rounded-2xl shadow-sm p-4 flex items-center justify-between"
              >
                {/* Product Info */}
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800">{product.name}</h3>
                  <p className="text-gray-400 text-sm mt-0.5">{product.description}</p>
                  <p className="text-orange-500 font-bold mt-2">
                    Ksh {product.price}
                  </p>
                </div>

                {/* Add to Cart Controls */}
                <div className="flex items-center gap-3 ml-4">
                  {cartItem ? (
                    <>
                      {/* Decrease quantity button */}
                      <button
                        onClick={() => removeFromCart(product.id)}
                        className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 font-bold text-lg flex items-center justify-center hover:bg-orange-200 transition"
                      >
                        −
                      </button>

                      {/* Current quantity */}
                      <span className="font-bold text-gray-800 w-4 text-center">
                        {cartItem.quantity}
                      </span>

                      {/* Increase quantity button */}
                      <button
                        onClick={() => addToCart(product)}
                        className="w-8 h-8 rounded-full bg-orange-500 text-white font-bold text-lg flex items-center justify-center hover:bg-orange-600 transition"
                      >
                        +
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => addToCart(product)}
                      className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-full transition"
                    >
                      Add
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

      </main>

      {/* ── Floating Cart Button ── */}
      {totalItems > 0 && (
        <div className="fixed bottom-6 left-0 right-0 px-4">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={() => {
                // Save cart to sessionStorage before navigating
                sessionStorage.setItem('cart', JSON.stringify(cart))
                router.push('/checkout')
              }}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-4 rounded-2xl shadow-lg flex items-center justify-between px-6 transition"
            >
              <span className="bg-orange-600 text-white text-sm font-bold px-2 py-1 rounded-lg">
                {totalItems} {totalItems === 1 ? 'item' : 'items'}
              </span>
              <span>View Order</span>
              <span>Ksh {totalPrice}</span>
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
