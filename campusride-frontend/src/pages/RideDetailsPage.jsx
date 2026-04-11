import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
    Container, Paper, Typography, Box, List, ListItem, ListItemText,
    ListItemAvatar, Avatar, Chip, Button, Divider, Alert, Grid2 as Grid,
    Card, CardContent, IconButton, Tooltip, Stack, Fade, Zoom, useTheme, useMediaQuery,
    Rating
} from '@mui/material'
import {
    Check, Close, Person, DirectionsCar, AccessTime,
    LocationOn, Message, Navigation, Verified, Groups, Star,
    Shield
} from '@mui/icons-material'
import axios from '../api/axiosInstance'
import ChatBubble from '../components/chat/ChatBubble'

const RequestCard = ({ req, handleAction }) => (
    <Card sx={{
        mb: 2, borderRadius: 4, transition: '0.3s',
        border: '1px solid #eee', boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
        '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 8px 20px rgba(0,0,0,0.08)' }
    }}>
        <CardContent sx={{ p: 3 }}>
            <Grid container spacing={2} alignItems="center">
                <Grid size={{ xs: 12, sm: 8 }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar sx={{ width: 56, height: 56, bgcolor: 'secondary.light', color: 'secondary.main', fontWeight: 'bold' }}>
                            {req.passenger.name.charAt(0)}
                        </Avatar>
                        <Box>
                            <Typography variant="h6" className="font-bold">{req.passenger.name}</Typography>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Typography variant="body2" color="text.secondary">
                                    {req.passenger.department} • {req.passenger.course} • Year {req.passenger.year}
                                </Typography>
                                <Chip 
                                    icon={<Star sx={{ fontSize: '0.9rem !important', color: '#f59e0b !important' }} />} 
                                    label={`${req.passenger.trustScore} pts`} 
                                    size="small" 
                                    variant="outlined" 
                                    sx={{ height: 20, bgcolor: '#fffbeb', color: '#92400e', fontWeight: 'bold', border: '1px solid #fef3c7' }} 
                                />
                                <Chip icon={<Verified sx={{ fontSize: '1rem !important' }} />} label="Student" size="small" variant="outlined" color="success" />
                            </Stack>
                            {req.estimatedContribution && (
                                <Typography variant="caption" sx={{ mt: 1, display: 'block', color: 'primary.main', fontWeight: 'bold' }}>
                                    Estimated Contribution: ₹{req.estimatedContribution}
                                </Typography>
                            )}
                        </Box>
                    </Stack>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }} sx={{ textAlign: 'right' }}>
                    {req.status === 'PENDING' ? (
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Tooltip title="Accept Passenger">
                                <IconButton color="success" onClick={() => handleAction(req.id, 'rider-accept')} sx={{ bgcolor: 'success.light', '&:hover': { bgcolor: 'success.main', color: 'white' } }}>
                                    <Check />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Decline Request">
                                <IconButton color="error" onClick={() => handleAction(req.id, 'reject')} sx={{ bgcolor: 'error.light', '&:hover': { bgcolor: 'error.main', color: 'white' } }}>
                                    <Close />
                                </IconButton>
                            </Tooltip>
                        </Stack>
                    ) : (
                        <Chip
                            label={req.status}
                            color={req.status === 'ACCEPTED' ? 'success' : 'error'}
                            variant="filled"
                            sx={{ fontWeight: 'bold', borderRadius: 2 }}
                        />
                    )}
                </Grid>
            </Grid>

            {req.riderAccepted && !req.passengerAccepted && (
                <Box sx={{ mt: 2, p: 1.5, bgcolor: '#f0f7ff', borderRadius: 2, border: '1px dashed #2196f3' }}>
                    <Typography variant="caption" color="primary.main" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 'bold' }}>
                        <AccessTime fontSize="small" /> Handshake Invitation Sent. Waiting for passenger's final confirmation.
                    </Typography>
                </Box>
            )}

            {req.status === 'ACCEPTED' && req.passengerAccepted && (
                <Box sx={{ mt: 2 }}>
                    <Button
                        variant="soft" size="small" fullWidth color="success"
                        startIcon={<Message />} sx={{ borderRadius: 2, py: 1 }}
                    >
                        Chat with Passenger
                    </Button>
                </Box>
            )}
        </CardContent>
    </Card>
)

