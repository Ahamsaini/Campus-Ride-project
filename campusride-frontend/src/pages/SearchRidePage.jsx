import React, { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { RideCardSkeleton } from '../components/ui/Skeletons'
import {
    Box, Paper, Typography, Button, Stack, Chip, Avatar, Card, CardContent, Alert,
    Fade, Slide, Stepper, Step, StepLabel, Divider, IconButton, Tooltip, LinearProgress,
    TextField, useMediaQuery, useTheme, FormControlLabel, Switch
} from '@mui/material'
import {
    Search, MyLocation, FlagCircle, Person, Timer, DirectionsCar, Route as RouteIcon,
    CheckCircle, NearMe, Star, School, CalendarMonth, EventSeat, Female, Undo, DoneAll,
    CurrencyRupee, TwoWheeler, DirectionsBus, LocalTaxi, DirectionsWalk, NavigateBefore, Info, AccessTime,
    Map as MapIcon
} from '@mui/icons-material'
import CampusMap from '../components/map/CampusMap'
import axios from '../api/axiosInstance'

const vehicleIcons = {
    CAR: <DirectionsCar sx={{ fontSize: 14 }} />,
    BIKE: <TwoWheeler sx={{ fontSize: 14 }} />,
    AUTO: <LocalTaxi sx={{ fontSize: 14 }} />,
    BUS: <DirectionsBus sx={{ fontSize: 14 }} />,
}

const SearchRidePage = () => {
    const [pickup, setPickup] = useState(null)
    const [dropoff, setDropoff] = useState(null)
    const [results, setResults] = useState([])
    const [searching, setSearching] = useState(false)
    const [error, setError] = useState(null)
    const [selectedRide, setSelectedRide] = useState(null)
    const [requestSent, setRequestSent] = useState({})

    const [minSeats, setMinSeats] = useState(1)
    const [vehicleFilter, setVehicleFilter] = useState('ALL')
    const { user } = useSelector((state) => state.auth)
    const theme = useTheme()
    const isMobile = useMediaQuery(theme.breakpoints.down('md'))
    const [isPanelOpen, setIsPanelOpen] = useState(true)

    const currentStep = !pickup ? 0 : !dropoff ? 1 : 2

    const handleMapClick = (latlng) => {
        if (!pickup) {
            setPickup(latlng)
            setResults([])
            setSelectedRide(null)
        } else if (!dropoff) {
            setDropoff(latlng)
        }
    }

    const handleUndo = () => {
        if (dropoff) {
            setDropoff(null)
            setResults([])
            setSelectedRide(null)
        } else if (pickup) {
            setPickup(null)
            setResults([])
            setSelectedRide(null)
        }
    }

    const handleSearch = async () => {
        if (!pickup || !dropoff) return
        setSearching(true)
        setError(null)
        setSelectedRide(null)
        try {
            const response = await axios.get(
                `/rides/search?pLat=${pickup.lat}&pLng=${pickup.lng}&dLat=${dropoff.lat}&dLng=${dropoff.lng}`
            )
            
            let filteredResults = response.data
            if (vehicleFilter !== 'ALL') {
                filteredResults = filteredResults.filter(r => r.vehicleType === vehicleFilter)
            }
            if (minSeats > 1) {
                filteredResults = filteredResults.filter(r => r.seatsAvailable >= minSeats)
            }
            
            setResults(filteredResults)
            if (filteredResults.length === 0) {
                setError('No rides found matching your route/filters.')
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Search failed. Please try again.')
        } finally {
            setSearching(false)
        }
    }

    const handleRequest = async (rideId) => {
        try {
            await axios.post('/ride-requests', {
                rideId,
                pickupLat: pickup.lat,
                pickupLng: pickup.lng,
                dropoffLat: dropoff.lat,
                dropoffLng: dropoff.lng
            })
            setRequestSent(prev => ({ ...prev, [rideId]: true }))
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to send request')
        }
    }

    const formatWalkDistance = (meters) => {
        if (!meters || meters < 1) return '< 1m'
        if (meters < 1000) return `${Math.round(meters)}m walk`
        return `${(meters / 1000).toFixed(1)}km walk`
    }

    // Build markers
    const markers = []
    if (pickup) {
        markers.push({
            position: [pickup.lat, pickup.lng],
            popup: '📍 Your Pickup',
            draggable: true,
            onDragEnd: (latlng) => { setPickup(latlng); setResults([]); setSelectedRide(null) }
        })
    }
    if (dropoff) {
        markers.push({
            position: [dropoff.lat, dropoff.lng],
            popup: '🏁 Your Dropoff',
            draggable: true,
            onDragEnd: (latlng) => { setDropoff(latlng); setResults([]); setSelectedRide(null) }
        })
    }
    if (selectedRide) {
        markers.push({ position: [selectedRide.startLat, selectedRide.startLng], popup: `🚗 Driver Start: ${selectedRide.riderName}` })
        markers.push({ position: [selectedRide.endLat, selectedRide.endLng], popup: `🏁 Driver End` })
    }

    return (
        <Box sx={{ height: 'calc(100vh - 80px)', position: 'relative', bgcolor: '#f4f7f9', overflow: 'hidden' }}>
            <CampusMap
                markers={markers}
                polyline={selectedRide?.routeCoordinates || []}
                onMapClick={handleMapClick}
                style={{ height: '100%', width: '100%' }}
            />

            {/* Mobile View Toggle */}
            {isMobile && (
                <Stack direction="row" spacing={1} sx={{ position: 'absolute', bottom: isPanelOpen ? '45vh' : 95, right: 20, zIndex: 1100, transition: 'bottom 0.4s' }}>
                    {(pickup || dropoff) && (
                        <IconButton 
                            onClick={handleUndo}
                            sx={{ bgcolor: 'white', border: '1px solid #ccc', boxShadow: 3, '&:hover': { bgcolor: '#f5f5f5' } }}
                        >
                            <Undo color="primary" />
                        </IconButton>
                    )}
                    <Button
                        variant="contained"
                        startIcon={isPanelOpen ? <MapIcon /> : <Search />}
                        onClick={() => setIsPanelOpen(!isPanelOpen)}
                        sx={{
                            borderRadius: 10,
                            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                            px: 3
                        }}
                    >
                        {isPanelOpen ? 'Map' : 'Search Panel'}
                    </Button>
                </Stack>
            )}

            {/* Stepper Header */}
            <Box sx={{
                position: 'absolute', top: isMobile ? 12 : 24, left: '50%', transform: 'translateX(-50%)',
                width: isMobile ? '95%' : '80%', maxWidth: 700, zIndex: 1000, pointerEvents: 'none'
            }}>
                <Fade in timeout={1000}>
                    <Paper sx={{
                        p: isMobile ? 1.5 : 2.5, borderRadius: isMobile ? 4 : 6,
                        background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(20px)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.1)', pointerEvents: 'auto'
                    }}>
                        <Stepper activeStep={currentStep} alternativeLabel={!isMobile}>
                            {['Set Pickup', 'Set Dropoff', 'Find Rides'].map((label) => (
                                <Step key={label}>
                                    <StepLabel>{!isMobile && <Typography variant="caption" className="font-bold">{label}</Typography>}</StepLabel>
                                </Step>
                            ))}
                        </Stepper>
                    </Paper>
                </Fade>
            </Box>

            {/* Side Panel */}
            <Box sx={{
                position: 'absolute',
                top: isMobile ? (isPanelOpen ? '15%' : '100%') : 120,
                left: isMobile ? 0 : 24, bottom: 0, width: isMobile ? '100%' : 420,
                zIndex: 1050, transition: 'top 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            }}>
                <Slide direction={isMobile ? "up" : "right"} in={isMobile ? isPanelOpen : true} mountOnEnter unmountOnExit>
                    <Paper sx={{
                        height: '100%', borderRadius: isMobile ? '30px 30px 0 0' : 6, display: 'flex', flexDirection: 'column',
                        boxShadow: '0 -10px 40px rgba(0,0,0,0.15)', overflow: 'hidden', pointerEvents: 'auto',
                        background: 'rgba(255, 255, 255, 0.98)',
                        border: isMobile ? '1px solid #eee' : 'none',
                        pb: isMobile ? '75px' : 0
                    }}>
                        {isMobile && (
                            <Box sx={{ width: 40, height: 4, bgcolor: '#ccc', borderRadius: 2, mx: 'auto', mt: 1.5, mb: 1 }} onClick={() => setIsPanelOpen(false)} />
                        )}
                        <Box sx={{ p: isMobile ? 2.5 : 3, background: 'linear-gradient(135deg, #1976d2, #42a5f5)', color: 'white' }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Stack direction="row" spacing={2} alignItems="center">
                                    <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: isMobile ? 32 : 40, height: isMobile ? 32 : 40 }}><Search fontSize={isMobile ? "small" : "medium"} /></Avatar>
                                    <Box>
                                        <Typography variant={isMobile ? "subtitle1" : "h6"} className="font-bold">Find a Ride</Typography>
                                        <Typography variant="caption" sx={{ opacity: 0.8 }}>{currentStep < 2 ? 'Setting markers' : `${results.length} rides found`}</Typography>
                                    </Box>
                                </Stack>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    {(pickup || dropoff) && !isMobile && (
                                        <IconButton size="small" sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.1)' }} onClick={handleUndo}><Undo fontSize="small" /></IconButton>
                                    )}
                                    {isMobile && (
                                        <IconButton size="small" sx={{ color: 'white' }} onClick={() => setIsPanelOpen(false)}><NavigateBefore sx={{ transform: 'rotate(-90deg)' }} /></IconButton>
                                    )}
                                </Box>
                            </Stack>
                        </Box>

                        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 3 }}>
                            {error && <Alert severity="info" sx={{ mb: 3, borderRadius: 4 }}>{error}</Alert>}
                            <Stack spacing={2} sx={{ mb: 3 }}>
                                <Paper variant="outlined" sx={{
                                    p: 2, borderRadius: 4, display: 'flex', alignItems: 'center', gap: 2,
                                    borderColor: pickup ? 'success.main' : '#e0e6ed', bgcolor: pickup ? 'rgba(46,125,50,0.05)' : 'transparent'
                                }}>
                                    <Avatar sx={{ bgcolor: pickup ? 'success.main' : '#e0e6ed', width: 32, height: 32 }}><MyLocation sx={{ fontSize: 16, color: pickup ? 'white' : 'text.secondary' }} /></Avatar>
                                    <Box sx={{ flexGrow: 1 }}><Typography variant="body2" className="font-bold" color={pickup ? 'success.main' : 'text.secondary'}>{pickup ? `Pickup Set` : 'Click map to set Pickup'}</Typography></Box>
                                    {pickup && <CheckCircle color="success" sx={{ fontSize: 20 }} />}
                                </Paper>

                                <Paper variant="outlined" sx={{
                                    p: 2, borderRadius: 4, display: 'flex', alignItems: 'center', gap: 2,
                                    borderColor: dropoff ? 'error.main' : '#e0e6ed', bgcolor: dropoff ? 'rgba(211,47,47,0.05)' : 'transparent'
                                }}>
                                    <Avatar sx={{ bgcolor: dropoff ? 'error.main' : '#e0e6ed', width: 32, height: 32 }}><FlagCircle sx={{ fontSize: 16, color: dropoff ? 'white' : 'text.secondary' }} /></Avatar>
                                    <Box sx={{ flexGrow: 1 }}><Typography variant="body2" className="font-bold" color={dropoff ? 'error.main' : 'text.secondary'}>{dropoff ? `Dropoff Set` : pickup ? 'Now set Dropoff' : 'Set Pickup first'}</Typography></Box>
                                    {dropoff && <CheckCircle color="error" sx={{ fontSize: 20 }} />}
                                </Paper>



                                <Box sx={{ mb: 2, p: 2, borderRadius: 4, bgcolor: 'rgba(0,0,0,0.02)', border: '1px solid #eee' }}>
                                    <Typography variant="caption" className="font-bold opacity-60 uppercase" sx={{ mb: 1, display: 'block' }}>Filters</Typography>
                                    <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                                        {['ALL', 'CAR', 'BIKE', 'AUTO'].map(type => (
                                            <Chip key={type} label={type} size="small" onClick={() => setVehicleFilter(type)} color={vehicleFilter === type ? "primary" : "default"} variant={vehicleFilter === type ? "contained" : "outlined"} />
                                        ))}
                                    </Stack>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <Typography variant="body2">Min Seats:</Typography>
                                        {[1, 2, 3, 4].map(s => (
                                            <IconButton key={s} size="small" sx={{ bgcolor: minSeats === s ? 'primary.main' : 'transparent', color: minSeats === s ? 'white' : 'inherit' }} onClick={() => setMinSeats(s)}><Typography variant="caption">{s}</Typography></IconButton>
                                        ))}
                                    </Stack>
                                </Box>
                            </Stack>

                            {searching ? <RideCardSkeleton /> : (
                                results.length > 0 ? (
                                    <Stack spacing={2}>
                                        {results.map((ride) => (
                                            <Card key={ride.id} onClick={() => setSelectedRide(ride)} sx={{ cursor: 'pointer', borderRadius: 5, border: selectedRide?.id === ride.id ? '2px solid #1976d2' : '1px solid #eee', bgcolor: selectedRide?.id === ride.id ? 'rgba(25,118,210,0.05)' : 'white' }}>
                                                <CardContent sx={{ p: 2 }}>
                                                    <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1.5 }}>
                                                        <Avatar sx={{ bgcolor: 'primary.light' }}>{ride.riderName[0]}</Avatar>
                                                        <Box sx={{ flexGrow: 1 }}>
                                                            <Typography variant="body1" className="font-bold">{ride.riderName}</Typography>
                                                            <Stack direction="row" spacing={1} alignItems="center">
                                                                <Typography variant="caption" color="text.secondary">
                                                                    {ride.riderDept} • {ride.riderCourse} • Y{ride.riderYear}
                                                                </Typography>
                                                                <Chip 
                                                                    icon={<Star sx={{ fontSize: '0.8rem !important', color: '#f59e0b !important' }} />} 
                                                                    label={`${ride.riderTrustScore} pts`} 
                                                                    size="small" 
                                                                    sx={{ height: 18, fontSize: '0.65rem', bgcolor: '#fffbeb', color: '#92400e', fontWeight: 'bold', border: '1px solid #fef3c7' }} 
                                                                />
                                                            </Stack>
                                                        </Box>
                                                        <Chip label={`${Math.round(ride.matchScore * 100)}% Match`} size="small" color="success" />
                                                    </Stack>
                                                    <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                                                        <Chip icon={<AccessTime />} label={new Date(ride.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} size="small" variant="outlined" />
                                                        <Chip icon={<DirectionsCar />} label={ride.vehicleType} size="small" variant="outlined" />
                                                        <Chip icon={<EventSeat />} label={`${ride.seatsAvailable} seats`} size="small" variant="outlined" />
                                                    </Stack>
                                                    <Button fullWidth variant={requestSent[ride.id] ? "outlined" : "contained"} onClick={(e) => { e.stopPropagation(); handleRequest(ride.id) }} disabled={requestSent[ride.id]}>{requestSent[ride.id] ? "Request Sent" : "Join Ride"}</Button>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </Stack>
                                ) : pickup && dropoff && !searching && <Typography align="center" variant="body2" color="text.secondary">No rides found. Try changing filters or moving locations.</Typography>
                            )}
                        </Box>

                        <Box sx={{ p: 3, borderTop: '1px solid #eee' }}>
                            <Button fullWidth variant="contained" size="large" onClick={handleSearch} disabled={!pickup || !dropoff || searching}>{searching ? 'Searching...' : 'Search Rides'}</Button>
                        </Box>
                    </Paper>
                </Slide>
            </Box>
        </Box>
    )
}

export default SearchRidePage
