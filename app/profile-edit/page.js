'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

function getInitials(nickname, email) {
  const name = nickname || email || '?'
  return name.slice(0, 2).toUpperCase()
}

export default function ProfileEditPage() {
  const { data: session, status, update } = useSession()
  const router = useRouter()

  const [nickname, setNickname] = useState('')
  const [hostel, setHostel] = useState('')
  const [roomNo, setRoomNo] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Redirect if not logged in
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  // Fetch current profile details
  useEffect(() => {
    if (status !== 'authenticated') return

    async function fetchProfile() {
      try {
        const response = await fetch('/api/profile')
        const data = await response.json()

        if (!response.ok) {
          setError('Failed to load profile')
          return
        }

        setNickname(data.user?.nickname || '')
        setHostel(data.user?.hostel || '')
        setRoomNo(data.user?.roomNo || '')
      } catch (error) {
        setError('Failed to load profile')
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [status])

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)

    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, hostel, roomNo }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error)
        setSaving(false)
        return
      }

      // Update the session with new details
      await update({
        ...session,
        user: {
          ...session?.user,
          nickname,
          hostel,
          roomNo,
        },
      })

      setSuccess('Profile updated successfully!')

      // Go back to menu after short delay
      setTimeout(() => {
        router.push('/menu')
      }, 1500)

    } catch (error) {
      setError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center">
        <p className="text-orange-500 font-medium">Loading profile...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-orange-50">

      {/* ── Header ── */}
      <div className="bg-orange-500 px-4 pt-6 pb-10">
        <div className="max-w-md mx-auto flex items-center gap-4">
          <button
            onClick={() => router.push('/menu')}
            className="text-orange-200 hover:text-white transition text-sm"
          >
            ← Back
          </button>
          <h1 className="text-white text-lg font-bold">Edit Profile</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 -mt-6">

        {/* ── Profile Card ── */}
        <div className="bg-white rounded-2xl shadow-sm p-6">

          {/* Avatar Display */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-20 h-20 rounded-full bg-orange-400 flex items-center justify-center text-white font-bold text-2xl mb-3">
              {getInitials(nickname, session?.user?.email)}
            </div>
            <p className="text-gray-500 text-sm">
              {session?.user?.email}
            </p>
          </div>

          {/* Success Message */}
          {success && (
            <div className="bg-green-50 text-green-600 px-4 py-3 rounded-xl mb-5 text-sm text-center font-medium">
              {success}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl mb-5 text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSave} className="space-y-5">

            {/* Nickname */}
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
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              <p className="text-xs text-gray-400 mt-1">
                3-15 characters. Letters, numbers and underscores only.
              </p>
            </div>

            {/* Hostel */}
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
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
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
                required
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            {/* Save Button */}
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>

          </form>

        </div>

      </div>
    </div>
  )
}
