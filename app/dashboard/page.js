'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import OwnerNav from '../components/OwnerNav'

const NEXT_STATUS = {
  PENDING: { label: 'Confirm Payment', next: 'PAID' },
  PAID: { label: 'Start Preparing', next: 'PREPARING' },
  PREPARING: { label: 'Out for Delivery', next: 'OUT_FOR_DELIVERY' },
  OUT_FOR_DELIVERY: { label: 'Mark Delivered', next: 'DELIVERED' },
  DELIVERED: { label: 'Mark Completed', next: 'COMPLETED' },
  COMPLETED: null,
  CANCELLED: null,
}

const STATUS_COLORS = {
  PENDING: {
    badge: 'bg-yellow-100 text-yellow-700',
    border: 'border-l-yellow-400',
  },
  PAID: {
    badge: 'bg-blue-100 text-blue-700',
    border: 'border-l-blue-400',
  },
  PREPARING: {
    badge: 'bg-purple-100 text-purple-700',
    border: 'border-l-purple-400',
  },
  OUT_FOR_DELIVERY: {
    badge: 'bg-orange-100 text-orange-700',
    border: 'border-l-orange-400',
  },
  DELIVERED: {
    badge: 'bg-green-100 text-green-700',
    border: 'border-l-green-400',
  },
  COMPLETED: {
    badge: 'bg-gray-100 text-gray-500',
    border: 'border-l-gray-300',
  },
  CANCELLED: {
    badge: 'bg-red-100 text-red-600',
    border: 'border-l-red-400',
  },
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

const ACTIVE_STATUSES = [
  'PENDING',
  'PAID',
  'PREPARING',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
]

const FILTERS = [
  { key: 'ACTIVE', label: 'Active' },
  { key: 'ALL', label: 'All Orders' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'CANCELLED', label: 'Cancelled' },
]

// Helper — how long ago was the order placed
function timeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000)
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

