'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

export default function ProfileSetupPage() {
  const router = useRouter()
  const { data: session, update } = useSession()

  // These store what the user types
  const [nickname, setNickname] = useState('')
  const [hostel, setHostel] = useState('')
  const [roomNo, setRoomNo] = useState('')

  // These store the state of the form
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, hostel, roomNo }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error)
        setLoading(false)
        return
      }

      // Update the session with the new profile info
      await update({
        ...session,
        user: {
          ...session?.user,
          nickname,
          hostel,
          roomNo,
        },
      })

      // Redirect to menu page
      router.push('/menu')

    } catch (error) {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-orange-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-orange-500">🍟 Fries App</h1>
          <p className="text-gray-700 font-medium mt-2">Set up your profile</p>
          <p className="text-gray-400 text-sm mt-1">
            Just a few details so we can deliver to you
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        {/* Profile Setup Form */}
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Nickname Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nickname
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="e.g. ChapatiKing"
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <p className="text-xs text-gray-400 mt-1">
              3-15 characters. Letters, numbers and underscores only.
              This is what appears on your orders.
            </p>
          </div>

          {/* Hostel Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hostel Name
            </label>
            <input
              type="text"
              value={hostel}
              onChange={(e) => setHostel(e.target.value)}
              placeholder="e.g. Block A Hostel"
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          {/* Room Number Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Room Number
            </label>
            <input
              type="text"
              value={roomNo}
              onChange={(e) => setRoomNo(e.target.value)}
              placeholder="e.g. A12"
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg transition duration-200 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save & Continue'}
          </button>

        </form>

      </div>
    </div>
  )
}
