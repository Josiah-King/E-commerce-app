import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-orange-50 flex items-center justify-center px-4">
      <div className="text-center">

        <h1 className="text-5xl font-bold text-orange-500 mb-4">
          🍟 Fries App
        </h1>

        <p className="text-gray-600 text-lg mb-8">
          Hot chapati, mandazi and fries delivered to your hostel room.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/signup"
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-3 rounded-lg transition duration-200"
          >
            Create Account
          </Link>

          <Link
            href="/login"
            className="border border-orange-500 text-orange-500 hover:bg-orange-50 font-semibold px-8 py-3 rounded-lg transition duration-200"
          >
            Log In
          </Link>
        </div>

      </div>
    </div>
  )
}
