import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
    Container, Typography, Grid2 as Grid, Card, CardContent, Button,
    Box, Chip, Divider, List, ListItem, ListItemText, Alert, Paper,
    Avatar, IconButton, Stack, Fade, useMediaQuery, useTheme, LinearProgress
} from '@mui/material'
import {
    DirectionsCar, Map, AddCircle, Notifications, Message,
    ArrowForward, School, Verified, Warning, Repeat, Delete,
    WbSunny, Nightlight, Info, Star, Group, AccessTime, Forest
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import axios from '../api/axiosInstance'
import { StatsSkeleton, RideCardSkeleton } from '../components/ui/Skeletons'

const ActionCard = ({ title, desc, icon, color, onClick, buttonText, secondaryIcon }) => (
    <Card
        sx={{
            height: '100%',
            borderRadius: 6,
            position: 'relative',
            overflow: 'hidden',
            transition: '0.3s',
            border: '1px solid rgba(0,0,0,0.05)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.03)',
            '&:hover': {
                transform: 'translateY(-8px)',
                boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
                '& .icon-bg': { transform: 'scale(1.2)' }
            }
        }}
    >
        <Box className="icon-bg" sx={{
            position: 'absolute', top: -20, right: -20, opacity: 0.1,
            transition: '0.5s', fontSize: 180, color: `${color}.main`
        }}>
            {secondaryIcon}
        </Box>
        <CardContent sx={{ p: 4, position: 'relative', zIndex: 1 }}>
            <Avatar sx={{ bgcolor: `${color}.light`, color: `${color}.main`, mb: 3, width: 64, height: 64 }}>
                {icon}
            </Avatar>
            <Typography variant="h5" className="font-bold" gutterBottom>{title}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4, height: 40 }}>
                {desc}
            </Typography>
            <Button
                variant="contained"
                color={color}
                fullWidth
                onClick={onClick}
                endIcon={<ArrowForward />}
                sx={{ borderRadius: 3, py: 1.5, fontWeight: 'bold', textTransform: 'none', fontSize: '1rem' }}
            >
                {buttonText}
            </Button>
        </CardContent>
    </Card>
)

