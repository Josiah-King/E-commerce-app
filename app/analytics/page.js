'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import OwnerNav from '../components/OwnerNav'

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

function getDateLabel(date) {
  const orderDate = new Date(date)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  const isSameDay = (a, b) =>
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()

  if (isSameDay(orderDate, today)) return 'Today'
  if (isSameDay(orderDate, yesterday)) return 'Yesterday'

  return orderDate.toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function getTimeLabel(date) {
  const orderDate = new Date(date)
  const seconds = Math.floor((new Date() - orderDate) / 1000)
  const hours = seconds / 3600

  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`

  // If less than 24 hours show "Xh ago"
  if (hours < 24) return `${Math.floor(hours)}h ago`

  // If 24 hours or more show exact time
  return orderDate.toLocaleTimeString('en-KE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

const DATE_FILTERS = [
  { key: 'TODAY', label: 'Today' },
  { key: 'WEEK', label: 'This week' },
  { key: 'MONTH', label: 'This month' },
  { key: 'ALL', label: 'All time' },
]

const STATUS_FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'CANCELLED', label: 'Cancelled' },
  { key: 'ACTIVE', label: 'Active' },
]

const ACTIVE_STATUSES = [
  'PENDING',
  'PAID',
  'PREPARING',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
]

export default function AnalyticsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const chartRef = useRef(null)
  const chartInstance = useRef(null)

  const [orders, setOrders] = useState([])
  const [last7Days, setLast7Days] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dateFilter, setDateFilter] = useState('TODAY')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [searchBy, setSearchBy] = useState('nickname')
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)

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

  // Fetch analytics data
  useEffect(() => {
    if (status !== 'authenticated') return
    if (session?.user?.role !== 'OWNER') return

    async function fetchAnalytics() {
      try {
        const response = await fetch('/api/analytics')
        const data = await response.json()

        if (!response.ok) {
          setError('Failed to load analytics')
          return
        }

        setOrders(data.orders)
        setLast7Days(data.last7Days)
      } catch (error) {
        setError('Failed to load analytics')
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [status, session])

  // Build bar chart once data loads
  useEffect(() => {
    if (last7Days.length === 0) return
    if (!chartRef.current) return

    // Dynamically load Chart.js
    const script = document.createElement('script')
    script.src =
      'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js'
    script.onload = () => {
      if (chartInstance.current) {
        chartInstance.current.destroy()
      }

      const isDark = window.matchMedia(
        '(prefers-color-scheme: dark)'
      ).matches
      const gridColor = isDark
        ? 'rgba(255,255,255,0.07)'
        : 'rgba(0,0,0,0.06)'
      const labelColor = '#888780'

      chartInstance.current = new window.Chart(chartRef.current, {
        type: 'bar',
        data: {
            labels: last7Days.map((d) => d.label),
            datasets: [
                {
                    label: 'Revenue (Ksh)',
                    data: last7Days.map((d) => d.revenue),
                    backgroundColor: '#f97316',
                    borderRadius: 8,
                    borderSkipped: false,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) =>
                            'Ksh ' + ctx.parsed.y.toLocaleString(),
                    },
                },
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        color: labelColor,
                        font: { size: 12 },
                    },
                    border: { display: false },
                },
                y: {
                    min: 0,
                    max: 500,
                    grid: { color: gridColor },
                    ticks: {
                        color: labelColor,
                        font: { size: 12 },
                        stepSize: 25,
                        callback: (v) => 'Ksh ' + v,
                    },
                    border: { display: false },
                },
            },
        },
      })
    }
    document.head.appendChild(script)

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy()
      }
    }
  }, [last7Days])

  useEffect(() => {
    function handleClickOutside(e) {
      if (!e.target.closest('.search-dropdown-wrapper')) {
        setShowSearchDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filter orders
  const filteredOrders = orders.filter((order) => {
    // Date filter
    if (dateFilter !== 'ALL') {
      const orderDate = new Date(order.createdAt)
      const now = new Date()

      if (dateFilter === 'TODAY') {
        const isToday =
          orderDate.getDate() === now.getDate() &&
          orderDate.getMonth() === now.getMonth() &&
          orderDate.getFullYear() === now.getFullYear()
        if (!isToday) return false
      }

      if (dateFilter === 'WEEK') {
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        if (orderDate < weekAgo) return false
      }

      if (dateFilter === 'MONTH') {
        const monthAgo = new Date()
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        if (orderDate < monthAgo) return false
      }
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'ACTIVE') {
        if (!ACTIVE_STATUSES.includes(order.status)) return false
      } else {
        if (order.status !== statusFilter) return false
      }
    }

    // Search filter
    // Search filter
    if (search) {
        if (searchBy === 'nickname') {
            const nickname = order.user?.nickname || order.user?.email || ''
            if (!nickname.toLowerCase().includes(search.toLowerCase())) {
                return false
            }
        }

        if (searchBy === 'item') {
            const itemNames = order.items
                .map((item) => item.product.name.toLowerCase())
                .join(' ')
            if (!itemNames.includes(search.toLowerCase())) {
                return false
            }
        }
    }

    return true
  })

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-3">📊</p>
          <p className="text-orange-500 text-lg font-medium">
            Loading analytics...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <OwnerNav />

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* Error */}
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* ── Bar Chart ── */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-bold text-gray-800 text-lg">
                Revenue — last 7 days
              </h2>
              <p className="text-gray-400 text-sm mt-0.5">
                Total earnings per day (Ksh)
              </p>
            </div>
          </div>
          <div style={{ position: 'relative', height: '260px' }}>
            <canvas
              ref={chartRef}
              role="img"
              aria-label="Bar chart showing revenue for the last 7 days"
            >
              Revenue data for last 7 days.
            </canvas>
          </div>
        </div>

        {/* ── Order History ── */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-bold text-gray-800 text-lg">
                Order history
              </h2>
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap gap-2 mb-5">

            {/* Date Filters */}
            <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
              {DATE_FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setDateFilter(f.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    dateFilter === f.key
                      ? 'bg-white text-orange-500 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className="w-px bg-gray-200 self-stretch" />

            {/* Status Filters */}
            <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setStatusFilter(f.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    statusFilter === f.key
                      ? 'bg-white text-orange-500 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="ml-auto relative search-dropdown-wrapper">
              <div className="flex items-center border border-gray-300 rounded-xl bg-white overflow-hidden focus-within:ring-2 focus-within:ring-orange-300">

                {/* Search Type Dropdown Trigger */}
                <button
                  onClick={() => setShowSearchDropdown((prev) => !prev)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 border-r border-gray-200 text-xs text-gray-600 hover:bg-gray-100 transition whitespace-nowrap"
                >
                  {searchBy === 'nickname' ? '👤 Nickname' : '🍟 Item'}
                  <span className="text-gray-400 text-xs">▾</span>
                </button>

                {/* Search Input */}
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={
                    searchBy === 'nickname'
                      ? 'Search nickname...'
                      : 'Search item...'
                  }
                  className="px-3 py-1.5 text-xs text-gray-800 placeholder-gray-400 bg-white focus:outline-none w-36"
                />

              </div>

              {/* Dropdown Menu */}
              {showSearchDropdown && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 overflow-hidden w-40">
                  <button
                    onClick={() => {
                      setSearchBy('nickname')
                      setSearch('')
                      setShowSearchDropdown(false)
                    }}
                    className={`w-full text-left px-4 py-2.5 text-xs transition flex items-center gap-2 ${
                      searchBy === 'nickname'
                        ? 'bg-orange-50 text-orange-500 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    👤 Search by Nickname
                    {searchBy === 'nickname' && (
                      <span className="ml-auto text-orange-400">✓</span>
                    )}
                  </button>
                  <div className="border-t border-gray-100" />
                  <button
                    onClick={() => {
                      setSearchBy('item')
                      setSearch('')
                      setShowSearchDropdown(false)
                    }}
                    className={`w-full text-left px-4 py-2.5 text-xs transition flex items-center gap-2 ${
                      searchBy === 'item'
                        ? 'bg-orange-50 text-orange-500 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    🍟 Search by Item
                    {searchBy === 'item' && (
                      <span className="ml-auto text-orange-400">✓</span>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Empty State */}
          {filteredOrders.length === 0 && (
            <div className="text-center py-12">
              <p className="text-3xl mb-3">📭</p>
              <p className="text-gray-400 text-sm">
                No orders match your filters
              </p>
            </div>
          )}

          {/* Table */}
          {filteredOrders.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-3 text-xs font-medium text-gray-400">
                      Student
                    </th>
                    <th className="text-left py-3 px-3 text-xs font-medium text-gray-400">
                      Items
                    </th>
                    <th className="text-left py-3 px-3 text-xs font-medium text-gray-400">
                      Total
                    </th>
                    <th className="text-left py-3 px-3 text-xs font-medium text-gray-400">
                      Delivery
                    </th>
                    <th className="text-left py-3 px-3 text-xs font-medium text-gray-400">
                      Status
                    </th>
                    <th className="text-left py-3 px-3 text-xs font-medium text-gray-400">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-gray-50 hover:bg-gray-50 transition"
                    >
                      {/* Student */}
                      <td className="py-3 px-3">
                        <p className="font-medium text-gray-800">
                          @{order.user?.nickname || order.user?.email}
                        </p>
                      </td>

                      {/* Items */}
                      <td className="py-3 px-3">
                        <p className="text-gray-600 text-xs leading-relaxed">
                          {order.items
                            .map(
                              (item) =>
                                `${item.product.name} x${item.quantity}`
                            )
                            .join(', ')}
                        </p>
                      </td>

                      {/* Total */}
                      <td className="py-3 px-3">
                        <p className="font-semibold text-orange-500">
                          Ksh {order.total}
                        </p>
                      </td>

                      {/* Delivery */}
                      <td className="py-3 px-3">
                        <p className="text-gray-700 text-xs">
                          {order.hostel}
                        </p>
                        <p className="text-gray-400 text-xs">
                          Room {order.roomNo}
                        </p>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <span
                          className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[order.status]}`}
                        >
                          {STATUS_LABELS[order.status]}
                        </span>
                      </td>

                      {/* Time */}
                      <td className="py-3 px-3">
                        <p className="text-gray-700 text-xs font-medium">
                            {getDateLabel(order.createdAt)}
                        </p>
                        <p className="text-gray-400 text-xs mt-0.5">
                            {getTimeLabel(order.createdAt)}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>
    </div>
  )
}
