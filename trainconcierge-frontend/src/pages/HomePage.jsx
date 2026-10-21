import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Train, Search, Shield, Bell, Hotel, Car, AlertCircle } from 'lucide-react'

export default function HomePage() {
  const { user, isAdmin } = useAuth()

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-700 to-indigo-800 text-white">
        <div className="max-w-6xl mx-auto px-4 py-20 text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-white/20 p-4 rounded-full">
              <Train className="h-14 w-14" />
            </div>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">TrainConcierge</h1>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Your intelligent rail travel assistant. Search trains, book tickets,
            get disruption alerts, and manage your entire journey.
          </p>
          {user ? (
            <div className="flex flex-wrap gap-4 justify-center">
              {isAdmin() ? (
                <Link to="/admin" className="bg-white text-blue-700 font-semibold px-8 py-3 rounded-xl hover:bg-blue-50 transition-colors">
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link to="/search" className="bg-white text-blue-700 font-semibold px-8 py-3 rounded-xl hover:bg-blue-50 transition-colors">
                    Search Trains
                  </Link>
                  <Link to="/bookings" className="bg-white/20 border border-white/40 font-semibold px-8 py-3 rounded-xl hover:bg-white/30 transition-colors">
                    My Bookings
                  </Link>
                </>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap gap-4 justify-center">
              <Link to="/login" className="bg-white text-blue-700 font-semibold px-8 py-3 rounded-xl hover:bg-blue-50 transition-colors">
                Sign In
              </Link>
              <Link to="/register" className="bg-white/20 border border-white/40 font-semibold px-8 py-3 rounded-xl hover:bg-white/30 transition-colors">
                Create Account
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Features */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-10">Everything you need for rail travel</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(({ icon: Icon, title, desc, color }) => (
            <div key={title} className="card flex items-start gap-4">
              <div className={`p-3 rounded-xl ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
                <p className="text-sm text-gray-500">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const FEATURES = [
  { icon: Search, title: 'Smart Train Search', color: 'bg-blue-100 text-blue-700',
    desc: 'Search trains by route and date, with live seat availability.' },
  { icon: Shield, title: 'Secure JWT Auth', color: 'bg-green-100 text-green-700',
    desc: 'Role-based access for passengers and admins with protected routes.' },
  { icon: Bell, title: 'Disruption Alerts', color: 'bg-yellow-100 text-yellow-700',
    desc: 'Get notified instantly when your train is delayed or cancelled.' },
  { icon: AlertCircle, title: 'Alternative Recommendations', color: 'bg-purple-100 text-purple-700',
    desc: 'Automatically see alternative trains and rebook in one click.' },
  { icon: Hotel, title: 'Hotel Coordination', color: 'bg-indigo-100 text-indigo-700',
    desc: 'Book hotels at your destination linked to your train booking.' },
  { icon: Car, title: 'Cab Integration', color: 'bg-cyan-100 text-cyan-700',
    desc: 'Arrange cab pickup from the station to your final destination.' }
]