const DashboardPage = () => {
    const { user } = useSelector((state) => state.auth)
    const navigate = useNavigate()
    const theme = useTheme()
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
    const [myRides, setMyRides] = useState([])
    const [myRequests, setMyRequests] = useState([])
    const [myRoutines, setMyRoutines] = useState([])
    const [loading, setLoading] = useState(true)

    const fetchData = async () => {
        try {
            const [ridesRes, reqRes, routineRes] = await Promise.all([
                axios.get('/rides/my-rides'),
                axios.get('/ride-requests/my-requests'),
                axios.get(`/ride-templates/user/${user.id}`)
            ])
            setMyRides(ridesRes.data)
            setMyRequests(reqRes.data)
            setMyRoutines(routineRes.data)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const activeRides = myRides.filter(r => r.status !== 'COMPLETED' && r.status !== 'CANCELLED')
    const completedRides = myRides.filter(r => r.status === 'COMPLETED')
    const activeRequests = myRequests.filter(r => r.status !== 'COMPLETED' && r.status !== 'CANCELLED' && r.ride?.status !== 'COMPLETED')
    const completedRequests = myRequests.filter(r => r.status === 'COMPLETED' || r.ride?.status === 'COMPLETED')

    const handleDeleteRoutine = async (id) => {
        if (!window.confirm("Delete this daily routine template?")) return
        try {
            await axios.delete(`/ride-templates/${id}`)
            fetchData()
        } catch (err) { console.error(err) }
    }

    const handleConfirm = async (requestId) => {
        try {
            await axios.put(`/ride-requests/${requestId}/passenger-confirm`)
            fetchData()
        } catch (err) {
            alert(err.response?.data?.message || 'Handshake confirmation failed')
        }
    }

    const getGreeting = () => {
        const hour = new Date().getHours()
        if (hour < 12) return { text: "Good Morning", icon: <WbSunny sx={{ color: '#fbbf24' }} /> }
        if (hour < 18) return { text: "Good Afternoon", icon: <WbSunny sx={{ color: '#f59e0b' }} /> }
        return { text: "Good Evening", icon: <Nightlight sx={{ color: '#818cf8' }} /> }
    }

    const greeting = getGreeting()
    const pendingRequestsCount = myRequests.filter(r => r.status === 'PENDING').length

    useEffect(() => {
        fetchData()
    }, [])

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
            <Fade in timeout={800}>
                <Box>
                    {/* Welcome Section */}
                    <Box sx={{
                        p: { xs: 3, md: 5 },
                        mb: 4,
                        borderRadius: 8,
                        background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                        color: 'white',
                        position: 'relative',
                        overflow: 'hidden',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.15)'
                    }}>
                        <Box sx={{ position: 'absolute', top: -30, right: -30, opacity: 0.1, transform: 'rotate(-15deg)' }}>
                            <DirectionsCar sx={{ fontSize: 240 }} />
                        </Box>

                        <Grid container spacing={4} alignItems="center" sx={{ position: 'relative', zIndex: 1 }}>
                            <Grid item xs={12} md={8}>
                                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                                    {greeting.icon}
                                    <Typography variant="h6" sx={{ fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', opacity: 0.9, fontSize: '0.8rem' }}>
                                        {greeting.text}
                                    </Typography>
                                    {user?.verified && (
                                        <Chip
                                            icon={<Verified sx={{ color: 'white !important', fontSize: '0.9rem !important' }} />}
                                            label="Verified"
                                            size="small"
                                            sx={{ bgcolor: 'rgba(34, 197, 94, 0.2)', color: 'white', fontWeight: 'bold', border: '1px solid rgba(34, 197, 94, 0.4)', height: 24 }}
                                        />
                                    )}
                                </Stack>
                                <Typography variant={isMobile ? "h4" : "h2"} className="font-bold" sx={{ mb: 1, lineHeight: 1.2 }}>
                                    Hi, {user?.name.split(' ')[0]}!
                                </Typography>
                                <Typography variant="body1" sx={{ opacity: 0.7, fontWeight: 400 }}>
                                    {isMobile ? "Where are we heading today?" : "Ready for your next campus adventure?"}
                                </Typography>
                            </Grid>
                            <Grid item xs={12} md={4}>
                                {loading ? <StatsSkeleton /> : (
                                    <Paper sx={{
                                        p: 2.5,
                                        background: 'rgba(255,255,255,0.05)',
                                        backdropFilter: 'blur(20px)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: 6,
                                        color: 'white'
                                    }}>
                                        <Typography variant="caption" sx={{ opacity: 0.6, fontWeight: 'bold', textTransform: 'uppercase', mb: 1.5, display: 'block' }}>
                                            Next Up
                                        </Typography>
                                        {myRequests.some(r => r.status === 'ACCEPTED') || myRides.length > 0 ? (
                                            <Stack spacing={1.5}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                    <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40, boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)' }}>
                                                        <AccessTime sx={{ fontSize: '1.2rem' }} />
                                                    </Avatar>
                                                    <Box>
                                                        <Typography variant="body2" className="font-bold">Trip Scheduled</Typography>
                                                        <Typography variant="caption" sx={{ opacity: 0.8 }}>Check your active dashboard</Typography>
                                                    </Box>
                                                </Box>
                                                <Button 
                                                    size="small" 
                                                    variant="contained" 
                                                    fullWidth
                                                    sx={{ bgcolor: 'white', color: 'primary.main', fontWeight: 'bold', borderRadius: 2, '&:hover': { bgcolor: '#f8fafc' } }}
                                                    onClick={() => {
                                                        const el = document.getElementById('active-offers-section');
                                                        el?.scrollIntoView({ behavior: 'smooth' });
                                                    }}
                                                >
                                                    View Details
                                                </Button>
                                            </Stack>
                                        ) : (
                                            <Typography variant="body2" sx={{ opacity: 0.8 }}>No upcoming trips today.</Typography>
                                        )}
                                    </Paper>
                                )}
                            </Grid>
                        </Grid>
                    </Box>

                    {/* Stats Row */}
                    {loading ? <StatsSkeleton /> : (
                        <Grid container spacing={3} sx={{ mb: 6 }}>
                            {[
                                { label: 'Rides', value: user?.totalRides || 0, icon: <DirectionsCar />, color: 'primary' },
                                { label: 'Pending', value: pendingRequestsCount, icon: <Notifications />, color: 'warning' },
                                { label: 'CO₂ Saved', value: ((user?.totalDistance || 0) * 0.12).toFixed(1) + 'kg', icon: <Forest />, color: 'success' },
                                { label: 'Trust', value: user?.trustScore || 100, icon: <Star />, color: 'info' }
                            ].map((stat, idx) => (
                                <Grid item xs={6} md={3} key={idx}>
                                    <Paper sx={{ 
                                        p: 2, 
                                        borderRadius: 5, 
                                        border: '1px solid #f1f5f9', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: 2,
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                                        '&:hover': { boxShadow: '0 8px 16px rgba(0,0,0,0.05)', borderColor: 'primary.light' }
                                    }}>
                                        <Avatar sx={{ bgcolor: `${stat.color}.light`, color: `${stat.color}.main`, width: 42, height: 42, borderRadius: 3 }}>
                                            {stat.icon}
                                        </Avatar>
                                        <Box>
                                            <Typography variant="h6" className="font-bold" sx={{ lineHeight: 1 }}>{stat.value}</Typography>
                                            <Typography variant="caption" color="text.secondary" className="font-bold">{stat.label}</Typography>
                                        </Box>
                                    </Paper>
                                </Grid>
                            ))}
                        </Grid>
                    )}

                    {/* Quick Access Grid */}
                    <Grid container spacing={4} sx={{ mb: 6 }}>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <ActionCard
                                title="Share Your Journey"
                                desc="Offer extra seats in your vehicle to help others and save the environment."
                                icon={<DirectionsCar sx={{ fontSize: 32 }} />}
                                color="primary"
                                onClick={() => navigate('/create-ride')}
                                buttonText="Post a New Ride"
                                secondaryIcon={<DirectionsCar />}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <ActionCard
                                title="Find a Buddy"
                                desc="Search for open rides heading to campus or home within your 5KM zone."
                                icon={<Map sx={{ fontSize: 32 }} />}
                                color="secondary"
                                onClick={() => navigate('/search-ride')}
                                buttonText="Explore Rides"
                                secondaryIcon={<Map />}
                            />
                        </Grid>
                    </Grid>

                    {/* Secondary Information Grid */}
                    <Grid container spacing={4}>
                        <Grid size={{ xs: 12, md: 6 }} id="active-offers-section">
                            <Paper sx={{
                                p: { xs: 2.5, md: 4 }, borderRadius: 6, boxShadow: '0 10px 30px rgba(0,0,0,0.03)',
                                border: '1px solid #eee', height: '100%'
                            }}>
                                <Typography variant="h6" className="font-bold" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <DirectionsCar color="primary" /> My Active Offers
                                </Typography>
                                <Divider sx={{ mb: 2 }} />
                                {loading ? <RideCardSkeleton /> : (
                                    activeRides.length > 0 ? (
                                        <Stack spacing={2}>
                                            {activeRides.map((ride) => (
                                                <Paper key={ride.id} sx={{ p: 2.5, borderRadius: 5, border: '1px solid #eee', position: 'relative' }}>
                                                    <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                                                        <Box sx={{ flexGrow: 1 }}>
                                                            <Typography variant="subtitle1" className="font-bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                <Box component="span" sx={{ opacity: 0.6, fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase' }}>From:</Box> {ride.pickupLocationName}
                                                            </Typography>
                                                            <Typography variant="subtitle1" className="font-bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                <Box component="span" sx={{ opacity: 0.6, fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase' }}>To:</Box> {ride.dropoffLocationName}
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                                Departure: {new Date(ride.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </Typography>
                                                        </Box>
                                                        <Chip
                                                            label={ride.seatsAvailable > 0 ? 'Open' : 'Closed'}
                                                            size="small"
                                                            color={ride.seatsAvailable > 0 ? 'success' : 'warning'}
                                                            sx={{ fontWeight: 'bold' }}
                                                        />
                                                    </Stack>

                                                    <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                                                        {ride.seatsAvailable > 0 && <Chip label={`${ride.seatsAvailable} Seats Left`} size="small" variant="outlined" />}
                                                        <Chip label={ride.vehicleType} size="small" variant="outlined" sx={{ textTransform: 'capitalize' }} />
                                                    </Stack>

                                                    <Stack direction="row" spacing={2}>
                                                        <Button
                                                            fullWidth
                                                            variant="outlined"
                                                            onClick={() => navigate(`/ride-details/${ride.id}`)}
                                                            sx={{ borderRadius: 3, py: 1, textTransform: 'none', fontWeight: 'bold' }}
                                                        >
                                                            Manage Guests
                                                        </Button>
                                                        <Button
                                                            fullWidth
                                                            variant="contained"
                                                            onClick={async () => {
                                                                if (window.confirm("Are you ready to start this journey? This will notify confirmed passengers.")) {
                                                                    try {
                                                                        await axios.put(`/rides/${ride.id}/start`);
                                                                        navigate(`/live-tracking/${ride.id}`);
                                                                    } catch (err) {
                                                                        alert(err.response?.data?.message || 'Failed to start trip');
                                                                    }
                                                                }
                                                            }}
                                                            sx={{ borderRadius: 3, py: 1, textTransform: 'none', fontWeight: 'bold' }}
                                                        >
                                                            Start Journey
                                                        </Button>
                                                    </Stack>
                                                </Paper>
                                            ))}
                                        </Stack>
                                    ) : (
                                        <Box sx={{ p: 4, textAlign: 'center', bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 5 }}>
                                            <DirectionsCar sx={{ fontSize: 40, opacity: 0.2, mb: 1 }} />
                                            <Typography variant="body2" color="text.secondary">No active offers</Typography>
                                        </Box>
                                    )
                                )}
                            </Paper>
                        </Grid>

                        <Grid size={{ xs: 12, md: 6 }}>
                            <Paper sx={{
                                p: 4, borderRadius: 6, boxShadow: '0 10px 30px rgba(0,0,0,0.03)',
                                border: '1px solid #eee', height: '100%'
                            }}>
                                <Typography variant="h6" className="font-bold" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Message color="secondary" /> Upcoming Requests
                                </Typography>
                                <Divider sx={{ mb: 2 }} />
                                {activeRequests.length === 0 ? (
                                    <Box sx={{ py: 6, textAlign: 'center' }}>
                                        <Typography color="text.secondary">You haven't requested any rides recently.</Typography>
                                    </Box>
                                ) : (
                                    <List sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        {activeRequests.map(req => (
                                            <Paper key={req.id} elevation={0} sx={{
                                                p: 2, borderRadius: 4, bgcolor: '#fcf8ff',
                                                border: '1px solid #f3e5f5', transition: '0.2s',
                                                '&:hover': { bgcolor: '#f5eeff' }
                                            }}>
                                                <ListItem disablePadding>
                                                    <ListItemText
                                                        primary={<Typography component="div" className="font-bold">Ride with {req.ride?.rider?.name || 'Unknown'}</Typography>}
                                                        secondary={
                                                            <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                                                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                                                    {req.ride?.rider?.department || '—'} • {req.ride?.rider?.course || '—'} • Year {req.ride?.rider?.year || '—'}
                                                                </Typography>
                                                                <Stack direction="row" spacing={1} alignItems="center">
                                                                    <Typography variant="caption" color="text.secondary">Status: {req.status}</Typography>
                                                                    <Chip 
                                                                        icon={<Star sx={{ fontSize: '0.8rem !important', color: '#f59e0b !important' }} />} 
                                                                        label={`${req.ride?.rider?.trustScore || 0} pts`} 
                                                                        size="small" 
                                                                        sx={{ height: 18, fontSize: '0.65rem', bgcolor: '#fffbeb', color: '#92400e', fontWeight: 'bold' }} 
                                                                    />
                                                                </Stack>
                                                            </Stack>
                                                        }
                                                        secondaryTypographyProps={{ component: 'div' }}
                                                    />
                                                    {req.status === 'ACCEPTED' && !req.passengerAccepted ? (
                                                        <Button
                                                            variant="contained"
                                                            size="small"
                                                            color="secondary"
                                                            sx={{ borderRadius: 2, px: 2, fontWeight: 'bold' }}
                                                            onClick={() => handleConfirm(req.id)}
                                                        >
                                                            Confirm
                                                        </Button>
                                                    ) : req.status === 'ACCEPTED' && req.passengerAccepted ? (
                                                        <Button
                                                            variant="contained"
                                                            size="small"
                                                            color="success"
                                                            sx={{ borderRadius: 2 }}
                                                            onClick={() => navigate(`/live-tracking/${req.ride.id}`)}
                                                        >
                                                            Track Ride
                                                        </Button>
                                                    ) : (
                                                        <Chip
                                                            label={req.status}
                                                            size="small"
                                                            variant="outlined"
                                                            color={req.status === 'ACCEPTED' ? 'success' : 'default'}
                                                        />
                                                    )}
                                                </ListItem>
                                            </Paper>
                                        ))}
                                    </List>
                                )}
                            </Paper>
                        </Grid>
                    </Grid>

                    {/* Ride History Section */}
                    {(completedRides.length > 0 || completedRequests.length > 0) && (
                        <Box sx={{ mt: 6 }}>
                            <Typography variant="h5" className="font-bold" sx={{ mb: 3 }}>Ride History</Typography>
                            <Grid container spacing={4}>
                                {completedRides.length > 0 && (
                                    <Grid size={{ xs: 12, md: 6 }}>
                                        <Paper sx={{ p: 4, borderRadius: 6, border: '1px solid #eee', bgcolor: 'rgba(0,0,0,0.01)' }}>
                                            <Typography variant="subtitle1" className="font-bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <DirectionsCar color="primary" /> Completed Offers
                                            </Typography>
                                            <Divider sx={{ mb: 2 }} />
                                            <Stack spacing={2}>
                                                {completedRides.map(ride => (
                                                    <Paper key={ride.id} variant="outlined" sx={{ p: 2, borderRadius: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'white' }}>
                                                        <Box>
                                                            <Typography variant="body2" className="font-bold">{ride.pickupLocationName} → {ride.dropoffLocationName}</Typography>
                                                            <Typography variant="caption" color="text.secondary">{new Date(ride.departureTime).toLocaleDateString()} • {ride.vehicleType}</Typography>
                                                        </Box>
                                                        <Chip label="Completed" size="small" color="success" variant="outlined" />
                                                    </Paper>
                                                ))}
                                            </Stack>
                                        </Paper>
                                    </Grid>
                                )}
                                {completedRequests.length > 0 && (
                                    <Grid size={{ xs: 12, md: 6 }}>
                                        <Paper sx={{ p: 4, borderRadius: 6, border: '1px solid #eee', bgcolor: 'rgba(0,0,0,0.01)' }}>
                                            <Typography variant="subtitle1" className="font-bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <DirectionsCar color="secondary" /> Completed Journeys
                                            </Typography>
                                            <Divider sx={{ mb: 2 }} />
                                            <Stack spacing={2}>
                                                {completedRequests.map(req => (
                                                    <Paper key={req.id} variant="outlined" sx={{ p: 2, borderRadius: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'white' }}>
                                                        <Box>
                                                            <Typography variant="body2" className="font-bold">With {req.ride?.rider?.name || 'Unknown'}</Typography>
                                                            <Typography variant="caption" color="text.secondary">{req.ride?.pickupLocationName || 'Unknown'} → {req.ride?.dropoffLocationName || 'Unknown'}</Typography>
                                                        </Box>
                                                        <Chip label="Travelled" size="small" color="info" variant="outlined" />
                                                    </Paper>
                                                ))}
                                            </Stack>
                                        </Paper>
                                    </Grid>
                                )}
                            </Grid>
                        </Box>
                    )}

                    {/* Routines Section */}
                    {myRoutines.length > 0 && (
                        <Grid container spacing={4} sx={{ mt: 4 }}>
                            <Grid size={12}>
                                <Paper sx={{
                                    p: 4, borderRadius: 6, boxShadow: '0 10px 30px rgba(0,0,0,0.03)',
                                    border: '1px solid #eee', bgcolor: 'rgba(25, 118, 210, 0.02)'
                                }}>
                                    <Typography variant="h6" className="font-bold" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Repeat color="primary" /> My Daily Commute Routine
                                    </Typography>
                                    <Divider sx={{ mb: 2 }} />
                                    <Grid container spacing={2}>
                                        {myRoutines.map(routine => (
                                            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={routine.id}>
                                                <Paper elevation={0} sx={{
                                                    p: 2, borderRadius: 4, bgcolor: 'white',
                                                    border: '1px solid #eee', display: 'flex', alignItems: 'center',
                                                    justifyContent: 'space-between'
                                                }}>
                                                    <Box>
                                                        <Typography className="font-bold">Mon - Fri</Typography>
                                                        <Typography variant="body2" color="text.secondary">
                                                            {routine.departureTime} • {routine.route?.name || 'Saved Route'}
                                                        </Typography>
                                                    </Box>
                                                    <IconButton color="error" onClick={() => handleDeleteRoutine(routine.id)}>
                                                        <Delete fontSize="small" />
                                                    </IconButton>
                                                </Paper>
                                            </Grid>
                                        ))}
                                    </Grid>
                                </Paper>
                            </Grid>
                        </Grid>
                    )}
                </Box>
            </Fade>
        </Container >
    )
}

const oneTimeFormat = (isoString) => {
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default DashboardPage