// Helper — check if order was placed today
function isToday(date) {
  const today = new Date()
  const orderDate = new Date(date)
  return (
    orderDate.getDate() === today.getDate() &&
    orderDate.getMonth() === today.getMonth() &&
    orderDate.getFullYear() === today.getFullYear()
  )
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatingId, setUpdatingId] = useState(null)
  const [activeFilter, setActiveFilter] = useState('ACTIVE')
  const [newOrderAlert, setNewOrderAlert] = useState(false)
  const [prevOrderCount, setPrevOrderCount] = useState(0)

  // Redirect if not owner
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    if (status === 'authenticated' && session?.user?.role !== 'OWNER') {
      router.push('/menu')
    }
  }, [status, session, router])

  // Fetch all orders
  async function fetchOrders(isAutoRefresh = false) {
    try {
      const response = await fetch('/api/orders')
      const data = await response.json()

      if (!response.ok) {
        setError('Failed to load orders')
        return
      }

      // Check if new orders came in during auto refresh
      if (isAutoRefresh && data.orders.length > prevOrderCount) {
        setNewOrderAlert(true)
        setTimeout(() => setNewOrderAlert(false), 5000)
      }

      setPrevOrderCount(data.orders.length)
      setOrders(data.orders)
    } catch (error) {
      setError('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status !== 'authenticated') return
    if (session?.user?.role !== 'OWNER') return
    fetchOrders()
  }, [status, session])

  // Auto refresh every 15 seconds
  useEffect(() => {
    if (status !== 'authenticated') return
    if (session?.user?.role !== 'OWNER') return

    const interval = setInterval(() => {
      fetchOrders(true)
    }, 15000)

    return () => clearInterval(interval)
  }, [status, session, prevOrderCount])

  // Update order status
  async function updateStatus(orderId, newStatus) {
    setUpdatingId(orderId)

    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        alert('Failed to update status. Please try again.')
        return
      }

      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      )
    } catch (error) {
      alert('Failed to update status. Please try again.')
    } finally {
      setUpdatingId(null)
    }
  }

  // ── Stats calculations ──
  const activeOrders = orders.filter((o) =>
    ACTIVE_STATUSES.includes(o.status)
  ).length

  const todayOrders = orders.filter((o) => isToday(o.createdAt)).length

  const todayRevenue = orders
    .filter((o) => isToday(o.createdAt) && o.status !== 'CANCELLED')
    .reduce((sum, o) => sum + o.total, 0)

  // ── Filter orders ──
  const filteredOrders = orders.filter((order) => {
  // Only show today's orders
    const orderDate = new Date(order.createdAt)
    const today = new Date()
    const isToday =
      orderDate.getDate() === today.getDate() &&
      orderDate.getMonth() === today.getMonth() &&
      orderDate.getFullYear() === today.getFullYear()

    if (!isToday) return false

    // Then apply status filter
    if (activeFilter === 'ALL') return true
    if (activeFilter === 'ACTIVE') return ACTIVE_STATUSES.includes(order.status)
    if (activeFilter === 'COMPLETED') return order.status === 'COMPLETED'
    if (activeFilter === 'CANCELLED') return order.status === 'CANCELLED'
    return true
  })

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-3">🍟</p>
          <p className="text-orange-500 text-lg font-medium">
            Loading dashboard...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">

      {/* ── Header ── */}
      <OwnerNav />

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="flex justify-end">
          <button
            onClick={() => fetchOrders()}
            className="flex items-center gap-1 text-sm bg-orange-50 text-orange-500 hover:bg-orange-100 font-medium px-3 py-2 rounded-lg transition"
          >
            ↻ Refresh Orders
          </button>
        </div>

        {/* ── New Order Alert ── */}
        {newOrderAlert && (
          <div className="bg-green-500 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-pulse">
            <span className="text-xl">🔔</span>
            <p className="font-semibold">New order received!</p>
          </div>
        )}

        {/* ── Stats Bar ── */}
        <div className="grid grid-cols-3 gap-4">

          {/* Active Orders */}
          <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-4 border-l-4 border-l-orange-400">
            <div className="bg-orange-100 p-3 rounded-xl">
              <span className="text-2xl">📋</span>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-800">{activeOrders}</p>
              <p className="text-sm text-gray-500">Active Orders</p>
            </div>
          </div>

          {/* Today's Orders */}
          <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-4 border-l-4 border-l-blue-400">
            <div className="bg-blue-100 p-3 rounded-xl">
              <span className="text-2xl">🛒</span>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-800">{todayOrders}</p>
              <p className="text-sm text-gray-500">Today's Orders</p>
            </div>
          </div>

          {/* Today's Revenue */}
          <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-4 border-l-4 border-l-green-400">
            <div className="bg-green-100 p-3 rounded-xl">
              <span className="text-2xl">💰</span>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-800">
                {todayRevenue}
              </p>
              <p className="text-sm text-gray-500">Today's Revenue (Ksh)</p>
            </div>
          </div>

        </div>

        {/* ── Filter Tabs ── */}
        <div className="bg-white rounded-2xl shadow-sm p-2 flex gap-2">
          {FILTERS.map((filter) => (
            <button
              key={filter.key}
              onClick={() => setActiveFilter(filter.key)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition ${
                activeFilter === filter.key
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {filter.label}
              {filter.key === 'ACTIVE' && activeOrders > 0 && (
                <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                  activeFilter === filter.key
                    ? 'bg-orange-600 text-white'
                    : 'bg-orange-100 text-orange-600'
                }`}>
                  {activeOrders}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Empty State */}
        {filteredOrders.length === 0 && !error && (
          <div className="text-center py-20 bg-white rounded-2xl shadow-sm">
            <p className="text-5xl mb-4">📭</p>
            <p className="text-gray-500 text-lg font-medium">
              No orders today
            </p>
            <p className="text-gray-400 text-sm mt-1">
              {activeFilter === 'ALL'
                ? 'Orders will appear here when students place them'
                : `No ${activeFilter.toLowerCase()} orders yet`}
            </p>
          </div>
        )}

        {/* ── Orders List ── */}
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const nextAction = NEXT_STATUS[order.status]
            const isUpdating = updatingId === order.id
            const colors = STATUS_COLORS[order.status]

            return (
              <div
                key={order.id}
                className={`bg-white rounded-2xl shadow-sm border-l-4 ${colors.border} overflow-hidden`}
              >

                {/* ── Order Top Section ── */}
                <div className="p-5">
                  <div className="flex items-start justify-between">

                    {/* Left — Customer Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-gray-800 text-lg">
                          @{order.user?.nickname || order.user?.email}
                        </p>
                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full ${colors.badge}`}
                        >
                          {STATUS_LABELS[order.status]}
                        </span>
                        <span className="text-xs text-gray-400">
                          {timeAgo(order.createdAt)}
                        </span>
                      </div>

                      {/* Delivery Details */}
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          🏠 <span className="font-medium">{order.hostel}</span>
                        </p>
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          🚪 Room <span className="font-medium">{order.roomNo}</span>
                        </p>
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          📞 <span className="font-medium">{order.phone}</span>
                        </p>
                      </div>
                    </div>

                    {/* Right — Total */}
                    <div className="text-right ml-4">
                      <p className="text-2xl font-bold text-orange-500">
                        Ksh {order.total}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {order.items.length}{' '}
                        {order.items.length === 1 ? 'item' : 'items'}
                      </p>
                    </div>

                  </div>

                  {/* ── Order Items ── */}
                  <div className="mt-4 bg-gray-50 rounded-xl p-3 space-y-2">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className="bg-orange-100 text-orange-600 text-xs font-bold px-2 py-0.5 rounded-lg">
                            x{item.quantity}
                          </span>
                          <span className="text-sm font-medium text-gray-700">
                            {item.product.name}
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-gray-800">
                          Ksh {item.price * item.quantity}
                        </span>
                      </div>
                    ))}
                  </div>

                </div>

                {/* Action Button */}
                  {nextAction && (
                    <div className="px-5 pb-5 flex gap-10">
                      <button
                        onClick={() => updateStatus(order.id, nextAction.next)}
                        disabled={isUpdating}
                        className="flex-1 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isUpdating ? (
                          <>
                            <span className="animate-spin">⏳</span>
                            Updating...
                          </>
                        ) : (
                          nextAction.label
                        )}
                      </button>

                      {/* Cancel Button */}
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to cancel this order?')) {
                            updateStatus(order.id, 'CANCELLED')
                          }
                        }}
                        disabled={isUpdating}
                        className="px-10 py-3 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 font-semibold text-sm transition disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                {/* Completed or Cancelled */}
                {!nextAction && (
                  <div className="px-5 pb-5">
                    <div className="text-center py-2 bg-gray-50 rounded-xl">
                      <span className="text-gray-400 text-sm font-medium">
                        {order.status === 'COMPLETED'
                          ? '✅ Order completed'
                          : '❌ Order cancelled'}
                      </span>
                    </div>
                  </div>
                )}

              </div>
            )
          })}
        </div>

      </main>
    </div>
  )
}
