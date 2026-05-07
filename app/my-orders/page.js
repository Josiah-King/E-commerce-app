'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

const STATUS_COLORS = {
  PENDING: {
    badge: 'bg-yellow-100 text-yellow-700',
    border: 'bg-yellow-400',
    icon: '⏳',
  },
  PAID: {
    badge: 'bg-blue-100 text-blue-700',
    border: 'bg-blue-400',
    icon: '✅',
  },
  PREPARING: {
    badge: 'bg-purple-100 text-purple-700',
    border: 'bg-purple-500',
    icon: '👨‍🍳',
  },
  OUT_FOR_DELIVERY: {
    badge: 'bg-orange-100 text-orange-700',
    border: 'bg-orange-400',
    icon: '🛵',
  },
  DELIVERED: {
    badge: 'bg-green-100 text-green-700',
    border: 'bg-green-500',
    icon: '📦',
  },
  COMPLETED: {
    badge: 'bg-gray-100 text-gray-600',
    border: 'bg-gray-400',
    icon: '✅',
  },
  CANCELLED: {
    badge: 'bg-red-100 text-red-600',
    border: 'bg-red-500',
    icon: '❌',
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

const PAST_STATUSES = ['COMPLETED', 'CANCELLED']

function getExactTime(date) {
  return new Date(date).toLocaleTimeString('en-KE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

function timeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000)
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return getExactTime(date)
}

function isSameDay(date1, date2) {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  return (
    d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear()
  )
}

function getDayLabel(date) {
  return new Date(date).toLocaleDateString('en-KE', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  })
}

function groupOrdersByDay(orders) {
  const groups = {}
  orders.forEach((order) => {
    const label = getDayLabel(order.createdAt)
    if (!groups[label]) groups[label] = []
    groups[label].push(order)
  })
  return groups
}

function toInputDate(date) {
  const d = new Date(date)
  return d.toISOString().split('T')[0]
}

export default function MyOrdersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Tab state
  const [activeTab, setActiveTab] = useState('ACTIVE')

  // Quick filter
  const [quickFilter, setQuickFilter] = useState('TODAY')

  // Date search
  const [dateMode, setDateMode] = useState('SINGLE')
  const [singleDate, setSingleDate] = useState(toInputDate(new Date()))
  const [startDate, setStartDate] = useState(toInputDate(new Date()))
  const [endDate, setEndDate] = useState(toInputDate(new Date()))
  const [searchedFilter, setSearchedFilter] = useState(null)

  // Redirect if not logged in
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  // Fetch orders
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

  // Active orders
  const activeOrders = orders.filter((o) =>
    ACTIVE_STATUSES.includes(o.status)
  )

  // Past orders filtered
  const pastOrders = orders.filter((o) => {
    if (!PAST_STATUSES.includes(o.status)) return false

    const orderDate = new Date(o.createdAt)
    const today = new Date()

    // If a date search has been applied
    if (searchedFilter) {
      if (searchedFilter.type === 'SINGLE') {
        return isSameDay(orderDate, new Date(searchedFilter.date))
      }
      if (searchedFilter.type === 'RANGE') {
        const start = new Date(searchedFilter.start)
        start.setHours(0, 0, 0, 0)
        const end = new Date(searchedFilter.end)
        end.setHours(23, 59, 59, 999)
        return orderDate >= start && orderDate <= end
      }
    }

    // Quick filter
    if (quickFilter === 'TODAY') {
      return isSameDay(orderDate, today)
    }
    if (quickFilter === 'YESTERDAY') {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      return isSameDay(orderDate, yesterday)
    }
    if (quickFilter === 'LAST_WEEK') {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      weekAgo.setHours(0, 0, 0, 0)
      return orderDate >= weekAgo
    }

    return true
  })

  // Group past orders by day
  const groupedPastOrders = groupOrdersByDay(pastOrders)
  const groupKeys = Object.keys(groupedPastOrders)

  // Apply date search
  function handleSearch() {
    setQuickFilter(null)
    if (dateMode === 'SINGLE') {
      setSearchedFilter({ type: 'SINGLE', date: singleDate })
    } else {
      setSearchedFilter({ type: 'RANGE', start: startDate, end: endDate })
    }
  }

  // Apply quick filter — clear date search
  function handleQuickFilter(key) {
    setSearchedFilter(null)
    setQuickFilter(key)
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-3">🛵</p>
          <p className="text-orange-500 font-medium">
            Loading your orders...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-orange-50">

      {/* ── Header ── */}
      <div className="bg-orange-500 px-4 pt-6 pb-8">
        <div className="max-w-2xl mx-auto">

          {/* Top Row */}
          <div className="flex items-center gap-3 mb-5">
            <button
              onClick={() => router.push('/menu')}
              className="text-orange-200 hover:text-white transition text-sm"
            >
              ←
            </button>
            <h1 className="text-white text-lg font-bold">My Orders</h1>
          </div>

          {/* Tab Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => setActiveTab('ACTIVE')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${
                activeTab === 'ACTIVE'
                  ? 'bg-white text-orange-500'
                  : 'bg-orange-400 text-white hover:bg-orange-300'
              }`}
            >
              🛵 Active Orders
              {activeOrders.length > 0 && (
                <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === 'ACTIVE'
                    ? 'bg-orange-100 text-orange-500'
                    : 'bg-orange-500 text-white'
                }`}>
                  {activeOrders.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('PAST')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${
                activeTab === 'PAST'
                  ? 'bg-white text-orange-500'
                  : 'bg-orange-400 text-white hover:bg-orange-300'
              }`}
            >
              📋 Past Orders
            </button>
          </div>

        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">

        {/* ── Filter Section (Past Orders only) ── */}
        {activeTab === 'PAST' && (
          <div className="bg-white rounded-2xl border border-orange-100 p-4 mb-4 space-y-4">

            {/* Quick Filters */}
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                Quick Filter
              </p>
              <div className="flex gap-2">
                {[
                  { key: 'TODAY', label: 'Today' },
                  { key: 'YESTERDAY', label: 'Yesterday' },
                  { key: 'LAST_WEEK', label: 'Last Week' },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => handleQuickFilter(opt.key)}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium transition ${
                      quickFilter === opt.key && !searchedFilter
                        ? 'bg-orange-500 text-white'
                        : 'bg-orange-50 text-orange-500 border border-orange-100 hover:bg-orange-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-100" />

            {/* Date Search */}
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                Search by Date
              </p>

              {/* Mode Toggle */}
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setDateMode('SINGLE')}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium transition ${
                    dateMode === 'SINGLE'
                      ? 'bg-orange-50 text-orange-500 border border-orange-200'
                      : 'text-gray-400 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  📅 Single Date
                </button>
                <button
                  onClick={() => setDateMode('RANGE')}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium transition ${
                    dateMode === 'RANGE'
                      ? 'bg-orange-50 text-orange-500 border border-orange-200'
                      : 'text-gray-400 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  📅 Date Range
                </button>
              </div>

              {/* Date Inputs */}
              {dateMode === 'SINGLE' ? (
                <input
                  type="date"
                  value={singleDate}
                  onChange={(e) => setSingleDate(e.target.value)}
                  max={toInputDate(new Date())}
                  className="w-full border border-orange-200 rounded-xl px-4 py-2.5 text-sm text-orange-500 bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    max={toInputDate(new Date())}
                    className="flex-1 border border-orange-200 rounded-xl px-3 py-2.5 text-sm text-orange-500 bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-300"
                  />
                  <span className="text-gray-400 font-medium">—</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    max={toInputDate(new Date())}
                    className="flex-1 border border-orange-200 rounded-xl px-3 py-2.5 text-sm text-orange-500 bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-300"
                  />
                </div>
              )}

              {/* Search Button */}
              <button
                onClick={handleSearch}
                className="w-full mt-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 rounded-xl transition text-sm"
              >
                Search
              </button>

              {/* Clear search */}
              {searchedFilter && (
                <button
                  onClick={() => {
                    setSearchedFilter(null)
                    setQuickFilter('TODAY')
                  }}
                  className="w-full mt-2 text-xs text-orange-400 hover:text-orange-600 transition"
                >
                  ✕ Clear search
                </button>
              )}
            </div>

          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm mb-4">
            {error}
          </div>
        )}

        {/* ── ACTIVE ORDERS ── */}
        {activeTab === 'ACTIVE' && (
          <>
            {activeOrders.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl">
                <p className="text-4xl mb-3">🛵</p>
                <p className="text-gray-600 font-medium">No active orders</p>
                <p className="text-gray-400 text-sm mt-1 mb-5">
                  Your active orders will appear here
                </p>
                <button
                  onClick={() => router.push('/menu')}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-2.5 rounded-xl transition text-sm"
                >
                  Order Now 🍟
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {activeOrders.map((order) => {
                  const colors = STATUS_COLORS[order.status]
                  return (
                    <div
                      key={order.id}
                      className="bg-white rounded-2xl overflow-hidden border border-orange-100"
                    >
                      <div className={`h-1 w-full ${colors.border}`} />
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${colors.badge}`}>
                            {colors.icon} {STATUS_LABELS[order.status]}
                          </span>
                          <span className="text-xs text-gray-400">
                            {timeAgo(order.createdAt)}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {order.items.map((item) => (
                            <span
                              key={item.id}
                              className="bg-orange-50 border border-orange-100 text-orange-600 text-xs font-medium px-2.5 py-1 rounded-full"
                            >
                              {item.product.name} x{item.quantity}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-500">
                            🏠 <span className="font-medium text-gray-700">{order.hostel}</span>
                            {' '}· Room{' '}
                            <span className="font-medium text-gray-700">{order.roomNo}</span>
                          </p>
                          <p className="font-bold text-orange-500">
                            Ksh {order.total}
                          </p>
                        </div>
                        <button
                          onClick={() => router.push(`/orders/${order.id}`)}
                          className="mt-3 w-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold py-2.5 rounded-xl transition"
                        >
                          Track Order →
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ── PAST ORDERS ── */}
        {activeTab === 'PAST' && (
          <>
            {groupKeys.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl">
                <p className="text-4xl mb-3">📋</p>
                <p className="text-gray-600 font-medium">No past orders found</p>
                <p className="text-gray-400 text-sm mt-1">
                  Try a different date or filter
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {groupKeys.map((dayLabel) => (
                  <div key={dayLabel}>

                    {/* Day Label */}
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 mt-3">
                      {dayLabel}
                    </p>

                    {/* Orders for this day */}
                    <div className="space-y-3">
                      {groupedPastOrders[dayLabel].map((order) => {
                        const colors = STATUS_COLORS[order.status]
                        return (
                          <div
                            key={order.id}
                            className="bg-white rounded-2xl overflow-hidden border border-orange-100"
                          >
                            <div className={`h-1 w-full ${colors.border}`} />
                            <div className="p-4">
                              <div className="flex items-center justify-between mb-3">
                                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${colors.badge}`}>
                                  {colors.icon} {STATUS_LABELS[order.status]}
                                </span>
                                <span className="text-xs text-gray-400">
                                  {getExactTime(order.createdAt)}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-2 mb-3">
                                {order.items.map((item) => (
                                  <span
                                    key={item.id}
                                    className="bg-orange-50 border border-orange-100 text-orange-600 text-xs font-medium px-2.5 py-1 rounded-full"
                                  >
                                    {item.product.name} x{item.quantity}
                                  </span>
                                ))}
                              </div>
                              <div className="flex items-center justify-between">
                                <p className="text-xs text-gray-500">
                                  🏠 <span className="font-medium text-gray-700">{order.hostel}</span>
                                  {' '}· Room{' '}
                                  <span className="font-medium text-gray-700">{order.roomNo}</span>
                                </p>
                                <p className="font-bold text-orange-500">
                                  Ksh {order.total}
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

      </div>
    </div>
  )
}
