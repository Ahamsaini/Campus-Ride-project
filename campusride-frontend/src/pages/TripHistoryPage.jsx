import { useState, useEffect } from 'react'
import {
    Container, Typography, Box, Paper, Grid2 as Grid, Card, CardContent,
    Chip, Avatar, Divider, List, ListItem, ListItemAvatar, ListItemText,
    IconButton, Collapse, Stack, Fade, TextField, InputAdornment, useMediaQuery, useTheme
} from '@mui/material'
import {
    History, DirectionsCar, Person, AccessTime, Map, ExpandMore,
    ExpandLess, CalendarMonth, Search, FilterList, GpsFixed, Route
} from '@mui/icons-material'
import axios from '../api/axiosInstance'
import CampusMap from '../components/map/CampusMap'

const TripHistoryPage = () => {
    const [history, setHistory] = useState([])
    const [loading, setLoading] = useState(true)
    const [expandedRide, setExpandedRide] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [filterDate, setFilterDate] = useState('')
    const theme = useTheme()
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true)
            try {
                const params = {}
                if (filterDate) {
                    const [year, month, day] = filterDate.split('-').map(Number)
                    params.year = year
                    params.month = month
                    params.day = day
                }
                const res = await axios.get('/rides/history', { params })
                setHistory(res.data)
            } catch (err) {
                console.error('Failed to fetch history', err)
            } finally {
                setLoading(false)
            }
        }
        fetchHistory()
    }, [filterDate])

    const filteredHistory = history.filter(ride =>
        ride.riderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ride.status.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <Container maxWidth="lg" sx={{ mt: 10, pb: 10 }}>
            <Fade in timeout={800}>
                <Box>
                    {/* Header Section */}
                    <Box sx={{
                        display: 'flex',
                        flexDirection: isMobile ? 'column' : 'row',
                        justifyContent: 'space-between',
                        alignItems: isMobile ? 'flex-start' : 'flex-end',
                        mb: 6,
                        gap: isMobile ? 3 : 0
                    }}>
                        <Box>
                            <Typography variant={isMobile ? "h4" : "h3"} sx={{ fontWeight: 900, color: 'primary.main', mb: 1 }}>
                                Trip History
                            </Typography>
                            <Typography variant="body1" color="text.secondary">
                                Review your past journeys and safety records
                            </Typography>
                        </Box>
                        <Stack direction={isMobile ? "column" : "row"} spacing={2} sx={{ width: isMobile ? '100%' : 'auto' }}>
                            <TextField
                                type="date"
                                size="small"
                                fullWidth={isMobile}
                                onChange={(e) => setFilterDate(e.target.value)}
                                sx={{
                                    width: 180,
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 4,
                                        bgcolor: 'white'
                                    }
                                }}
                            />
                            <TextField
                                placeholder="Search rider..."
                                size="small"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                slotProps={{
                                    input: {
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Search sx={{ color: 'primary.main' }} />
                                            </InputAdornment>
                                        ),
                                    }
                                }}
                                sx={{
                                    width: 200,
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 4,
                                        bgcolor: 'white'
                                    }
                                }}
                            />
                        </Stack>
                    </Box>

                    {loading ? (
                        <Typography align="center" variant="h6" color="text.secondary">Loading your logs...</Typography>
                    ) : (
                        <Grid container spacing={4}>
                            <Grid size={{ xs: 12, md: 5 }}>
                                <Stack spacing={3}>
                                    {filteredHistory.map((ride) => (
                                        <Card
                                            key={ride.rideId}
                                            onClick={() => setExpandedRide(ride)}
                                            sx={{
                                                borderRadius: 6,
                                                cursor: 'pointer',
                                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                border: expandedRide?.rideId === ride.rideId ? '2px solid' : '1px solid #eee',
                                                borderColor: expandedRide?.rideId === ride.rideId ? 'primary.main' : '#eee',
                                                boxShadow: expandedRide?.rideId === ride.rideId ? '0 20px 40px rgba(0,0,0,0.1)' : 'none',
                                                '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }
                                            }}
                                        >
                                            <CardContent sx={{ p: 3 }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                                    <Chip
                                                        icon={<CalendarMonth sx={{ fontSize: '1rem !important' }} />}
                                                        label={new Date(ride.startTime).toLocaleDateString()}
                                                        size="small"
                                                        sx={{ fontWeight: 'bold', bgcolor: 'primary.light', color: 'primary.main' }}
                                                    />
                                                    <Chip
                                                        label={ride.status}
                                                        size="small"
                                                        color={ride.status === 'COMPLETED' ? 'success' : 'warning'}
                                                        variant="outlined"
                                                        sx={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.65rem' }}
                                                    />
                                                </Box>

                                                <Stack direction="row" spacing={2} alignItems="center">
                                                    <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
                                                        <DirectionsCar />
                                                    </Avatar>
                                                    <Box sx={{ flexGrow: 1 }}>
                                                        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                                                            {ride.riderName}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {ride.passengerNames.length} Passengers Joined
                                                        </Typography>
                                                    </Box>
                                                    <IconButton size="small">
                                                        {expandedRide?.rideId === ride.rideId ? <ExpandLess /> : <ExpandMore />}
                                                    </IconButton>
                                                </Stack>
                                            </CardContent>
                                        </Card>
                                    ))}

                                    {filteredHistory.length === 0 && (
                                        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 8, bgcolor: 'rgba(0,0,0,0.02)' }}>
                                            <History sx={{ fontSize: 64, color: '#ccc', mb: 2 }} />
                                            <Typography variant="h6" color="text.secondary">No trip records found.</Typography>
                                        </Paper>
                                    )}
                                </Stack>
                            </Grid>

                            <Grid size={{ xs: 12, md: 7 }}>
                                {expandedRide ? (
                                    <Paper sx={{
                                        borderRadius: 8,
                                        overflow: 'hidden',
                                        height: '700px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        boxShadow: '0 25px 50px rgba(0,0,0,0.12)',
                                        border: '1px solid #eee'
                                    }}>
                                        <Box sx={{ p: 4, bgcolor: 'white', borderBottom: '1px solid #eee' }}>
                                            <Typography variant="h5" sx={{ fontWeight: 900, mb: 1 }}>Trip Detail Log</Typography>
                                            <Typography variant="body2" color="text.secondary">Safety Trace ID: {expandedRide.rideId}</Typography>

                                            <Grid container sx={{ mt: 3 }} spacing={2}>
                                                <Grid size={6}>
                                                    <Typography variant="caption" color="text.secondary" className="font-bold uppercase">Time Start</Typography>
                                                    <Typography variant="body1" className="font-bold">
                                                        {new Date(expandedRide.startTime).toLocaleTimeString()}
                                                    </Typography>
                                                </Grid>
                                                <Grid size={6}>
                                                    <Typography variant="caption" color="text.secondary" className="font-bold uppercase">Co-Passengers</Typography>
                                                    <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                                                        {expandedRide.passengerNames.join(', ') || 'No passengers'}
                                                    </Typography>
                                                </Grid>
                                            </Grid>
                                        </Box>

                                        <Box sx={{ flexGrow: 1, position: 'relative' }}>
                                            <CampusMap
                                                polyline={expandedRide.routePath}
                                                markers={[
                                                    { position: expandedRide.routePath[0], popup: 'Start Point' },
                                                    { position: expandedRide.routePath[expandedRide.routePath.length - 1], popup: 'End Point' }
                                                ]}
                                                style={{ height: '100%', width: '100%' }}
                                            />
                                        </Box>
                                    </Paper>
                                ) : (
                                    <Box sx={{
                                        height: '700px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        bgcolor: 'rgba(0,0,0,0.01)',
                                        borderRadius: 8,
                                        border: '2px dashed #eee'
                                    }}>
                                        <Route sx={{ fontSize: 80, color: '#eee', mb: 2 }} />
                                        <Typography color="text.secondary">Select a trip from the list to view its route and details</Typography>
                                    </Box>
                                )}
                            </Grid>
                        </Grid>
                    )}
                </Box>
            </Fade>
        </Container>
    )
}

export default TripHistoryPage
