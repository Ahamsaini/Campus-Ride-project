import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import CreateRidePage from './pages/CreateRidePage'
import SearchRidePage from './pages/SearchRidePage'
import RideDetailsPage from './pages/RideDetailsPage'
import LiveTrackingPage from './pages/LiveTrackingPage'
import TripHistoryPage from './pages/TripHistoryPage'
import LeaderboardPage from './pages/LeaderboardPage'
import ProfilePage from './pages/ProfilePage'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminRegisterPage from './pages/admin/AdminRegisterPage'
import PublicTrackingPage from './pages/PublicTrackingPage'
import EmergencyAlert from './components/common/EmergencyAlert'
import ProtectedRoute from './components/common/ProtectedRoute'
import Navbar from './components/layout/Navbar'
import NotFoundPage from './pages/NotFoundPage'
import { useTripMonitor } from './hooks/useTripMonitor'

function App() {
    useTripMonitor()
    
    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <EmergencyAlert />
            <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/admin/register" element={<AdminRegisterPage />} />
                <Route path="/track/:token" element={<PublicTrackingPage />} />

                <Route element={<ProtectedRoute />}>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/create-ride" element={<CreateRidePage />} />
                    <Route path="/search-ride" element={<SearchRidePage />} />
                    <Route path="/ride-details/:rideId" element={<RideDetailsPage />} />
                    <Route path="/live-tracking/:rideId" element={<LiveTrackingPage />} />
                    <Route path="/history" element={<TripHistoryPage />} />
                    <Route path="/leaderboard" element={<LeaderboardPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                </Route>

                <Route element={<ProtectedRoute requiredRole="ADMIN" />}>
                    <Route path="/admin" element={<AdminDashboard />} />
                </Route>

                <Route path="*" element={<NotFoundPage />} />
            </Routes>
        </div>
    )
}

export default App
