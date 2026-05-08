'use client'

import { useRouter, usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'

export default function OwnerNav() {
  const router = useRouter()
  const pathname = usePathname()

  const tabs = [
    { label: '📋 Orders', href: '/dashboard' },
    { label: '🍟 Products', href: '/products' },
    { label: '📊 Analytics', href: '/analytics' },
  ]

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">

        {/* Logo */}
        <div className="flex items-center gap-2">
          <span className="text-xl">🍟</span>
          <div>
            <h1 className="text-sm font-bold text-gray-800 leading-tight">
              Fries App
            </h1>
            <p className="text-xs text-gray-400 leading-tight">
              Owner Panel
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.href}
              onClick={() => router.push(tab.href)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                pathname === tab.href
                  ? 'bg-white text-orange-500 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Logout */}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="text-xs bg-red-50 text-red-500 hover:bg-red-100 font-medium px-2.5 py-1.5 rounded-lg transition"
        >
          Logout
        </button>

      </div>
    </header>
  )
}
