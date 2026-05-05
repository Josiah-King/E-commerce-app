'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Get success message from URL if redirected from signup
  const message = searchParams.get('message')

  // These store what the user types
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // These store the state of the form
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Ask NextAuth to log the user in
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false, // We handle the redirect ourselves
      })

      if (result?.error) {
        // Wrong email or password
        setError('Invalid email or password. Please try again.')
        setLoading(false)
        return
      }

      const sessionResponse = await fetch('/api/auth/session')
      const sessionData = await sessionResponse.json()

      if (sessionData?.user?.role === 'OWNER') {
      // Owner goes straight to dashboard
        router.push('/dashboard')
      } else {
        // Check if student has completed their profile
        const response = await fetch('/api/profile/check')
        const data = await response.json()

        if (!data.hasProfile) {
          router.push('/profile-setup')
        } else {
          router.push('/menu')
        }
      }
      router.refresh()

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
          <p className="text-gray-500 mt-2">Welcome back! Log in to order.</p>
        </div>

        {/* Success message from signup */}
        {message && (
          <div className="bg-green-50 text-green-600 px-4 py-3 rounded-lg mb-6 text-sm">
            {message}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Email Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
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
            {loading ? 'Logging in...' : 'Log In'}
          </button>

        </form>

        {/* Link to Signup */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-orange-500 font-medium hover:underline">
            Sign up
          </Link>
        </p>

      </div>
    </div>
  )
}

// We wrap the form in Suspense because useSearchParams
// needs it to work properly in Next.js
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
