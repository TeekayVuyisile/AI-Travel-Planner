import { lazy } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import AppShell from './components/layout/AppShell'
import Spinner from './components/ui/Spinner'
import ServerNotice from './components/ServerNotice'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import NotFound from './pages/NotFound'

// Signed-in pages are split out so the landing page loads without the trip workspace code
const Dashboard = lazy(() => import('./pages/Dashboard'))
const NewTrip = lazy(() => import('./pages/NewTrip'))
const TripOverview = lazy(() => import('./pages/TripOverview'))

const FullPageSpinner = () => (
  <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4">
    <Spinner className="size-8 text-brand-700" />
    <ServerNotice className="w-full max-w-md" />
  </div>
)

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <FullPageSpinner />
  return user ? children : <Navigate to="/login" replace state={{ from: location.pathname }} />
}

const PublicOnlyRoute = ({ children }) => {
  const { user, loading } = useAuth()
  if (loading) return <FullPageSpinner />
  return user ? <Navigate to="/dashboard" replace /> : children
}

const App = () => (
  <Routes>
    <Route path="/" element={<Landing />} />
    <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
    <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
    <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/trips/new" element={<NewTrip />} />
      <Route path="/trips/:tripId" element={<TripOverview />} />
    </Route>
    <Route path="*" element={<NotFound />} />
  </Routes>
)

export default App
