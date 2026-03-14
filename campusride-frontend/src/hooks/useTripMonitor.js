import { useEffect } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate, useLocation } from 'react-router-dom'
import axios from '../api/axiosInstance'

export const useTripMonitor = () => {
    const { user, token } = useSelector((state) => state.auth)
    const navigate = useNavigate()
    const location = useLocation()

    useEffect(() => {
        // Only run if user is logged in
        if (!user || !token) return

        // Avoid infinite redirect loops if already on tracking page
        if (location.pathname.startsWith('/live-tracking') || 
            location.pathname.startsWith('/track') || 
            location.pathname.startsWith('/ride-details')) {
            return
        }

        const checkActiveSession = async () => {
            try {
                const response = await axios.get('/rides/active-session')
                // 200 means an active session was found
                if (response.status === 200 && response.data?.id) {
                    // Only auto-redirect if the trip is actually IN_PROGRESS
                    if (response.data.status === 'IN_PROGRESS') {
                        console.log("Active trip detected, redirecting to tracking...", response.data.id)
                        navigate(`/live-tracking/${response.data.id}`)
                    } else {
                        console.log("Ride found but not yet started (OPEN). Staying on dashboard.")
                    }
                }
            } catch (err) {
                // Ignore 204 or 404/others for silent monitoring
                if (err.response?.status !== 204) {
                    console.error("Active session check failed", err)
                }
            }
        }

        // Delay slightly to allow initial page load/auth sync
        const timer = setTimeout(checkActiveSession, 1000)
        return () => clearTimeout(timer)
    }, [user, token, location.pathname, navigate])
}
