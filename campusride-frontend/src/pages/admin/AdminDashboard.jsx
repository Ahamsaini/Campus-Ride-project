import { useState, useEffect, useMemo } from 'react'
import {
    Container, Paper, Typography, Box, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Button, Chip, Alert, Tabs, Tab,
    Card, CardContent, Grid2 as Grid, List, ListItem, ListItemText, ListItemSecondaryAction, Divider, TextField,
    Avatar, IconButton, Tooltip, Fade, Zoom, Dialog, DialogTitle, DialogContent, DialogActions, useMediaQuery, useTheme,
    Stack, Snackbar, Alert as MuiAlert
} from '@mui/material';
import {
    Check, Block, Security, GpsFixed, Warning, History, PinDrop,
    People, DirectionsCar, NotificationsActive, Dashboard, FilterList, Visibility,
    Close, Room, AccessTime, Search
} from '@mui/icons-material';
import axios from '../../api/axiosInstance';
import CampusMap, { StartIcon, EndIcon, PickupIcon, RiderLiveIcon } from '../../components/map/CampusMap';
import wsService from '../../utils/websocketService';
import L from 'leaflet';

const StatCard = ({ title, value, icon, color }) => (
    <Card sx={{
        borderRadius: 4,
        background: `rgba(255, 255, 255, 0.9)`,
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        height: '100%'
    }}>
        <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                    <Typography color="text.secondary" variant="overline" className="font-bold">
                        {title}
                    </Typography>
                    <Typography variant="h4" className="font-bold" sx={{ mt: 1 }}>
                        {value}
                    </Typography>
                </Box>
                <Avatar sx={{ bgcolor: `${color}.light`, color: `${color}.main`, width: 56, height: 56 }}>
                    {icon}
                </Avatar>
            </Box>
        </CardContent>
    </Card>
)