const RideDetailsPage = () => {
    const { rideId } = useParams()
    const navigate = useNavigate()
    const theme = useTheme()
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
    const { user: currentUser } = useSelector((state) => state.auth)
    const [ride, setRide] = useState(null)
    const [requests, setRequests] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const fetchData = async () => {
        try {
            const [rideRes, reqRes] = await Promise.all([
                axios.get(`/rides/${rideId}`),
                axios.get(`/ride-requests/ride/${rideId}`)
            ])
            setRide(rideRes.data)
            setRequests(reqRes.data)
        } catch (err) {
            setError('Failed to fetch ride details')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (rideId) fetchData()
    }, [rideId])

    const handleAction = async (requestId, action) => {
        try {
            await axios.put(`/ride-requests/${requestId}/${action}`)
            fetchData()
        } catch (err) {
            alert(err.response?.data?.message || 'Action failed')
        }
    }

    if (loading) return null
    if (error) return <Container sx={{ mt: 4 }}><Alert severity="error" sx={{ borderRadius: 4 }}>{error}</Alert></Container>

    const confirmedTrips = requests.filter(r => r.riderAccepted && r.passengerAccepted).length
    const isRider = currentUser && ride && currentUser.id === ride.riderId
    const myRequest = !isRider && requests.find(r => r.passenger.id === currentUser.id)

    return (
        <Container maxWidth="lg" sx={{ mt: { xs: 2, md: 4 }, pb: 8 }}>
            <Fade in timeout={800}>
                <Grid container spacing={isMobile ? 2 : 4}>
                    {/* Header Info Card */}
                    <Grid size={{ xs: 12 }}>
                        <Paper sx={{
                            p: { xs: 3, md: 6 }, borderRadius: 8,
                            background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
                            color: 'white',
                            position: 'relative',
                            overflow: 'hidden',
                            boxShadow: '0 20px 40px rgba(30, 58, 138, 0.2)'
                        }}>
                            <Box sx={{ position: 'absolute', top: -40, right: -40, opacity: 0.1 }}>
                                <DirectionsCar sx={{ fontSize: 240 }} />
                            </Box>

                            <Grid container spacing={isMobile ? 2 : 4} alignItems="center">
                                <Grid size={{ xs: 12, md: 8 }}>
                                    <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                                        <Chip 
                                            label={ride.status} 
                                            sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 'bold' }} 
                                        />
                                        <Chip 
                                            icon={<Groups sx={{ color: 'white !important' }} />} 
                                            label={`${ride.seatsAvailable} Seats Open`} 
                                            sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 'bold' }} 
                                        />
                                    </Stack>
                                    <Typography variant={isMobile ? "h4" : "h3"} className="font-bold" gutterBottom>
                                        {isRider ? "Ride Management" : "Ride Details"}
                                    </Typography>
                                    <Stack direction={isMobile ? "column" : "row"} spacing={isMobile ? 1 : 4} sx={{ opacity: 0.9 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <AccessTime />
                                            <Typography variant="body1">{new Date(ride.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <LocationOn />
                                            <Typography variant="body1">{ride.pickupLocationName} to {ride.dropoffLocationName}</Typography>
                                        </Box>
                                    </Stack>
                                </Grid>
                                <Grid size={{ xs: 12, md: 4 }} sx={{ display: 'flex', justifyContent: isMobile ? 'flex-start' : 'flex-end', gap: 2 }}>
                                    {isRider && (
                                        <Button
                                            variant="contained"
                                            color="secondary"
                                            fullWidth={isMobile}
                                            startIcon={<Navigation />}
                                            onClick={async () => {
                                                if (window.confirm("Are you ready to start this journey? This will notify confirmed passengers.")) {
                                                    try {
                                                        await axios.put(`/rides/${rideId}/start`);
                                                        navigate(`/live-tracking/${rideId}`);
                                                    } catch (err) {
                                                        alert(err.response?.data?.message || 'Failed to start trip');
                                                    }
                                                }
                                            }}
                                            sx={{ borderRadius: 3, fontWeight: 'bold', py: 1.5, px: isMobile ? 2 : 4 }}
                                        >
                                            Start Trip
                                        </Button>
                                    )}
                                    {!isRider && myRequest && myRequest.status === 'ACCEPTED' && myRequest.passengerAccepted && (
                                        <Button
                                            variant="contained"
                                            color="success"
                                            fullWidth={isMobile}
                                            startIcon={<Navigation />}
                                            onClick={() => navigate(`/live-tracking/${rideId}`)}
                                            sx={{ borderRadius: 3, fontWeight: 'bold', py: 1.5, px: 4 }}
                                        >
                                            Track Ride
                                        </Button>
                                    )}
                                </Grid>
                            </Grid>
                        </Paper>
                    </Grid>

                    {!isRider && (
                        <Grid size={{ xs: 12, md: 4 }}>
                            <Card sx={{ borderRadius: 6, border: '1px solid #eee' }}>
                                <CardContent sx={{ p: 4 }}>
                                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Person color="primary" /> Rider Profile
                                    </Typography>
                                    <Divider sx={{ mb: 3 }} />
                                    <Stack spacing={2} alignItems="center" sx={{ mb: 3 }}>
                                        <Avatar sx={{ width: 80, height: 80, bgcolor: 'primary.light', color: 'primary.main', fontSize: '2rem' }}>
                                            {ride.riderName.charAt(0)}
                                        </Avatar>
                                        <Box sx={{ textAlign: 'center' }}>
                                            <Typography variant="h6" className="font-bold">{ride.riderName} <Verified sx={{ fontSize: '1.2rem', color: 'success.main', ml: 0.5 }} /></Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {ride.riderDept} • {ride.riderCourse}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">Year {ride.riderYear}</Typography>
                                        </Box>
                                    </Stack>
                                    <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 4, textAlign: 'center' }}>
                                        <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: 1, fontWeight: 'bold', color: 'text.secondary' }}>Trust Score</Typography>
                                        <Typography variant="h4" className="font-bold" color="primary">{ride.riderTrustScore}</Typography>
                                        <Rating value={ride.riderTrustScore/20} readOnly size="small" sx={{ mt: 1 }} />
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    )}

                    <Grid size={{ xs: 12, md: isRider ? 7 : 8 }}>
                        {isRider ? (
                            <>
                                <Typography variant="h5" className="font-bold" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    Passenger Responses <Chip label={requests.length} size="small" />
                                </Typography>

                                {requests.length === 0 ? (
                                    <Paper sx={{ p: 8, textAlign: 'center', borderRadius: 6, border: '2px dashed #ddd', bgcolor: 'transparent' }}>
                                        <Groups sx={{ fontSize: 60, color: '#ddd', mb: 2 }} />
                                        <Typography color="text.secondary">No students have requested this ride yet.</Typography>
                                    </Paper>
                                ) : (
                                    <List disablePadding>
                                        {requests.map(req => (
                                            <RequestCard key={req.id} req={req} handleAction={handleAction} />
                                        ))}
                                    </List>
                                )}
                            </>
                        ) : (
                            <Box>
                                <Typography variant="h5" className="font-bold" sx={{ mb: 3 }}>Trip Context</Typography>
                                <Paper sx={{ p: 4, borderRadius: 6, mb: 3 }}>
                                    <Stack spacing={3}>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ textTransform: 'uppercase' }}>Pickup Pont</Typography>
                                            <Typography variant="body1" className="font-bold">{ride.pickupLocationName}</Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ textTransform: 'uppercase' }}>Destination</Typography>
                                            <Typography variant="body1" className="font-bold">{ride.dropoffLocationName}</Typography>
                                        </Box>
                                        <Grid container spacing={2}>
                                            <Grid size={6}>
                                                <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ textTransform: 'uppercase' }}>Vehicle</Typography>
                                                <Typography variant="body1" className="font-bold" sx={{ textTransform: 'capitalize' }}>{ride.vehicleType}</Typography>
                                            </Grid>
                                            <Grid size={6}>
                                                <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ textTransform: 'uppercase' }}>Contribution</Typography>
                                                <Typography variant="body1" className="font-bold">₹{ride.estimatedContribution}</Typography>
                                            </Grid>
                                        </Grid>
                                    </Stack>
                                </Paper>

                                {myRequest ? (
                                    <Paper sx={{ p: 3, borderRadius: 6, border: '1px solid #e2e8f0', bgcolor: '#f1f5f9' }}>
                                        <Typography variant="h6" className="font-bold" gutterBottom>Your Request Status</Typography>
                                        <Divider sx={{ mb: 2 }} />
                                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                                            <Box>
                                                <Typography variant="body2" color="text.secondary">Current Status</Typography>
                                                <Typography variant="h6" className="font-bold" color="primary">{myRequest.status}</Typography>
                                            </Box>
                                            {myRequest.status === 'ACCEPTED' && !myRequest.passengerAccepted && (
                                                <Button 
                                                    variant="contained" 
                                                    color="secondary" 
                                                    onClick={() => handleAction(myRequest.id, 'passenger-confirm')} 
                                                    sx={{ borderRadius: 3, fontWeight: 'bold' }}
                                                >
                                                    Final Confirmation
                                                </Button>
                                            )}
                                        </Stack>
                                    </Paper>
                                ) : (
                                    ride.seatsAvailable > 0 && (
                                        <Button
                                            fullWidth variant="contained" size="large"
                                            onClick={async () => {
                                                try {
                                                    await axios.post('/ride-requests', { rideId: ride.id });
                                                    fetchData();
                                                } catch (err) { alert(err.response?.data?.message || 'Request failed') }
                                            }}
                                            sx={{ borderRadius: 4, py: 2, fontWeight: 'bold' }}
                                        >
                                            Request to Join Ride
                                        </Button>
                                    )
                                )}
                            </Box>
                        )}
                    </Grid>


                    {/* Summary / Stats Column */}
                    <Grid size={{ xs: 12, md: isRider ? 5 : 4 }}>
                        <Stack spacing={3}>
                            <Card sx={{ borderRadius: 6, boxShadow: '0 10px 30px rgba(0,0,0,0.03)', border: '1px solid #eee' }}>
                                <CardContent sx={{ p: 4 }}>
                                    <Typography variant="h6" className="font-bold" gutterBottom>Ride Security</Typography>
                                    <Divider sx={{ mb: 3 }} />

                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                        <Typography color="text.secondary">Confirmed</Typography>
                                        <Typography className="font-bold">{confirmedTrips} Students</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                        <Typography color="text.secondary">Seats Left</Typography>
                                        <Typography className="font-bold">{ride.seatsAvailable}</Typography>
                                    </Box>
                                    
                                    <Paper sx={{ p: 2, mt: 2, bgcolor: '#f0fdf4', borderRadius: 4, border: '1px solid #dcfce7' }}>
                                        <Typography variant="body2" sx={{ fontWeight: 500, color: 'success.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Shield fontSize="small" /> Privacy Secure:
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Contact details are only shared after mutual Handshake confirmation.
                                        </Typography>
                                    </Paper>
                                </CardContent>
                            </Card>

                            {isRider && (
                                <Button
                                    fullWidth variant="outlined" color="error"
                                    sx={{ borderRadius: 4, py: 1.5, fontWeight: 'bold' }}
                                    onClick={() => { if (window.confirm('Cancel this ride? All confirmed passengers will be notified.')) {/* handle cancel */ } }}
                                >
                                    Cancel Entire Ride
                                </Button>
                            )}
                        </Stack>
                    </Grid>
                </Grid>
            </Fade>
            <ChatBubble rideId={rideId} />
        </Container>
    )
}

export default RideDetailsPage
