import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Container, Paper, Typography, Box, Stack, Avatar, Chip, Button, Alert, Fade } from '@mui/material'
import { Security, LocationOn, DirectionsCar, Timer, PhoneInTalk } from '@mui/icons-material'
import CampusMap from '../components/map/CampusMap'
import axios from 'axios'

const PublicTrackingPage = () => {
    const { token } = useParams()
    const [ride, setRide] = useState(null)
    const [error, setError] = useState(null)
    const [loading, setLoading] = useState(true)

    const API_BASE_URL = 'http://localhost:8080/api/public'

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/track/${token}`)
                setRide(res.data)
                setError(null)
            } catch (err) {
                setError(err.response?.data?.message || 'This tracking link is invalid or has expired.')
            } finally {
                setLoading(false)
            }
        }

        fetchStatus()
        const interval = setInterval(fetchStatus, 15000) // Poll every 15s
        return () => clearInterval(interval)
    }, [token])

    if (loading) return null

    if (error) {
        return (
            <Container maxWidth="sm" sx={{ mt: 10, textAlign: 'center' }}>
                <Security sx={{ fontSize: 80, color: 'error.light', mb: 2 }} />
                <Typography variant="h5" gutterBottom fontWeight="bold">Journey Ended</Typography>
                <Alert severity="info" sx={{ borderRadius: 4 }}>{error}</Alert>
                <Button variant="outlined" sx={{ mt: 4, borderRadius: 10 }} onClick={() => window.location.href = '/'}>
                    Back to Home
                </Button>
            </Container>
        )
    }

    return (
        <Box sx={{ height: '100vh', position: 'relative', bgcolor: '#f4f7f9' }}>
            <Box sx={{ height: '100%', width: '100%' }}>
                <CampusMap
                    center={ride ? [ride.currentLat, ride.currentLng] : [29.9676, 77.5511]}
                    markers={[{
                        position: [ride.currentLat, ride.currentLng],
                        popup: `${ride.riderFirstName}'s current location`,
                        icon: 'rider' // Placeholder for special icon
                    }]}
                    polyline={ride.routeCoordinates}
                    style={{ height: '100%', width: '100%' }}
                />
            </Box>

            {/* Float Overlay */}
            <Fade in timeout={1000}>
                <Paper sx={{
                    position: 'absolute',
                    bottom: 24,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '90%',
                    maxWidth: 450,
                    p: 3,
                    borderRadius: 8,
                    bgcolor: 'rgba(255,255,255,0.95)',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 20px 80px rgba(0,0,0,0.15)',
                    zIndex: 1000
                }}>
                    <Stack spacing={2}>
                        <Stack direction="row" spacing={2} alignItems="center">
                            <Avatar sx={{ bgcolor: 'primary.main', width: 50, height: 50 }}>
                                <DirectionsCar />
                            </Avatar>
                            <Box sx={{ flexGrow: 1 }}>
                                <Typography variant="h6" fontWeight="bold">
                                    {ride.riderFirstName}'s Live Journey
                                </Typography>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <Timer sx={{ fontSize: 16, opacity: 0.6 }} />
                                    <Typography variant="caption" sx={{ opacity: 0.8 }}>
                                        Status: {ride.status}
                                    </Typography>
                                </Stack>
                            </Box>
                            <Chip
                                label="LIVE"
                                color="error"
                                size="small"
                                sx={{ fontWeight: 'bold', animation: 'pulse 1.5s infinite' }}
                            />
                        </Stack>

                        <Stack direction="row" spacing={2} justifyContent="space-between">
                            <Box>
                                <Typography variant="caption" color="text.secondary">Vehicle Type</Typography>
                                <Typography variant="body2" fontWeight="bold">{ride.vehicleType}</Typography>
                            </Box>
                            <Box sx={{ textAlign: 'right' }}>
                                <Typography variant="caption" color="text.secondary">Campus Verified</Typography>
                                <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
                                    <Security sx={{ fontSize: 14, color: 'success.main' }} />
                                    <Typography variant="body2" fontWeight="bold" color="success.main">Yes</Typography>
                                </Stack>
                            </Box>
                        </Stack>

                        <Button
                            fullWidth
                            variant="contained"
                            color="error"
                            startIcon={<PhoneInTalk />}
                            sx={{ py: 2, borderRadius: 4, fontWeight: 'bold' }}
                            onClick={() => window.location.href = 'tel:100'}
                        >
                            Report Emergency to Authorities
                        </Button>

                        <Typography variant="caption" textAlign="center" sx={{ opacity: 0.6 }}>
                            This tracking link is temporary and will expire when the journey ends.
                        </Typography>
                    </Stack>
                </Paper>
            </Fade>

            <style>
                {`
                @keyframes pulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.5; }
                    100% { opacity: 1; }
                }
                `}
            </style>
        </Box>
    )
}

export default PublicTrackingPage