const AdminDashboard = () => {
    const [tab, setTab] = useState(0)
    const [pendingUsers, setPendingUsers] = useState([])
    const [activeRides, setActiveRides] = useState([])
    const [emergencyAlerts, setEmergencyAlerts] = useState([])
    const [selectedEmergency, setSelectedEmergency] = useState(null)
    const [emergencyLocation, setEmergencyLocation] = useState(null)
    const [tripHistory, setTripHistory] = useState([])
    const [filterDate, setFilterDate] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [error, setError] = useState(null)
    const [adminLocation, setAdminLocation] = useState(null)
    const [showSOSPopup, setShowSOSPopup] = useState(false)
    const [latestAlert, setLatestAlert] = useState(null)
    const [rideHistory, setRideHistory] = useState([])
    const [selectedHistoryRide, setSelectedHistoryRide] = useState(null)
    const [allUsers, setAllUsers] = useState([])
    const [allReports, setAllReports] = useState([])
    const [isUpdating, setIsUpdating] = useState(false)
    const [heatmapData, setHeatmapData] = useState([])
    const [hasEmergencyCentered, setHasEmergencyCentered] = useState(false) // New state for zoom management
    const theme = useTheme()
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

    // Stable audio object
    const sirenAudio = useMemo(() => {
        const a = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        a.loop = true;
        return a;
    }, []);

    const fetchData = async () => {
        try {
            const [usersRes, ridesRes, allUsersRes, reportsRes] = await Promise.all([
                axios.get('/admin/pending-verifications'),
                axios.get('/admin/active-rides'),
                axios.get('/admin/users'),
                axios.get('/admin/reports')
            ])
            setPendingUsers(usersRes.data)
            setActiveRides(ridesRes.data)
            setAllUsers(allUsersRes.data)
            setAllReports(reportsRes.data)
        } catch (err) {
            setError('Failed to fetch admin data')
        }
    }

    const fetchHistory = async () => {
        try {
            const params = { name: searchTerm }
            if (filterDate) {
                const [year, month, day] = filterDate.split('-').map(Number)
                params.year = year
                params.month = month
                params.day = day
            }
            const res = await axios.get('/admin/trip-history', { params })
            setTripHistory(res.data)
        } catch (err) {
            console.error('History fetch failed', err)
        }
    }

    const fetchRideHistory = async () => {
        try {
            const params = { name: searchTerm }
            if (filterDate) {
                const [year, month, day] = filterDate.split('-').map(Number)
                params.year = year
                params.month = month
                params.day = day
            }
            const res = await axios.get('/admin/rides-history', { params })
            setRideHistory(res.data)
        } catch (err) {
            console.error('Ride history fetch failed', err)
        }
    }

    const fetchHeatmap = async () => {
        try {
            const res = await axios.get('/admin/search-heatmap');
            const parsed = res.data.map(([point, count]) => {
                const coords = point.match(/POINT\((.+) (.+)\)/);
                if (coords) return [parseFloat(coords[2]), parseFloat(coords[1]), count];
                return null;
            }).filter(x => x);
            setHeatmapData(parsed);
        } catch (err) {
            console.error('Heatmap fetch error', err);
        }
    };

    useEffect(() => {
        fetchData()
        fetchHistory()
        fetchRideHistory()
        fetchHeatmap()

        // Get Admin Location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setAdminLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                (err) => console.error("Admin location blocked", err)
            )
        }

        wsService.connect(() => {
            wsService.subscribe('/topic/admin/sos', (data) => {
                setEmergencyAlerts(prev => [data, ...prev])
                setLatestAlert(data)
                setShowSOSPopup(true)
                sirenAudio.play().catch(e => console.log("Audio play failed", e))
            })

            wsService.subscribe('/topic/admin/sos/resolved', (data) => {
                setEmergencyAlerts(prev => {
                    const filtered = prev.filter(alert => alert.tripId !== data.tripId);
                    if (filtered.length === 0) stopAlarm();
                    return filtered;
                });
                setSelectedEmergency(prevSelected => {
                    if (prevSelected?.tripId === data.tripId) {
                        setEmergencyLocation(null);
                        setHasEmergencyCentered(false);
                        return null;
                    }
                    return prevSelected;
                });
            })

            wsService.subscribe('/topic/admin/reports', (data) => {
                setAllReports(prev => [data, ...prev])
                fetchData()
            })
        })

        return () => {
            wsService.disconnect()
            sirenAudio.pause()
        }
    }, [sirenAudio])

    useEffect(() => {
        fetchHistory()
        fetchRideHistory()
    }, [filterDate, searchTerm])

    useEffect(() => {
        const handleSOSUpdate = async () => {
            if (selectedEmergency) {
                try {
                    const res = await axios.get(`/admin/ride-location/${selectedEmergency.tripId}`)
                    if (res.data) {
                        const loc = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
                        setEmergencyLocation({ lat: loc.lat, lng: loc.lng })
                    }
                } catch (err) {
                    console.error('Failed to get emergency location initially', err)
                }

                wsService.subscribe(`/topic/ride/${selectedEmergency.tripId}`, (data) => {
                    setEmergencyLocation({ lat: data.lat, lng: data.lng })
                })
            }
        }
        handleSOSUpdate()
    }, [selectedEmergency])

    const handleVerify = async (userId) => {
        await axios.put(`/admin/verify/${userId}`)
        fetchData()
    }

    const handleBlock = async (userId) => {
        if (!window.confirm("Permanent BAN this student? They will not be able to use the app.")) return
        await axios.put(`/admin/block/${userId}`)
        fetchData()
    }

    const handleUnblock = async (userId) => {
        if (!window.confirm("Lift BAN for this student?")) return
        await axios.put(`/admin/unblock/${userId}`)
        fetchData()
    }

    const handleAdjustScore = async (userId, newScore) => {
        try {
            await axios.put(`/admin/users/${userId}/trust-score`, { trustScore: newScore })
            fetchData()
        } catch (err) {
            console.error("Score update failed", err)
        }
    }

    const handleResolveEmergency = async (tripId) => {
        if (window.confirm("Mark this emergency as successfully RESOLVED? Security will be notified.")) {
            try {
                await axios.post(`/trip/sos/${tripId}/resolve`)
            } catch (err) {
                console.error("Failed to resolve emergency", err)
            }
        }
    }

    const rideMarkers = activeRides.map(r => ({
        id: `active-ride-${r.id}`, // Stable ID for smooth updates
        position: [r.startLat, r.startLng],
        popup: `Active Ride: ${r.rider?.name || 'Unknown'}`
    }))

    const emergencyMarkers = [];
    if (emergencyLocation) {
        emergencyMarkers.push({
            id: `sos-${selectedEmergency?.tripId}`, // Stable ID
            position: [emergencyLocation.lat, emergencyLocation.lng],
            icon: L.divIcon({
                html: `<div style="background-color: #d32f2f; width: 24px; height: 24px; border-radius: 50%; border: 4px solid white; box-shadow: 0 0 20px #f44336; animation: pulse-red 1s infinite;"></div>`,
                className: 'custom-div-icon',
                iconSize: [30, 30],
                iconAnchor: [15, 15],
            }),
            popup: `🚨 SOS: ${selectedEmergency?.riderName || 'Unknown'}`
        });
    }

    if (adminLocation) {
        emergencyMarkers.push({
            position: [adminLocation.lat, adminLocation.lng],
            icon: L.divIcon({
                html: `<div style="background-color: #1976d2; width: 20px; height: 20px; border-radius: 4px; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3);"></div>`,
                className: 'custom-div-icon',
                iconSize: [24, 24],
                iconAnchor: [12, 12],
            }),
            popup: "Admin Location (You)"
        });
    }

    const routeToEmergency = (adminLocation && emergencyLocation) ? [
        [adminLocation.lat, adminLocation.lng],
        [emergencyLocation.lat, emergencyLocation.lng]
    ] : null;

    const stopAlarm = () => {
        sirenAudio.pause();
        sirenAudio.currentTime = 0;
        setShowSOSPopup(false);
    };

    const handleForceEnd = async (rideId) => {
        if (window.confirm("FORCE END this trip? This will stop tracking for all participants.")) {
            try {
                await axios.put(`/admin/force-end/${rideId}`)
                fetchData()
            } catch (err) {
                console.error("Failed to end ride", err)
            }
        }
    }

    return (
        <Container maxWidth="xl" sx={{ mt: { xs: 2, md: 4 }, pb: { xs: 12, md: 8 }, px: { xs: 1, sm: 3 } }}>
            <Snackbar
                open={showSOSPopup}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <MuiAlert
                    onClose={stopAlarm}
                    severity="error"
                    variant="filled"
                    sx={{
                        width: '100%',
                        borderRadius: 4,
                        boxShadow: 20,
                        animation: 'shake 0.5s infinite',
                        border: '2px solid white',
                        '& .MuiAlert-message': { fontSize: '1.2rem', fontWeight: 'bold' }
                    }}
                    action={
                        <Button color="inherit" size="small" onClick={() => { setTab(2); stopAlarm(); }}>
                            VIEW ON MAP
                        </Button>
                    }
                >
                    🚨 EMERGENCY SOS TRIGGERED BY {latestAlert?.riderName?.toUpperCase()}
                </MuiAlert>
            </Snackbar>

            {/* Header Section */}
            <Box sx={{
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                justifyContent: 'space-between',
                alignItems: { xs: 'flex-start', md: 'center' },
                mb: 4,
                gap: 2
            }}>
                <Box>
                    <Typography variant={isMobile ? "h4" : "h3"} className="font-bold text-gray-900" sx={{ mb: 1 }}>
                        Command Center
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        University Transportation Management & Safety Oversight
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2, width: { xs: '100%', md: 'auto' }, justifyContent: { xs: 'space-between', md: 'flex-end' } }}>
                    <Chip
                        icon={<NotificationsActive />}
                        label={`${emergencyAlerts.length} Critical Alerts`}
                        color={emergencyAlerts.length > 0 ? "error" : "default"}
                        variant={emergencyAlerts.length > 0 ? "filled" : "outlined"}
                        onClick={() => setTab(2)}
                        sx={{ height: 40, px: 2, fontWeight: 'bold' }}
                    />
                </Box>
            </Box>

            {/* KPI Section */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <StatCard
                        title="Active Rides"
                        value={activeRides.length}
                        icon={<DirectionsCar />}
                        color="primary"
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <StatCard
                        title="Pending Verification"
                        value={pendingUsers.length}
                        icon={<People />}
                        color="warning"
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <StatCard
                        title="SOS Requests"
                        value={emergencyAlerts.length}
                        icon={<Security />}
                        color="error"
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <StatCard
                        title="Trips Today"
                        value={tripHistory.length}
                        icon={<Dashboard />}
                        color="info"
                    />
                </Grid>
            </Grid>

            {/* Main Content Area */}
            <Paper
                elevation={0}
                sx={{
                    borderRadius: 6,
                    overflow: 'hidden',
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.4)',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.05)'
                }}
            >
                <Box sx={{ p: 1, bgcolor: 'rgba(255, 255, 255, 0.5)' }}>
                    <Tabs
                        value={tab}
                        onChange={(e, v) => setTab(v)}
                        variant="scrollable"
                        scrollButtons="auto"
                        sx={{
                            '& .MuiTabs-indicator': { height: 4, borderRadius: '4px 4px 0 0' },
                            '& .MuiTab-root': { py: 3, px: 4, fontWeight: 'bold', fontSize: '0.95rem' }
                        }}
                    >
                        <Tab label="Verification Hub" />
                        <Tab label="Live Monitoring" />
                        <Tab label="Emergency SOS" icon={emergencyAlerts.length > 0 ? <Warning sx={{ color: 'error.main' }} /> : null} iconPosition="end" />
                        <Tab label="Trip Archives" />
                        <Tab label="Trust & Safety" icon={<Security sx={{ fontSize: '1rem', mr: 1 }} />} iconPosition="start" />
                        <Tab label="Demand Analytics" />
                    </Tabs>
                </Box>

                <Box sx={{ p: { xs: 2, md: 4 } }}>
                    {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>{error}</Alert>}

                    {/* Verification Hub */}
                    {tab === 0 && (
                        <Fade in={tab === 0}>
                            <Box>
                                <Typography variant="h6" className="font-bold" sx={{ mb: 3 }}>Pending Student Verifications</Typography>
                                {isMobile ? (
                                    <Stack spacing={2}>
                                        {pendingUsers.map((user) => (
                                            <Card key={user.id} sx={{ borderRadius: 4, border: '1px solid #eee' }}>
                                                <CardContent>
                                                    <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                                                        <Avatar sx={{ bgcolor: 'primary.main' }}>{user.name[0]}</Avatar>
                                                        <Box sx={{ flexGrow: 1 }}>
                                                            <Typography variant="subtitle1" className="font-bold">{user.name}</Typography>
                                                            <Typography variant="caption" color="text.secondary">{user.email}</Typography>
                                                        </Box>
                                                    </Stack>
                                                    <Divider sx={{ mb: 2 }} />
                                                    <Grid container spacing={2} sx={{ mb: 2 }}>
                                                        <Grid size={6}>
                                                            <Typography variant="caption" color="text.secondary">Department</Typography>
                                                            <Typography variant="body2">{user.department}</Typography>
                                                        </Grid>
                                                        <Grid size={4}>
                                                            <Typography variant="caption" color="text.secondary">Course</Typography>
                                                            <Typography variant="body2">{user.course}</Typography>
                                                        </Grid>
                                                        <Grid size={2}>
                                                            <Typography variant="caption" color="text.secondary">Year</Typography>
                                                            <Typography variant="body2">{user.year}</Typography>
                                                        </Grid>
                                                    </Grid>
                                                    <Stack direction="row" spacing={2} justifyContent="stretch">
                                                        <Button 
                                                            fullWidth 
                                                            variant="contained" 
                                                            color="success" 
                                                            startIcon={<Check />} 
                                                            onClick={() => handleVerify(user.id)}
                                                            sx={{ borderRadius: 3 }}
                                                        >
                                                            Approve
                                                        </Button>
                                                        <Button 
                                                            fullWidth 
                                                            variant="outlined" 
                                                            color="error" 
                                                            startIcon={<Block />} 
                                                            onClick={() => handleBlock(user.id)}
                                                            sx={{ borderRadius: 3 }}
                                                        >
                                                            Block
                                                        </Button>
                                                    </Stack>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </Stack>
                                ) : (
                                    <TableContainer sx={{ borderRadius: 4, border: '1px solid #eee' }}>
                                        <Table>
                                            <TableHead sx={{ bgcolor: '#fafafa' }}>
                                                <TableRow>
                                                    <TableCell className="font-bold">Student Profile</TableCell>
                                                    <TableCell className="font-bold">Department</TableCell>
                                                    <TableCell className="font-bold">Course</TableCell>
                                                    <TableCell className="font-bold">Year</TableCell>
                                                    <TableCell align="right" className="font-bold">Actions</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {pendingUsers.map((user) => (
                                                    <TableRow key={user.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                                        <TableCell>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                                <Avatar sx={{ bgcolor: 'primary.main' }}>{user.name[0]}</Avatar>
                                                                <Box>
                                                                    <Typography variant="body1" className="font-bold">{user.name}</Typography>
                                                                    <Typography variant="caption" color="text.secondary">{user.email}</Typography>
                                                                </Box>
                                                            </Box>
                                                        </TableCell>
                                                        <TableCell>{user.department}</TableCell>
                                                        <TableCell>{user.course}</TableCell>
                                                        <TableCell><Chip label={user.year} size="small" variant="outlined" /></TableCell>
                                                        <TableCell align="right">
                                                            <Tooltip title="Approve Student">
                                                                <IconButton color="success" onClick={() => handleVerify(user.id)} sx={{ mr: 1, bgcolor: 'success.light', '&:hover': { bgcolor: 'success.main', color: 'white' } }}>
                                                                    <Check fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                            <Tooltip title="Block Account">
                                                                <IconButton color="error" onClick={() => handleBlock(user.id)} sx={{ bgcolor: 'error.light', '&:hover': { bgcolor: 'error.main', color: 'white' } }}>
                                                                    <Block fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                )}
                                {pendingUsers.length === 0 && (
                                    <Box sx={{ py: 8, textAlign: 'center' }}>
                                        <Typography color="text.secondary">All students are currently verified.</Typography>
                                    </Box>
                                )}
                            </Box>
                        </Fade>
                    )}

                    {/* Monitoring Tab */}
                    {tab === 1 && (
                        <Fade in={tab === 1}>
                            <Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 3 }}>
                                    <Box>
                                        <Typography variant="h6" className="font-bold">Real-time Global Traffic</Typography>
                                        <Typography variant="body2" color="text.secondary">Monitoring {activeRides.length} active transportation sessions</Typography>
                                    </Box>
                                    <Button startIcon={<GpsFixed />} variant="outlined" size="small">Recenter Campus</Button>
                                </Box>
                                <Grid container spacing={3}>
                                    <Grid size={{ xs: 12, md: 8 }}>
                                        <Box sx={{ height: '600px', width: '100%', borderRadius: 6, overflow: 'hidden', border: '5px solid white', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
                                            <CampusMap markers={rideMarkers} style={{ height: '100%', width: '100%' }} />
                                        </Box>
                                    </Grid>
                                    <Grid size={{ xs: 12, md: 4 }}>
                                        <Typography variant="subtitle1" className="font-bold" sx={{ mb: 2 }}>Current Active Trips</Typography>
                                        <List sx={{ height: '600px', overflowY: 'auto', bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 4, p: 2 }}>
                                            {activeRides.map((r) => (
                                                <Card key={r.id} sx={{ mb: 2, borderRadius: 3 }}>
                                                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <Box>
                                                                <Typography variant="body2" className="font-bold">{r.rider?.name || 'Unknown Rider'}</Typography>
                                                                <Typography variant="caption" color="text.secondary">Ride ID: ...{r.id.substring(0, 8)}</Typography>
                                                            </Box>
                                                            <Button
                                                                size="small"
                                                                color="error"
                                                                variant="outlined"
                                                                onClick={() => handleForceEnd(r.id)}
                                                                sx={{ borderRadius: 2, fontSize: '0.7rem' }}
                                                            >
                                                                End Trip
                                                            </Button>
                                                        </Box>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                            {activeRides.length === 0 && (
                                                <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 4 }}>No active rides at the moment.</Typography>
                                            )}
                                        </List>
                                    </Grid>
                                </Grid>
                            </Box>
                        </Fade>
                    )}

                    {/* Emergency Tab */}
                    {tab === 2 && (
                        <Fade in={tab === 2}>
                            <Grid container spacing={4}>
                                <Grid size={{ xs: 12, md: 4 }}>
                                    <Typography variant="h6" color="error" className="font-bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Security /> Active SOS Feed
                                    </Typography>
                                    <List sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        {emergencyAlerts.map((alert, idx) => (
                                            <Zoom in style={{ transitionDelay: `${idx * 100}ms` }} key={idx}>
                                                <Card
                                                    onClick={() => {
                                                        setSelectedEmergency(alert);
                                                        setHasEmergencyCentered(false); // Reset to allow one-time auto-zoom
                                                    }}
                                                    sx={{
                                                        cursor: 'pointer',
                                                        borderRadius: 4,
                                                        border: selectedEmergency?.tripId === alert.tripId ? '2px solid' : '1px solid',
                                                        borderColor: selectedEmergency?.tripId === alert.tripId ? 'error.main' : 'error.light',
                                                        bgcolor: selectedEmergency?.tripId === alert.tripId ? 'error.light' : 'white',
                                                        transition: '0.2s',
                                                        '&:hover': { transform: 'scale(1.02)' }
                                                    }}
                                                >
                                                    <CardContent>
                                                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                                            <Avatar sx={{ bgcolor: 'error.main', width: 48, height: 48 }}>
                                                                <Warning />
                                                            </Avatar>
                                                            <Box sx={{ flex: 1 }}>
                                                                <Typography variant="body1" className="font-bold">{alert.riderName}</Typography>
                                                                <Typography variant="caption" color="error" className="font-bold uppercase tracking-wider">High Priority</Typography>
                                                            </Box>
                                                            <Typography variant="caption" color="text.secondary">
                                                                {new Date(alert.timestamp).toLocaleTimeString()}
                                                            </Typography>
                                                        </Box>
                                                    </CardContent>
                                                </Card>
                                            </Zoom>
                                        ))}
                                        {emergencyAlerts.length === 0 && (
                                            <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 4, bgcolor: 'rgba(0,0,0,0.02)', border: '1px dashed #ccc' }}>
                                                <Security sx={{ fontSize: 40, color: '#ccc', mb: 1 }} />
                                                <Typography color="text.secondary">No active emergency alerts detected.</Typography>
                                            </Paper>
                                        )}
                                    </List>
                                </Grid>
                                <Grid size={{ xs: 12, md: 8 }}>
                                    <Box sx={{ height: '650px', position: 'relative' }}>
                                        <Paper sx={{ height: '100%', borderRadius: 6, overflow: 'hidden', border: '8px solid white', boxShadow: 3 }}>
                                            <CampusMap
                                                markers={emergencyMarkers}
                                                polyline={routeToEmergency}
                                                center={emergencyLocation ? [emergencyLocation.lat, emergencyLocation.lng] : undefined}
                                                zoom={hasEmergencyCentered ? undefined : (emergencyLocation ? 18 : 14)}
                                                onMapClick={() => setHasEmergencyCentered(true)}
                                                onZoom={() => setHasEmergencyCentered(true)}
                                                style={{ height: '100%', width: '100%' }}
                                            />
                                        </Paper>
                                        {selectedEmergency && (
                                            <Card sx={{ position: 'absolute', bottom: 24, left: 24, right: 24, zIndex: 1000, borderRadius: 4, bgcolor: 'rgba(255,255,255,1)', borderLeft: '8px solid #d32f2f' }}>
                                                <CardContent>
                                                    <Grid container spacing={2} alignItems="flex-start">
                                                        <Grid size={{ xs: 12, sm: 8 }}>
                                                            <Typography variant="h6" className="font-bold">Tracking: {selectedEmergency.riderName}</Typography>
                                                            <Typography variant="body2" color="text.secondary">
                                                                Passenger: {selectedEmergency.passengerName || 'N/A'} • Last Sync: {new Date().toLocaleTimeString()}
                                                            </Typography>

                                                            {selectedEmergency.nearbyRides && selectedEmergency.nearbyRides.length > 0 && (
                                                                <Box sx={{ mt: 2, p: 1.5, bgcolor: '#f0f7ff', borderRadius: 2, border: '1px solid #1976d2' }}>
                                                                    <Typography variant="caption" className="font-bold" color="primary.main">
                                                                        🚗 NEARBY ACTIVE RIDES (WITHIN 5KM)
                                                                    </Typography>
                                                                    <List dense disablePadding sx={{ mt: 1 }}>
                                                                        {selectedEmergency.nearbyRides.map(nr => (
                                                                            <ListItem key={nr.rideId} disableGutters disablePadding sx={{ py: 0.5 }}>
                                                                                <Typography variant="body2">• {nr.riderName} ({nr.vehicle})</Typography>
                                                                            </ListItem>
                                                                        ))}
                                                                    </List>
                                                                </Box>
                                                            )}
                                                        </Grid>
                                                        <Grid size={{ xs: 12, sm: 4 }} sx={{ display: 'flex', flexDirection: 'column', gap: 1, textAlign: 'right' }}>
                                                            <Button startIcon={<PinDrop />} variant="contained" color="error" onClick={() => window.open(`https://www.google.com/maps?q=${emergencyLocation?.lat},${emergencyLocation?.lng}`, '_blank')}>
                                                                Open Maps
                                                            </Button>
                                                            <Button
                                                                variant="outlined"
                                                                color="success"
                                                                size="small"
                                                                onClick={() => handleResolveEmergency(selectedEmergency.tripId)}
                                                                sx={{ fontWeight: 'bold' }}
                                                            >
                                                                MARK RESOLVED
                                                            </Button>
                                                        </Grid>
                                                    </Grid>
                                                </CardContent>
                                            </Card>
                                        )}
                                    </Box>
                                </Grid>
                            </Grid>
                        </Fade>
                    )}

                    {/* Archives Tab */}
                    {tab === 3 && (
                        <Fade in={tab === 3}>
                            <Box sx={{ pb: 8 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                                    <Box>
                                        <Typography variant="h5" sx={{ fontWeight: 900, color: 'primary.main' }}>Security Archive Repository</Typography>
                                        <Typography variant="body2" color="text.secondary">Access validated historical trip data and map traces</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                        <TextField
                                            placeholder="Search student name..."
                                            size="small"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            sx={{ width: 250, '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: 'white' } }}
                                            slotProps={{
                                                input: {
                                                    startAdornment: <Search color="action" sx={{ mr: 1 }} />
                                                }
                                            }}
                                        />
                                        <FilterList color="action" />
                                        <TextField
                                            type="date"
                                            value={filterDate}
                                            onChange={(e) => setFilterDate(e.target.value)}
                                            size="small"
                                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: 'white' } }}
                                        />
                                    </Box>
                                </Box>

                                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 800 }}>Consolidated Ride History (Grouped View)</Typography>
                                {isMobile ? (
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 4 }}>
                                        {rideHistory.map(ride => (
                                            <Card key={ride.rideId} className="glass-card clickable-card" sx={{ borderRadius: 6 }}>
                                                <CardContent>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                                        <Chip
                                                            label={ride.status}
                                                            size="small"
                                                            color={ride.status === 'COMPLETED' ? 'success' : 'primary'}
                                                            sx={{ fontWeight: 'bold' }}
                                                        />
                                                        <Typography variant="caption" color="text.secondary">
                                                            {new Date(ride.startTime).toLocaleDateString()}
                                                        </Typography>
                                                    </Box>
                                                    <Typography variant="subtitle1" fontWeight="bold">{ride.riderName}</Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {ride.passengerNames.length} Passengers • {ride.passengerNames.join(', ')}
                                                    </Typography>
                                                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                                                        <Button
                                                            variant="contained"
                                                            size="small"
                                                            onClick={() => setSelectedHistoryRide(ride)}
                                                            startIcon={<Visibility />}
                                                            sx={{ borderRadius: 3 }}
                                                        >
                                                            Audit Route
                                                        </Button>
                                                    </Box>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </Box>
                                ) : (
                                    <TableContainer sx={{ borderRadius: 6, border: '1px solid #eee', mb: 6 }}>
                                        <Table>
                                            <TableHead sx={{ bgcolor: '#f8fafc' }}>
                                                <TableRow>
                                                    <TableCell className="font-bold">Rider</TableCell>
                                                    <TableCell className="font-bold">Passengers</TableCell>
                                                    <TableCell className="font-bold">Date & Time</TableCell>
                                                    <TableCell className="font-bold">Status</TableCell>
                                                    <TableCell align="right" className="font-bold">Route Audit</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {rideHistory.map((ride) => (
                                                    <TableRow key={ride.rideId} hover>
                                                        <TableCell sx={{ py: 2 }}>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                <Avatar sx={{ width: 32, height: 32, fontSize: '0.8rem' }}>{ride.riderName[0]}</Avatar>
                                                                <Typography variant="body2" className="font-bold">{ride.riderName}</Typography>
                                                            </Box>
                                                        </TableCell>
                                                        <TableCell>{ride.passengerNames.join(', ') || 'Solo Trip'}</TableCell>
                                                        <TableCell>{new Date(ride.startTime).toLocaleString()}</TableCell>
                                                        <TableCell>
                                                            <Chip label={ride.status} size="small" variant="outlined" color={ride.status === 'COMPLETED' ? 'success' : 'default'} />
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <Button
                                                                size="small"
                                                                variant="contained"
                                                                startIcon={<Visibility />}
                                                                onClick={() => setSelectedHistoryRide(ride)}
                                                                sx={{ borderRadius: 4 }}
                                                            >
                                                                Audit Route
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                                {rideHistory.length === 0 && (
                                                    <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4 }}>No ride logs found</TableCell></TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                )}

                                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 800, mt: 4 }}>Full Student Trip Archive (Rider & Passenger Interactivity)</Typography>
                                {isMobile ? (
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        {tripHistory.map(trip => (
                                            <Card key={trip.sessionId} elevation={0} sx={{ borderRadius: 6, border: '1px solid #eee' }}>
                                                <CardContent>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                                        <Avatar sx={{ bgcolor: 'primary.light' }}>{trip.riderName[0]}</Avatar>
                                                        <Box>
                                                            <Typography variant="subtitle2" fontWeight="bold">{trip.riderName}</Typography>
                                                            <Typography variant="caption" color="text.secondary">Driver</Typography>
                                                        </Box>
                                                    </Box>
                                                    <Divider sx={{ my: 1 }} />
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                                                        <Avatar sx={{ bgcolor: 'secondary.light' }}>{trip.passengerName[0]}</Avatar>
                                                        <Box>
                                                            <Typography variant="subtitle2" fontWeight="bold">{trip.passengerName}</Typography>
                                                            <Typography variant="caption" color="text.secondary">Passenger</Typography>
                                                        </Box>
                                                    </Box>
                                                    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <Chip label={trip.status} size="small" color={trip.status === 'COMPLETED' ? 'success' : 'warning'} />
                                                        <IconButton onClick={() => window.open(`https://www.google.com/maps?q=${trip.pickupLat},${trip.pickupLng}`, '_blank')}>
                                                            <PinDrop color="primary" />
                                                        </IconButton>
                                                    </Box>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </Box>
                                ) : (
                                    <TableContainer sx={{ borderRadius: 6, border: '1px solid #eee' }}>
                                        <Table>
                                            <TableHead sx={{ bgcolor: '#eff6ff' }}>
                                                <TableRow>
                                                    <TableCell className="font-bold">Student (Rider)</TableCell>
                                                    <TableCell className="font-bold">Student (Passenger)</TableCell>
                                                    <TableCell className="font-bold">Time Context</TableCell>
                                                    <TableCell className="font-bold">Safety Status</TableCell>
                                                    <TableCell align="right" className="font-bold">GPS Log</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {tripHistory.map((trip) => (
                                                    <TableRow key={trip.sessionId} hover>
                                                        <TableCell sx={{ py: 2 }}>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                <Avatar sx={{ width: 28, height: 28, fontSize: '0.7rem', bgcolor: 'primary.light', color: 'primary.main' }}>{trip.riderName[0]}</Avatar>
                                                                <Box>
                                                                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{trip.riderName}</Typography>
                                                                    <Typography variant="caption" color="text.secondary">{trip.riderEmail}</Typography>
                                                                </Box>
                                                            </Box>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                <Avatar sx={{ width: 28, height: 28, fontSize: '0.7rem', bgcolor: 'secondary.light', color: 'secondary.main' }}>{trip.passengerName[0]}</Avatar>
                                                                <Box>
                                                                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{trip.passengerName}</Typography>
                                                                    <Typography variant="caption" color="text.secondary">{trip.passengerEmail}</Typography>
                                                                </Box>
                                                            </Box>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography variant="body2">{new Date(trip.startedAt).toLocaleDateString()}</Typography>
                                                            <Typography variant="caption" color="text.secondary">{new Date(trip.startedAt).toLocaleTimeString()}</Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Chip
                                                                label={trip.status}
                                                                size="small"
                                                                variant="filled"
                                                                color={trip.status === 'COMPLETED' ? 'success' : (trip.status === 'EMERGENCY' ? 'error' : 'warning')}
                                                                sx={{ fontWeight: 800, fontSize: '0.65rem' }}
                                                            />
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => window.open(`https://www.google.com/maps?q=${trip.pickupLat},${trip.pickupLng}`, '_blank')}
                                                                sx={{ bgcolor: 'primary.light', '&:hover': { bgcolor: 'primary.main', color: 'white' } }}
                                                            >
                                                                <PinDrop sx={{ fontSize: '1.2rem' }} />
                                                            </IconButton>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                                {tripHistory.length === 0 && (
                                                    <TableRow><TableCell colSpan={5} align="center" sx={{ py: 6 }}>No student trip logs found for these filters</TableCell></TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                )}
                            </Box>
                        </Fade>
                    )}

                    {/* Trust & Safety Tab */}
                    {tab === 4 && (
                        <Fade in={tab === 4}>
                            <Box sx={{ pb: 8 }}>
                                <Grid container spacing={4}>
                                    <Grid size={{ xs: 12, md: 7 }}>
                                        <Typography variant="h6" className="font-bold" sx={{ mb: 3 }}>User Trust Database</Typography>
                                        {isMobile ? (
                                            <Stack spacing={2}>
                                                {allUsers.map((u) => (
                                                    <Card key={u.id} sx={{ borderRadius: 4, border: '1px solid #eee' }}>
                                                        <CardContent>
                                                            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                                                                <Avatar sx={{ bgcolor: u.blocked ? 'error.light' : 'primary.light', color: u.blocked ? 'error.main' : 'primary.main' }}>
                                                                    {u.name[0]}
                                                                </Avatar>
                                                                <Box sx={{ flexGrow: 1 }}>
                                                                    <Typography variant="subtitle1" fontWeight="bold">{u.name}</Typography>
                                                                    <Typography variant="caption" color="text.secondary">{u.email}</Typography>
                                                                </Box>
                                                                <Chip
                                                                    label={u.trustScore}
                                                                    color={u.trustScore < 60 ? "error" : u.trustScore < 85 ? "warning" : "success"}
                                                                    size="small"
                                                                    sx={{ fontWeight: 'bold' }}
                                                                />
                                                            </Stack>
                                                            <Stack direction="row" spacing={2} justifyContent="stretch">
                                                                <Button 
                                                                    fullWidth 
                                                                    variant="outlined" 
                                                                    size="small"
                                                                    onClick={() => {
                                                                        const val = window.prompt(`Update Trust Score for ${u.name}:`, u.trustScore);
                                                                        if (val !== null) handleAdjustScore(u.id, parseInt(val));
                                                                    }}
                                                                    sx={{ borderRadius: 3 }}
                                                                >
                                                                    Adjust Score
                                                                </Button>
                                                                {u.blocked ? (
                                                                    <Button fullWidth size="small" variant="contained" color="success" onClick={() => handleUnblock(u.id)} sx={{ borderRadius: 3 }}>
                                                                        UNBAN
                                                                    </Button>
                                                                ) : (
                                                                    <Button fullWidth size="small" variant="outlined" color="error" onClick={() => handleBlock(u.id)} sx={{ borderRadius: 3 }}>
                                                                        BAN
                                                                    </Button>
                                                                )}
                                                            </Stack>
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                            </Stack>
                                        ) : (
                                            <TableContainer sx={{ borderRadius: 4, border: '1px solid #eee' }}>
                                                <Table>
                                                    <TableHead sx={{ bgcolor: '#fafafa' }}>
                                                        <TableRow>
                                                            <TableCell className="font-bold">Student</TableCell>
                                                            <TableCell className="font-bold" align="center">Trust Score</TableCell>
                                                            <TableCell className="font-bold" align="center">Status</TableCell>
                                                            <TableCell align="right" className="font-bold">Governance</TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {allUsers.map((u) => (
                                                            <TableRow key={u.id} hover>
                                                                <TableCell>
                                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                                        <Avatar sx={{ bgcolor: u.blocked ? 'error.light' : 'primary.light', color: u.blocked ? 'error.main' : 'primary.main' }}>
                                                                            {u.name[0]}
                                                                        </Avatar>
                                                                        <Box>
                                                                            <Typography variant="body2" fontWeight="bold">{u.name}</Typography>
                                                                            <Typography variant="caption" color="text.secondary">{u.email}</Typography>
                                                                        </Box>
                                                                    </Box>
                                                                </TableCell>
                                                                <TableCell align="center">
                                                                    <Chip
                                                                        label={u.trustScore}
                                                                        color={u.trustScore < 60 ? "error" : u.trustScore < 85 ? "warning" : "success"}
                                                                        size="small"
                                                                        sx={{ fontWeight: 'bold', width: 45 }}
                                                                    />
                                                                </TableCell>
                                                                <TableCell align="center">
                                                                    <Chip
                                                                        label={u.blocked ? "BANNED" : u.verified ? "ACTIVE" : "PENDING"}
                                                                        color={u.blocked ? "error" : u.verified ? "success" : "default"}
                                                                        variant="outlined"
                                                                        size="small"
                                                                        sx={{ fontSize: '0.7rem', fontWeight: 900 }}
                                                                    />
                                                                </TableCell>
                                                                <TableCell align="right">
                                                                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                                        <Tooltip title="Adjust Points">
                                                                            <IconButton size="small" onClick={() => {
                                                                                const val = window.prompt(`Update Trust Score for ${u.name}:`, u.trustScore);
                                                                                if (val !== null) handleAdjustScore(u.id, parseInt(val));
                                                                            }}>
                                                                                <Dashboard fontSize="small" />
                                                                            </IconButton>
                                                                        </Tooltip>
                                                                        {u.blocked ? (
                                                                            <Button size="small" variant="contained" color="success" onClick={() => handleUnblock(u.id)} sx={{ borderRadius: 2 }}>
                                                                                UNBAN
                                                                            </Button>
                                                                        ) : (
                                                                            <Button size="small" variant="outlined" color="error" onClick={() => handleBlock(u.id)} sx={{ borderRadius: 2 }}>
                                                                                BAN
                                                                            </Button>
                                                                        )}
                                                                    </Stack>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </TableContainer>
                                        )}
                                    </Grid>

                                    <Grid size={{ xs: 12, md: 5 }}>
                                        <Typography variant="h6" className="font-bold" sx={{ mb: 3 }}>Incident & Feedback Log</Typography>
                                        <List sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                            {allReports.map((report, idx) => (
                                                <Card key={idx} sx={{
                                                    borderRadius: 4,
                                                    borderLeft: `6px solid ${report.pointImpact < 0 ? '#f44336' : '#4caf50'}`,
                                                    bgcolor: report.pointImpact < 0 ? '#fff8f8' : '#f8fff8'
                                                }}>
                                                    <CardContent sx={{ p: 2 }}>
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                            <Typography variant="caption" color="text.secondary" fontWeight="bold">
                                                                {new Date(report.createdAt).toLocaleString()}
                                                            </Typography>
                                                            <Chip
                                                                label={report.pointImpact > 0 ? `+${report.pointImpact}` : report.pointImpact}
                                                                color={report.pointImpact > 0 ? "success" : "error"}
                                                                size="small"
                                                                sx={{ fontWeight: 900, height: 20 }}
                                                            />
                                                        </Box>
                                                        <Typography variant="body2">
                                                            <strong>{report.fromUserName}</strong> rated <strong>{report.toUserName}</strong>
                                                        </Typography>
                                                        {report.reportText && (
                                                            <Paper elevation={0} sx={{ mt: 1, p: 1, bgcolor: 'rgba(0,0,0,0.03)', borderRadius: 2 }}>
                                                                <Typography variant="caption" color="error.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 'bold' }}>
                                                                    <Warning sx={{ fontSize: '0.9rem' }} /> REPORT:
                                                                </Typography>
                                                                <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                                                                    "{report.reportText}"
                                                                </Typography>
                                                            </Paper>
                                                        )}
                                                        <Typography variant="caption" sx={{ mt: 1, display: 'block', color: 'text.secondary' }}>
                                                            Ride Context: ...{report.rideId.substring(0, 8)}
                                                        </Typography>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                            {allReports.length === 0 && (
                                                <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                                                    No feedback cycles completed yet.
                                                </Typography>
                                            )}
                                        </List>
                                    </Grid>
                                </Grid>
                            </Box>
                        </Fade>
                    )}

                    {/* Demand Analytics Tab */}
                    {tab === 5 && (
                        <Fade in={tab === 5}>
                            <Box>
                                <Typography variant="h6" className="font-bold" sx={{ mb: 1 }}>Campus Ride Demand Heatmap</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                    Visualizing areas where students are searching for rides but no matches were found. Higher intensity (larger/darker circles) indicates higher unmet demand.
                                </Typography>

                                <Paper sx={{ height: 500, borderRadius: 6, overflow: 'hidden', mb: 4, position: 'relative' }}>
                                    <CampusMap
                                        center={[23.2599, 77.4126]} // Default center
                                        zoom={15}
                                    >
                                        {heatmapData.map((point, idx) => (
                                            <L.Circle
                                                key={idx}
                                                center={[point[0], point[1]]}
                                                radius={10 + (point[2] * 2)}
                                                pathOptions={{
                                                    fillColor: 'red',
                                                    color: 'red',
                                                    fillOpacity: 0.2 + (Math.min(0.6, point[2] / 10)),
                                                    weight: 1
                                                }}
                                            >
                                                <L.Tooltip>Demand Count: {point[2]} searches</L.Tooltip>
                                            </L.Circle>
                                        ))}
                                    </CampusMap>
                                </Paper>

                                <Grid container spacing={3}>
                                    <Grid size={12}>
                                        <Card sx={{ borderRadius: 4, bgcolor: 'rgba(255,0,0,0.02)', border: '1px solid rgba(255,0,0,0.1)' }}>
                                            <CardContent>
                                                <Typography variant="subtitle1" className="font-bold" sx={{ color: 'error.main' }}>
                                                    Policy Suggestion
                                                </Typography>
                                                <Typography variant="body2">
                                                    Based on the heatmap, consider incentivizing faculty or senior students who live in the high-demand zones (red clusters) to offer more rides during peak morning hours.
                                                </Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                </Grid>
                            </Box>
                        </Fade>
                    )}
                </Box>
            </Paper>

            <Dialog
                open={Boolean(selectedHistoryRide)}
                onClose={() => setSelectedHistoryRide(null)}
                maxWidth="md"
                fullWidth
                PaperProps={{ sx: { borderRadius: 6 } }}
            >
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" className="font-bold">Trip Route Audit</Typography>
                    <IconButton onClick={() => setSelectedHistoryRide(null)}><Close /></IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    {selectedHistoryRide && (
                        <Box>
                            <Grid container spacing={3} sx={{ mb: 3 }}>
                                <Grid size={4}>
                                    <Typography variant="caption" color="text.secondary">Rider</Typography>
                                    <Typography className="font-bold">{selectedHistoryRide.riderName}</Typography>
                                </Grid>
                                <Grid size={4}>
                                    <Typography variant="caption" color="text.secondary">Passengers</Typography>
                                    <Typography className="font-bold">{selectedHistoryRide.passengerNames.join(', ')}</Typography>
                                </Grid>
                                <Grid size={4}>
                                    <Typography variant="caption" color="text.secondary">Time</Typography>
                                    <Typography className="font-bold">{new Date(selectedHistoryRide.startTime).toLocaleString()}</Typography>
                                </Grid>
                            </Grid>
                            <Box sx={{ height: '400px', borderRadius: 4, overflow: 'hidden' }}>
                                <CampusMap
                                    polyline={selectedHistoryRide.routePath}
                                    markers={[
                                        { position: selectedHistoryRide.routePath[0], popup: 'Start' },
                                        { position: selectedHistoryRide.routePath[selectedHistoryRide.routePath.length - 1], popup: 'End' }
                                    ]}
                                    style={{ height: '100%', width: '100%' }}
                                />
                            </Box>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSelectedHistoryRide(null)}>Close Audit</Button>
                </DialogActions>
            </Dialog>

            <style>
                {`
                @keyframes pulse-red {
                    0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(211, 47, 47, 0.7); }
                    70% { transform: scale(1.1); box-shadow: 0 0 0 15px rgba(211, 47, 47, 0); }
                    100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(211, 47, 47, 0); }
                }
                @keyframes shake {
                    0% { transform: translate(1px, 1px) rotate(0deg); }
                    10% { transform: translate(-1px, -2px) rotate(-1deg); }
                    20% { transform: translate(-3px, 0px) rotate(1deg); }
                    30% { transform: translate(3px, 2px) rotate(0deg); }
                    40% { transform: translate(1px, -1px) rotate(1deg); }
                    50% { transform: translate(-1px, 2px) rotate(-1deg); }
                    60% { transform: translate(-3px, 1px) rotate(0deg); }
                    70% { transform: translate(3px, 1px) rotate(-1deg); }
                    80% { transform: translate(-1px, -1px) rotate(1deg); }
                    90% { transform: translate(1px, 2px) rotate(0deg); }
                    100% { transform: translate(1px, -2px) rotate(-1deg); }
                }
                `}
            </style>
        </Container>
    );
};

export default AdminDashboard;
