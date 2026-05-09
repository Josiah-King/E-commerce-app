'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import OwnerNav from '../components/OwnerNav'

const NEXT_STATUS = {
  PENDING: { label: '✅ Accept Order', next: 'PREPARING' },
  PAID: { label: '✅ Accept Order', next: 'PREPARING' },
  PREPARING: { label: '🛵 Send Out for Delivery', next: 'OUT_FOR_DELIVERY' },
  OUT_FOR_DELIVERY: { label: '🎉 Mark as Completed', next: 'COMPLETED' },
  DELIVERED: { label: '🎉 Mark as Completed', next: 'COMPLETED' },
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
  PENDING: 'Order Placed',
  PAID: 'Order Placed',
  PREPARING: 'Received',
  OUT_FOR_DELIVERY: 'On Delivery',
  DELIVERED: 'Completed',
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

function playNotificationSound() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()

    // Create a pleasant two tone notification sound
    const frequencies = [523, 659]
    frequencies.forEach((freq, index) => {
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.value = freq
      oscillator.type = 'sine'

      const startTime = audioContext.currentTime + index * 0.15
      gainNode.gain.setValueAtTime(0, startTime)
      gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.05)
      gainNode.gain.linearRampToValueAtTime(0, startTime + 0.3)

      oscillator.start(startTime)
      oscillator.stop(startTime + 0.3)
    })
  } catch (error) {
    console.log('Audio not supported')
  }
}

function timeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000)
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return new Date(date).toLocaleTimeString('en-KE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

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

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    if (status === 'authenticated' && session?.user?.role !== 'OWNER') {
      router.push('/menu')
    }
  }, [status, session, router])

  async function fetchOrders(isAutoRefresh = false) {
    try {
      const response = await fetch('/api/orders')
      const data = await response.json()
      if (!response.ok) {
        setError('Failed to load orders')
        return
      }
      if (isAutoRefresh && data.orders.length > prevOrderCount) {
        setNewOrderAlert(true)
        playNotificationSound()
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

  useEffect(() => {
    if (status !== 'authenticated') return
    if (session?.user?.role !== 'OWNER') return
    const interval = setInterval(() => {
      fetchOrders(true)
    }, 15000)
    return () => clearInterval(interval)
  }, [status, session, prevOrderCount])

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

  // Register service worker and request push permission
  useEffect(() => {
    if (status !== 'authenticated') return
    if (session?.user?.role !== 'OWNER') return

    async function registerPush() {
      try {
        // Register service worker
        if (!('serviceWorker' in navigator)) return
        if (!('PushManager' in window)) return

        const registration = await navigator.serviceWorker.register('/sw.js')
        console.log('Service worker registered')

        // Request notification permission
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          console.log('Notification permission denied')
          return
        }

        // Subscribe to push notifications
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
          ),
        })

        // Send subscription to server
        await fetch('/api/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription }),
        })

        console.log('Push notifications enabled')
      } catch (error) {
        console.error('Push registration error:', error)
      }
    }

    function urlBase64ToUint8Array(base64String) {
      if (!base64String) return new Uint8Array()
      const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
      const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/')
      const rawData = window.atob(base64)
      const outputArray = new Uint8Array(rawData.length)
      for (let i = 0; i < rawData.length; i++) {
        outputArray[i] = rawData.charCodeAt(i)
      }
      return outputArray
    }

    registerPush()
  }, [status, session])

  const activeOrders = orders.filter((o) =>
    ACTIVE_STATUSES.includes(o.status)
  ).length

  const todayOrders = orders.filter((o) => isToday(o.createdAt)).length

  const todayRevenue = orders
    .filter((o) => isToday(o.createdAt) && o.status !== 'CANCELLED')
    .reduce((sum, o) => sum + o.total, 0)

  const filteredOrders = orders.filter((order) => {
    const orderDate = new Date(order.createdAt)
    const today = new Date()
    const isTodayOrder =
      orderDate.getDate() === today.getDate() &&
      orderDate.getMonth() === today.getMonth() &&
      orderDate.getFullYear() === today.getFullYear()
    if (!isTodayOrder) return false
    if (activeFilter === 'ALL') return true
    if (activeFilter === 'ACTIVE') return ACTIVE_STATUSES.includes(order.status)
    if (activeFilter === 'COMPLETED') return order.status === 'COMPLETED'
    if (activeFilter === 'CANCELLED') return order.status === 'CANCELLED'
    return true
  })

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center">
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
    <div className="min-h-screen bg-gray-50">
      <OwnerNav />

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-4">

        {/* ── New Order Alert ── */}
        {newOrderAlert && (
          <div className="bg-green-500 text-white px-4 py-3 rounded-2xl shadow flex items-center gap-3">
            <span className="text-xl">🔔</span>
            <p className="font-semibold text-sm">New order received!</p>
          </div>
        )}

        {/* ── Stats Bar ── */}
        <div className="bg-orange-500 rounded-2xl p-4 text-white">
          <div className="flex items-center justify-between mb-1">
            <p className="text-orange-100 text-sm">Today's Overview</p>
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  const permission = await Notification.requestPermission()
                  if (permission === 'granted') {
                    alert('🔔 Notifications enabled!')
                  }
                }}
                className="text-orange-200 hover:text-white text-xs font-medium transition"
                title="Enable notifications"
              >
                🔔
              </button>
              <button
                onClick={() => fetchOrders()}
                className="text-orange-200 hover:text-white text-xs font-medium transition"
              >
                ↻ Refresh
              </button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-3">
            <div className="bg-orange-400 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold">{activeOrders}</p>
              <p className="text-orange-100 text-xs mt-1">Active</p>
            </div>
            <div className="bg-orange-400 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold">{todayOrders}</p>
              <p className="text-orange-100 text-xs mt-1">Today</p>
            </div>
            <div className="bg-orange-400 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold">{todayRevenue}</p>
              <p className="text-orange-100 text-xs mt-1">Ksh Today</p>
            </div>
          </div>
        </div>

        {/* ── Filter Tabs ── */}
        <div className="bg-white rounded-2xl p-1.5 flex gap-1 shadow-sm">
          {FILTERS.map((filter) => (
            <button
              key={filter.key}
              onClick={() => setActiveFilter(filter.key)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition ${
                activeFilter === filter.key
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {filter.label}
              {filter.key === 'ACTIVE' && activeOrders > 0 && (
                <span className={`ml-1 text-xs px-1 py-0.5 rounded-full ${
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
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-2xl text-sm">
            {error}
          </div>
        )}

        {/* Empty State */}
        {filteredOrders.length === 0 && !error && (
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
            <p className="text-5xl mb-4">📭</p>
            <p className="text-gray-600 font-semibold">No orders here</p>
            <p className="text-gray-400 text-sm mt-1">
              {activeFilter === 'ALL'
                ? 'Orders will appear here when students place them'
                : `No ${activeFilter.toLowerCase()} orders today`}
            </p>
          </div>
        )}

        {/* ── Orders List ── */}
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const nextAction = NEXT_STATUS[order.status]
            const isUpdating = updatingId === order.id
            const colors = STATUS_COLORS[order.status]

            return (
              <div
                key={order.id}
                className={`bg-white rounded-2xl shadow-sm border-l-4 ${colors.border} overflow-hidden`}
              >
                <div className="p-4">

                  {/* Order Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-gray-800">
                          @{order.user?.nickname || order.user?.email}
                        </p>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors.badge}`}>
                          {STATUS_LABELS[order.status]}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {timeAgo(order.createdAt)}
                      </p>
                    </div>
                    <p className="text-xl font-bold text-orange-500 ml-2">
                      Ksh {order.total}
                    </p>
                  </div>

                  {/* Delivery Info */}
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mb-3">
                    <p className="text-xs text-gray-600">
                      🏠 <span className="font-medium">{order.hostel}</span>
                    </p>
                    <p className="text-xs text-gray-600">
                      🚪 Room <span className="font-medium">{order.roomNo}</span>
                    </p>
                    <p className="text-xs text-gray-600">
                      📞 <span className="font-medium">{order.phone}</span>
                    </p>
                  </div>

                  {/* Order Items */}
                  <div className="bg-orange-50 rounded-xl p-3 mb-3 space-y-1.5">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className="bg-orange-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-lg">
                            x{item.quantity}
                          </span>
                          <span className="text-sm text-gray-700">
                            {item.product.name}
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-gray-800">
                          Ksh {item.price * item.quantity}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  {nextAction && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateStatus(order.id, nextAction.next)}
                        disabled={isUpdating}
                        className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-50 text-sm"
                      >
                        {isUpdating ? '⏳ Updating...' : nextAction.label}
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Cancel this order?')) {
                            updateStatus(order.id, 'CANCELLED')
                          }
                        }}
                        disabled={isUpdating}
                        className="px-4 py-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 font-semibold text-sm transition disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {/* Completed or Cancelled */}
                  {!nextAction && (
                    <div className="text-center py-2 bg-gray-50 rounded-xl">
                      <span className="text-gray-400 text-sm font-medium">
                        {order.status === 'COMPLETED'
                          ? '✅ Order completed'
                          : '❌ Order cancelled'}
                      </span>
                    </div>
                  )}

                </div>
              </div>
            )
          })}
        </div>

      </main>
    </div>
  )
}
