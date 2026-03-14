import { Navigate, Outlet } from 'react-router-dom'
import { useSelector } from 'react-redux'

const ProtectedRoute = ({ requiredRole }) => {
    const { user, token } = useSelector((state) => state.auth)

    if (!token || !user) {
        return <Navigate to="/login" replace />
    }

    if (requiredRole && user.role !== requiredRole) {
        return <Navigate to="/" replace />
    }

    return <Outlet />
}

export default ProtectedRoute
