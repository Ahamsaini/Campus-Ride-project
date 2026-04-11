import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import {
    Container, Paper, Typography, Box, Stepper, Step, StepLabel,
    Button, TextField, Grid2 as Grid, Alert, FormControlLabel, Switch,
    List, ListItem, ListItemText, ListItemSecondaryAction, IconButton,
    Divider, Chip, Stack, MenuItem, Select, FormControl, InputLabel,
    Fade, Zoom, Slide, Card, CardContent, Tooltip, Avatar, ToggleButtonGroup, ToggleButton, useMediaQuery, useTheme
} from '@mui/material'
import {
    DirectionsCar, LocationOn, Map as MapIcon, AddLocationAlt,
    DeleteOutline, Save, Restore, Route as RouteIcon,
    NavigateNext, NavigateBefore, DoneAll, History,
    Timeline, Info, Undo, Brush, AutoFixHigh, TravelExplore,
    Female, Repeat, Person, SwapCalls
} from '@mui/icons-material'
import CampusMap from '../components/map/CampusMap'
import axios from '../api/axiosInstance'
import { useNavigate } from 'react-router-dom'
import { fetchRoadRoute } from '../utils/routeUtils'
import LocationSearchInput from '../components/common/LocationSearchInput'

const CreateRidePage = () => {
    const [activeStep, setActiveStep] = useState(0)
    const [mode, setMode] = useState('AUTO') // 'AUTO' or 'CUSTOM'
    const [points, setPoints] = useState([])
    const [suggestedRoutes, setSuggestedRoutes] = useState([])
    const [selectedRouteIdx, setSelectedRouteIdx] = useState(0)
    const [savedRoutes, setSavedRoutes] = useState([])
    const [selectedRouteId, setSelectedRouteId] = useState('')
    const [routePath, setRoutePath] = useState([])
    const [saveThisRoute, setSaveThisRoute] = useState(false)
    const [aiSuggestion, setAiSuggestion] = useState(null)
    const [isAISuggesting, setIsAISuggesting] = useState(false)
    const [routeName, setRouteName] = useState('')
    const [rideData, setRideData] = useState({
        seatsAvailable: 1,
        departureTime: '',
        isRecurring: false
    })
    const [error, setError] = useState(null)
    const [isCalculating, setIsCalculating] = useState(false)
    const { user } = useSelector((state) => state.auth)
    const navigate = useNavigate()

    const steps = ['Route', 'Review', 'Logistics']
    const theme = useTheme()
    const isMobile = useMediaQuery(theme.breakpoints.down('md'))
    const [isPanelOpen, setIsPanelOpen] = useState(true)

    const reverseGeocode = async (lat, lng) => {
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18`);
            const data = await res.json();
            return data.name || data.display_name.split(',')[0] || 'Selected Location';
        } catch (err) {
            console.error('Geocoding failed', err);
            return 'Pinned Location';
        }
    }

    useEffect(() => {
        const fetchRoutes = async () => {
            try {
                const [myRes, allRes, pastRidesRes] = await Promise.all([
                    axios.get('/routes/my'),
                    axios.get('/routes/all'),
                    axios.get('/rides/my-rides')
                ])

                const combined = [...myRes.data]

                // Add public routes not already in list
                allRes.data.forEach(r => {
                    if (!combined.find(c => c.id === r.id)) combined.push(r)
                })

                // Add past rides as templates
                pastRidesRes.data.forEach(ride => {
                    if (!combined.find(c => c.id === ride.id)) {
                        combined.push({
                            id: ride.id,
                            name: `Previous Trip: ${ride.departureTime ? new Date(ride.departureTime).toLocaleDateString() : 'Template'}`,
                            startLat: ride.startLat,
                            startLng: ride.startLng,
                            endLat: ride.endLat,
                            endLng: ride.endLng,
                            routeCoordinates: ride.routeCoordinates
                        })
                    }
                })

                setSavedRoutes(combined)
            } catch (err) { console.error('Failed to fetch routes', err) }
        }
        fetchRoutes()
    }, [])

    const calculateRoute = async (updatedPoints) => {
        if (updatedPoints.length < 2) {
            setRoutePath([])
            setSuggestedRoutes([])
            setAiSuggestion(null)
            return
        }
        setIsCalculating(true)
        const coords = updatedPoints.map(p => [p.lng, p.lat])
        const alternatives = (mode === 'AUTO' && updatedPoints.length === 2) ? 5 : 0
        const routes = await fetchRoadRoute(coords, alternatives)

        if (routes && routes.length > 0) {
            setSuggestedRoutes(routes)
            setRoutePath(routes[0].path)
            setSelectedRouteIdx(0)
            setError(null)
            if (updatedPoints.length === 2) checkAISmartPath(updatedPoints)
        } else {
            // Fallback for poor connectivity areas: Simple Straight Path
            const straightPoints = updatedPoints.map(p => [p.lat, p.lng])
            setRoutePath(straightPoints)
            setSuggestedRoutes([{
                path: straightPoints,
                distance: 0, // Fallback
                summary: 'Manual Straight Mode'
            }])
            setSelectedRouteIdx(0)
            setError('Warning: Road-snapping failed for these points. Using direct path.')
        }
        setIsCalculating(false)
    }

    const checkAISmartPath = async (pts) => {
        if (pts.length !== 2) return
        setIsAISuggesting(true)
        try {
            const res = await axios.get('/routes/ai-suggest-all', {
                params: {
                    sLat: pts[0].lat, sLng: pts[0].lng,
                    eLat: pts[pts.length - 1].lat, eLng: pts[pts.length - 1].lng
                }
            })
            if (res.data && res.data.length > 0) {
                // Set the top suggestion as the primary AI suggestion (green line)
                setAiSuggestion(res.data[0])

                // Merge remaining saved routes into the suggested routes list
                const savedAsRoutes = res.data.slice(1).map(sr => ({
                    path: sr.routeCoordinates,
                    distance: 0,
                    summary: `📌 ${sr.name || 'Saved Route'} (${sr.usageCount || 0} uses)`
                }))

                setSuggestedRoutes(prev => {
                    // Avoid duplicates by checking if name already exists
                    const existing = new Set(prev.map(r => r.summary))
                    const newRoutes = savedAsRoutes.filter(r => !existing.has(r.summary))
                    return [...prev, ...newRoutes]
                })
            } else {
                setAiSuggestion(null)
            }
        } catch (err) { console.error('AI Suggestion failed', err) }
        finally { setIsAISuggesting(false) }
    }

    const applyAISuggestion = () => {
        if (!aiSuggestion) return
        setRoutePath(aiSuggestion.routeCoordinates)
        setSuggestedRoutes(prev => [{
            path: aiSuggestion.routeCoordinates,
            distance: 0,
            summary: aiSuggestion.name || 'AI Optimized Route'
        }, ...prev.filter(r => r.summary !== (aiSuggestion.name || 'AI Optimized Route'))])
        setSelectedRouteIdx(0)
        setSelectedRouteId(aiSuggestion.id)
        if (!routeName) setRouteName(aiSuggestion.name)
    }
    const relabelPoints = (pts) => {
        if (pts.length === 0) return pts
        // Preserve existing address labels if present, otherwise set generic fallback
        if (!pts[0].label) pts[0].label = 'Start Point'
        if (pts.length > 1 && !pts[pts.length - 1].label) pts[pts.length - 1].label = 'End Point'
        for (let i = 1; i < pts.length - 1; i++) {
            if (!pts[i].label) pts[i].label = `Stop ${i}`
        }
        return pts
    }

    const handleMapClick = async (latlng) => {
        if (activeStep !== 0) return

        let updatedPoints = [...points]
        const locationName = await reverseGeocode(latlng.lat, latlng.lng)

        if (mode === 'CUSTOM') {
            updatedPoints.push({ lat: latlng.lat, lng: latlng.lng, label: locationName })
            updatedPoints = relabelPoints(updatedPoints)
            setPoints(updatedPoints)
            setRoutePath([]) // Draft state
            setSuggestedRoutes([])
        } else {
            if (updatedPoints.length < 2) {
                updatedPoints.push({ lat: latlng.lat, lng: latlng.lng, label: locationName })
            } else {
                updatedPoints.splice(updatedPoints.length - 1, 0, { lat: latlng.lat, lng: latlng.lng, label: locationName })
            }
            updatedPoints = relabelPoints(updatedPoints)
            setPoints(updatedPoints)
            calculateRoute(updatedPoints)
        }
    }

    const handleMarkerDrag = async (index, newLatLng) => {
        const updatedPoints = [...points]
        const locationName = await reverseGeocode(newLatLng.lat, newLatLng.lng)
        updatedPoints[index] = { ...updatedPoints[index], lat: newLatLng.lat, lng: newLatLng.lng, label: locationName }
        setPoints(updatedPoints)
        if (mode === 'AUTO') calculateRoute(updatedPoints)
        else setRoutePath([])
    }

    const handleUndo = () => {
        if (points.length === 0) return

        let updated = [...points]
        if (mode === 'CUSTOM') {
            updated.pop()
        } else {
            if (updated.length <= 2) updated = updated.slice(0, -1)
            else updated.splice(updated.length - 2, 1)
        }

        updated = relabelPoints(updated)
        setPoints(updated)
        if (mode === 'AUTO') calculateRoute(updated)
        else setRoutePath([])
    }

    const removePoint = async (index) => {
        let updated = points.filter((_, i) => i !== index)
        updated = relabelPoints(updated)
        setPoints(updated)
        if (mode === 'AUTO') calculateRoute(updated)
        else setRoutePath([])
    }

    const selectSuggestedRoute = (idx) => {
        setSelectedRouteIdx(idx)
        setRoutePath(suggestedRoutes[idx].path)
    }

    const loadSavedRoute = (routeId) => {
        const route = savedRoutes.find(r => r.id === routeId)
        if (!route) return
        const start = { lat: route.startLat, lng: route.startLng, label: 'Start' }
        const end = { lat: route.endLat, lng: route.endLng, label: 'End' }
        setPoints([start, end])
        setRoutePath(route.routeCoordinates)
        setSelectedRouteId(routeId)
    }

    const handleReverseRoute = () => {
        if (points.length < 2) return
        const reversed = [...points].reverse()
        setPoints(reversed)
        if (routePath.length > 0) {
            setRoutePath([...routePath].reverse())
        }
        // If we were using a saved route, clear the selection ID as it's now modified
        setSelectedRouteId('')
    }

    const handleNext = async () => {
        if (activeStep === 0) {
            if (points.length < 2) {
                setError('A ride needs at least a starting point and destination.')
                return
            }
            setActiveStep(1)
            setError(null)
        } else if (activeStep === 1) {
            if (saveThisRoute && !routeName) {
                setError('Please name your route to save it.')
                return
            }
            if (saveThisRoute) {
                try {
                    await axios.post('/routes', {
                        name: routeName,
                        startLat: points[0].lat,
                        startLng: points[0].lng,
                        endLat: points[points.length - 1].lat,
                        endLng: points[points.length - 1].lng,
                        routeCoordinates: routePath.map(p => [p[1], p[0]])
                    })
                } catch (err) { console.error(err) }
            }
            setActiveStep(2)
            setError(null)
        } else {
            try {
                let finalRouteId = selectedRouteId

                // If it's a new route, we MUST save it first to get an ID for the template
                if (!finalRouteId) {
                    const routeRes = await axios.post('/routes', {
                        name: rideData.isRecurring ? "My Routine Route" : "One-off Route",
                        startLat: points[0].lat,
                        startLng: points[0].lng,
                        endLat: points[points.length - 1].lat,
                        endLng: points[points.length - 1].lng,
                        routeCoordinates: routePath.map(p => [p[1], p[0]])
                    })
                    finalRouteId = routeRes.data.id
                }

                if (rideData.isRecurring) {
                    // Extract HH:mm from datetime-local
                    const timeOnly = rideData.departureTime.split('T')[1]
                    await axios.post('/ride-templates', {
                        userId: user.id,
                        routeId: finalRouteId,
                        departureTime: timeOnly,
                        daysOfWeek: [1, 2, 3, 4, 5], // Monday - Friday
                        seatsAvailable: parseInt(rideData.seatsAvailable),
                    })
                }

                const submissionData = {
                    startLat: points[0].lat,
                    startLng: points[0].lng,
                    endLat: points[points.length - 1].lat,
                    endLng: points[points.length - 1].lng,
                    routeCoordinates: routePath.map(p => [p[1], p[0]]),
                    routeId: finalRouteId,
                    pickupLocationName: points[0].label,
                    dropoffLocationName: points[points.length - 1].label,
                    ...rideData
                }
                await axios.post('/rides', submissionData)
                navigate('/dashboard')
            } catch (err) {
                setError(err.response?.data?.message || 'Creation failed.')
            }
        }
    }

    const markers = points.map((p, i) => ({
        position: [p.lat, p.lng],
        popup: `${p.label} (Point ${i + 1}) - Drag to move`,
        draggable: activeStep === 0, // Only draggable when creating route
        onDragEnd: (latlng) => handleMarkerDrag(i, latlng)
    }))

    const isCustomDraft = mode === 'CUSTOM' && points.length >= 2 && routePath.length === 0

    return (
        <Box sx={{ height: 'calc(100vh - 80px)', position: 'relative', bgcolor: '#f4f7f9', overflow: 'hidden' }}>
            <CampusMap
                markers={markers}
                polyline={routePath}
                aiPolyline={(aiSuggestion && routePath !== aiSuggestion.routeCoordinates) ? aiSuggestion.routeCoordinates : null}
                draftPolyline={isCustomDraft ? points.map(p => [p.lat, p.lng]) : null}
                alternativePolylines={suggestedRoutes.map(r => r.path).filter((_, idx) => idx !== selectedRouteIdx)}
                onMapClick={handleMapClick}
                style={{ height: '100%', width: '100%' }}
            />

            {/* Mobile View Toggle */}
            {isMobile && (
                <Stack direction="row" spacing={1} sx={{ position: 'absolute', bottom: isPanelOpen ? '45vh' : 95, right: 20, zIndex: 1100, transition: 'bottom 0.4s' }}>
                    {points.length > 0 && activeStep === 0 && (
                        <IconButton 
                            onClick={handleUndo}
                            sx={{ bgcolor: 'white', border: '1px solid #ccc', boxShadow: 3, '&:hover': { bgcolor: '#f5f5f5' } }}
                        >
                            <Undo color="primary" />
                        </IconButton>
                    )}
                    <Button
                        variant="contained"
                        startIcon={isPanelOpen ? <MapIcon /> : <Brush />}
                        onClick={() => setIsPanelOpen(!isPanelOpen)}
                        sx={{
                            borderRadius: 10,
                            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                            px: 3
                        }}
                    >
                        {isPanelOpen ? 'Map' : 'Designer'}
                    </Button>
                </Stack>
            )}

            {/* Stepper Header */}
            <Box sx={{
                position: 'absolute',
                top: isMobile ? 24 : 24,
                left: '50%',
                transform: 'translateX(-50%)',
                width: isMobile ? '95%' : '80%',
                maxWidth: 800,
                zIndex: 1000,
                pointerEvents: 'none'
            }}>
                <Fade in timeout={1000}>
                    <Paper sx={{
                        p: isMobile ? 1.5 : 2.5,
                        borderRadius: isMobile ? 4 : 6,
                        background: 'rgba(255, 255, 255, 0.85)',
                        backdropFilter: 'blur(20px)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                        pointerEvents: 'auto'
                    }}>
                        <Stepper activeStep={activeStep} alternativeLabel={!isMobile}>
                            {steps.map((label) => (
                                <Step key={label}>
                                    <StepLabel>
                                        {!isMobile && <Typography variant="caption" className="font-bold">{label}</Typography>}
                                    </StepLabel>
                                </Step>
                            ))}
                        </Stepper>
                    </Paper>
                </Fade>
            </Box>

            {/* Main Action Panel */}
            <Box sx={{
                position: 'absolute',
                top: isMobile ? (isPanelOpen ? '15%' : '100%') : 120,
                left: isMobile ? 0 : 24,
                bottom: 0,
                width: isMobile ? '100%' : 420,
                pointerEvents: 'none',
                zIndex: 1050,
                transition: 'top 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            }}>
                <Slide direction={isMobile ? "up" : "right"} in={isMobile ? isPanelOpen : true} mountOnEnter unmountOnExit>
                    <Paper sx={{
                        borderRadius: isMobile ? '30px 30px 0 0' : 8,
                        height: '100%',
                        background: 'rgba(255, 255, 255, 0.98)',
                        backdropFilter: 'blur(10px)',
                        boxShadow: '0 -10px 40px rgba(0,0,0,0.15)',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        pointerEvents: 'auto',
                        border: isMobile ? '1px solid #eee' : 'none',
                        pb: isMobile ? '75px' : 0
                    }}>
                        {isMobile && (
                            <Box sx={{ width: 40, height: 4, bgcolor: '#ccc', borderRadius: 2, mx: 'auto', mt: 1.5, mb: 1 }} onClick={() => setIsPanelOpen(false)} />
                        )}
                        <Box sx={{ p: isMobile ? 2.5 : 4, bgcolor: 'primary.main', color: 'white' }}>
                            <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                                <Stack direction="row" spacing={2} alignItems="center">
                                    <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: isMobile ? 32 : 40, height: isMobile ? 32 : 40 }}>
                                        {mode === 'AUTO' ? <AutoFixHigh fontSize={isMobile ? 'small' : 'medium'} /> : <Brush fontSize={isMobile ? 'small' : 'medium'} />}
                                    </Avatar>
                                    <Box>
                                        <Typography variant={isMobile ? "subtitle1" : "h6"} className="font-bold">Trip Designer</Typography>
                                        <Typography variant="caption" sx={{ opacity: 0.8 }}>{activeStep === 0 ? 'Map View' : 'Finalizing'}</Typography>
                                    </Box>
                                </Stack>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    {activeStep === 0 && points.length > 0 && !isMobile && (
                                        <Tooltip title="Undo last point">
                                            <IconButton size="small" sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.1)' }} onClick={handleUndo}>
                                                <Undo fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                    {isMobile && (
                                        <IconButton size="small" sx={{ color: 'white' }} onClick={() => setIsPanelOpen(false)}>
                                            <NavigateBefore sx={{ transform: 'rotate(-90deg)' }} />
                                        </IconButton>
                                    )}
                                </Box>
                            </Stack>
                        </Box>

                        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 3 }}>
                            {error && <Alert severity="warning" sx={{ mb: 3, borderRadius: 4 }}>{error}</Alert>}

                            {activeStep === 0 && (
                                <Stack spacing={3}>
                                    {/* Type Location Section */}
                                    <Box sx={{ p: 2, borderRadius: 4, bgcolor: 'rgba(25, 118, 210, 0.03)', border: '1px solid rgba(25, 118, 210, 0.12)' }}>
                                        <Typography variant="caption" className="font-bold opacity-60 uppercase" sx={{ mb: 1.5, display: 'block' }}>TYPE LOCATION OR USE GPS</Typography>
                                        <Stack spacing={2}>
                                            <LocationSearchInput
                                                label="Starting Point"
                                                placeholder="E.g. Main Gate, Library..."
                                                color="success"
                                                icon={<LocationOn />}
                                                value={points.length >= 1 ? { lat: points[0].lat, lng: points[0].lng, name: points[0].label } : null}
                                                onLocationSelect={async (loc) => {
                                                    // Simulate a map click at the geocoded position
                                                    handleMapClick({ lat: loc.lat, lng: loc.lng })
                                                }}
                                                onClear={() => {
                                                    // Remove start point and everything after
                                                    setPoints([])
                                                    setRoutePath([])
                                                    setSuggestedRoutes([])
                                                    setAiSuggestion(null)
                                                }}
                                                disabled={activeStep !== 0}
                                            />
                                            <LocationSearchInput
                                                label="Ending Point"
                                                placeholder="E.g. Campus, Hostel..."
                                                color="error"
                                                icon={<LocationOn />}
                                                value={points.length >= 2 ? { lat: points[points.length - 1].lat, lng: points[points.length - 1].lng, name: points[points.length - 1].label } : null}
                                                onLocationSelect={async (loc) => {
                                                    handleMapClick({ lat: loc.lat, lng: loc.lng })
                                                }}
                                                onClear={() => {
                                                    // Remove end point only
                                                    if (points.length >= 2) {
                                                        const updated = points.slice(0, -1)
                                                        setPoints(updated)
                                                        setRoutePath([])
                                                        setSuggestedRoutes([])
                                                    }
                                                }}
                                                disabled={activeStep !== 0 || points.length < 1}
                                            />
                                        </Stack>
                                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block', textAlign: 'center', opacity: 0.7 }}>
                                            Or click directly on the map to place points
                                        </Typography>
                                    </Box>

                                    <Divider sx={{ my: 1 }} />

                                    {/* Mode Selector */}
                                    <Box>
                                        <Typography variant="caption" className="font-bold opacity-60 uppercase mb-1 d-block">CHOOSE DESIGN MODE</Typography>
                                        <ToggleButtonGroup
                                            value={mode}
                                            exclusive
                                            onChange={(e, m) => {
                                                if (m) {
                                                    setMode(m)
                                                    if (m === 'CUSTOM') {
                                                        setRoutePath([])
                                                        setSuggestedRoutes([])
                                                    } else if (points.length >= 2) {
                                                        calculateRoute(points)
                                                    }
                                                }
                                            }}
                                            fullWidth
                                            size="small"
                                            sx={{ mt: 1 }}
                                        >
                                            <ToggleButton value="AUTO" sx={{ borderRadius: 4 }}>
                                                <AutoFixHigh sx={{ mr: 1, fontSize: 18 }} /> Smart Pathing
                                            </ToggleButton>
                                            <ToggleButton value="CUSTOM" sx={{ borderRadius: 4 }}>
                                                <Brush sx={{ mr: 1, fontSize: 18 }} /> Custom Draw
                                            </ToggleButton>
                                        </ToggleButtonGroup>
                                    </Box>

                                    {/* AUTO MODE ROUTE SUGGESTIONS */}
                                    {mode === 'AUTO' && points.length >= 2 && (
                                        <Box>
                                            {aiSuggestion && (
                                                <Fade in>
                                                    <Card
                                                        onClick={applyAISuggestion}
                                                        sx={{
                                                            mb: 3,
                                                            cursor: 'pointer',
                                                            borderRadius: 6,
                                                            background: 'linear-gradient(135deg, #FFF9C4 0%, #FFFDE7 100%)',
                                                            border: '2px solid #FFD700',
                                                            boxShadow: '0 8px 24px rgba(255, 215, 0, 0.2)',
                                                            overflow: 'hidden',
                                                            position: 'relative'
                                                        }}
                                                    >
                                                        <Box sx={{
                                                            position: 'absolute', top: -10, right: -10, opacity: 0.1, transform: 'rotate(20deg)'
                                                        }}>
                                                            <AutoFixHigh sx={{ fontSize: 100 }} />
                                                        </Box>
                                                        <CardContent sx={{ p: 2, position: 'relative' }}>
                                                            <Stack direction="row" spacing={2} alignItems="center">
                                                                <Avatar sx={{ bgcolor: '#FFD700', color: 'text.primary', width: 44, height: 44 }}>
                                                                    <AutoFixHigh />
                                                                </Avatar>
                                                                <Box sx={{ flexGrow: 1 }}>
                                                                    <Typography variant="caption" className="font-bold uppercase text-amber-600">✨ AI SMART PATH FOUND</Typography>
                                                                    <Typography variant="body1" className="font-bold">
                                                                        {aiSuggestion.name || 'Campus Optimized Shortcut'}
                                                                    </Typography>
                                                                    <Stack direction="row" spacing={1} alignItems="center">
                                                                        <Chip
                                                                            label={`${aiSuggestion.usageCount}+ student rides`}
                                                                            size="small"
                                                                            sx={{ height: 18, fontSize: '0.6rem', fontWeight: 'bold', bgcolor: 'rgba(255, 215, 0, 0.3)' }}
                                                                        />
                                                                        {routePath === aiSuggestion.routeCoordinates ? (
                                                                            <Typography variant="caption" className="font-bold" color="success.main">Currently Applied</Typography>
                                                                        ) : (
                                                                            <Typography variant="caption" className="font-bold" color="primary">Click to Snap to this Path</Typography>
                                                                        )}
                                                                    </Stack>
                                                                </Box>
                                                            </Stack>
                                                        </CardContent>
                                                    </Card>
                                                </Fade>
                                            )}
                                            <Typography variant="caption" className="font-bold opacity-60 uppercase mb-2 d-block">CHOOSE YOUR PREFERRED ROUTE</Typography>
                                            <Stack spacing={2} sx={{ mt: 1 }}>
                                                {suggestedRoutes.map((r, i) => (
                                                    <Card
                                                        key={i}
                                                        onClick={() => selectSuggestedRoute(i)}
                                                        sx={{
                                                            cursor: 'pointer',
                                                            borderRadius: 5,
                                                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                            border: selectedRouteIdx === i ? '2px solid' : '1px solid #e0e6ed',
                                                            borderColor: selectedRouteIdx === i ? 'primary.main' : '#e0e6ed',
                                                            bgcolor: selectedRouteIdx === i ? 'rgba(25,118,210,0.08)' : 'white',
                                                            boxShadow: selectedRouteIdx === i ? '0 10px 25px rgba(25,118,210,0.15)' : 'none',
                                                            '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 5px 15px rgba(0,0,0,0.05)' }
                                                        }}
                                                    >
                                                        <CardContent sx={{ p: 2.5 }}>
                                                            <Stack direction="row" spacing={2} alignItems="center">
                                                                <Avatar sx={{ bgcolor: selectedRouteIdx === i ? 'primary.main' : '#f0f4f8', color: selectedRouteIdx === i ? 'white' : 'text.secondary', width: 44, height: 44 }}>
                                                                    <RouteIcon />
                                                                </Avatar>
                                                                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                                                    <Typography variant="body1" className="font-bold" noWrap sx={{ color: selectedRouteIdx === i ? 'primary.main' : 'text.primary' }}>
                                                                        {r.summary.split(' / ')[0] || `Highway Route ${i + 1}`}
                                                                    </Typography>
                                                                    <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 0.5 }}>
                                                                        <Chip
                                                                            label={`${(r.distance / 1000).toFixed(1)} km`}
                                                                            size="small"
                                                                            sx={{ height: 20, fontSize: '0.65rem', fontWeight: 'bold', bgcolor: selectedRouteIdx === i ? 'primary.light' : '#f1f5f9', color: selectedRouteIdx === i ? 'white' : 'text.secondary' }}
                                                                        />
                                                                        <Typography variant="caption" color="text.secondary" className="font-medium" noWrap>
                                                                            {r.summary.includes('/') ? `via ${r.summary.split(' / ').slice(1).join(' & ')}` : 'Main Route'}
                                                                        </Typography>
                                                                    </Stack>
                                                                </Box>
                                                                {selectedRouteIdx === i && (
                                                                    <Fade in>
                                                                        <Avatar sx={{ width: 20, height: 20, bgcolor: 'success.main' }}>
                                                                            <DoneAll sx={{ fontSize: 12, color: 'white' }} />
                                                                        </Avatar>
                                                                    </Fade>
                                                                )}
                                                            </Stack>
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                            </Stack>
                                            <Button
                                                fullWidth
                                                variant="outlined"
                                                onClick={() => setMode('CUSTOM')}
                                                startIcon={<Brush />}
                                                sx={{ mt: 3, py: 1.5, borderRadius: 4, textTransform: 'none', borderStyle: 'dashed' }}
                                            >
                                                Not finding your road? Switch to Custom Draw
                                            </Button>
                                        </Box>
                                    )}

                                    {/* CUSTOM MODE POINT LIST */}
                                    {mode === 'CUSTOM' && (
                                        <Box>
                                            <Typography variant="caption" className="font-bold opacity-60 uppercase">STOPS SEQUENCE</Typography>
                                            <List sx={{ mt: 1 }}>
                                                {points.map((p, i) => (
                                                    <ListItem key={i} sx={{ px: 0, py: 0.5 }}>
                                                        <Avatar sx={{ width: 20, height: 20, fontSize: 10, mr: 2, bgcolor: i === 0 ? 'success.main' : i === points.length - 1 ? 'error.main' : 'primary.light' }}>{i + 1}</Avatar>
                                                        <ListItemText primary={<Typography variant="body2" className="font-bold">{p.label}</Typography>} />
                                                        <ListItemSecondaryAction><IconButton edge="end" onClick={() => removePoint(i)} size="small" color="error"><DeleteOutline fontSize="inherit" /></IconButton></ListItemSecondaryAction>
                                                    </ListItem>
                                                ))}
                                            </List>
                                        </Box>
                                    )}

                                    <Divider />
                                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                        <Box sx={{ flexGrow: 1 }}>
                                            <Typography variant="caption" className="font-bold opacity-60 uppercase mb-1 d-block">REUSE SAVED PATHS</Typography>
                                            <FormControl fullWidth size="small">
                                                <Select
                                                    value={selectedRouteId}
                                                    onChange={(e) => loadSavedRoute(e.target.value)}
                                                    sx={{ borderRadius: 3 }}
                                                    startAdornment={<History sx={{ mr: 1, opacity: 0.5 }} />}
                                                    displayEmpty
                                                >
                                                    <MenuItem value="" disabled>Select from previous trips</MenuItem>
                                                    {savedRoutes.map(r => <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>)}
                                                </Select>
                                            </FormControl>
                                        </Box>
                                        {points.length >= 2 && (
                                            <Tooltip title="Reverse Direction">
                                                <IconButton
                                                    onClick={handleReverseRoute}
                                                    sx={{ mt: 3, bgcolor: 'primary.light', border: '1px solid', borderColor: 'primary.main', color: 'primary.main', '&:hover': { bgcolor: 'primary.main', color: 'white' } }}
                                                >
                                                    <SwapCalls />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                    </Box>
                                </Stack>
                            )}

                            {activeStep === 1 && (
                                <Stack spacing={4}>
                                    <Box sx={{ p: 4, textAlign: 'center', bgcolor: 'primary.light', borderRadius: 6, color: 'primary.dark' }}>
                                        <TravelExplore sx={{ fontSize: 60, mb: 1 }} />
                                        <Typography variant="h6" className="font-bold">Path Finalised!</Typography>
                                        <Typography variant="body2">
                                            Total Distance: {suggestedRoutes[selectedRouteIdx] ? (suggestedRoutes[selectedRouteIdx].distance / 1000).toFixed(1) : '0.0'} KM
                                        </Typography>
                                    </Box>
                                    <Paper variant="outlined" sx={{ p: 3, borderRadius: 6 }}>
                                        <FormControlLabel control={<Switch checked={saveThisRoute} onChange={(e) => setSaveThisRoute(e.target.checked)} />} label="Save specifically for Saharanpur/Gangoh trips" />
                                        {saveThisRoute && <TextField fullWidth label="Route Name" variant="standard" placeholder="e.g. Saharanpur-Gangoh (Highway)" value={routeName} onChange={(e) => setRouteName(e.target.value)} sx={{ mt: 2 }} autoFocus />}
                                    </Paper>
                                </Stack>
                            )}

                            {activeStep === 2 && (
                                <Stack spacing={4}>
                                    <TextField fullWidth label="Departure" type="datetime-local" value={rideData.departureTime} onChange={(e) => setRideData({ ...rideData, departureTime: e.target.value })} InputLabelProps={{ shrink: true }} variant="filled" sx={{ borderRadius: 3 }} />
                                    <TextField fullWidth label="Total Seats" type="number" value={rideData.seatsAvailable} onChange={(e) => setRideData({ ...rideData, seatsAvailable: e.target.value })} variant="filled" sx={{ borderRadius: 3 }} />

                                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 4, bgcolor: 'rgba(25, 118, 210, 0.05)', border: '1px solid rgba(25, 118, 210, 0.2)' }}>
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={rideData.isRecurring}
                                                    onChange={(e) => setRideData({ ...rideData, isRecurring: e.target.checked })}
                                                    color="primary"
                                                />
                                            }
                                            label={
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <Repeat sx={{ color: 'primary.main' }} />
                                                    <Typography variant="body2" className="font-bold">Daily Routine (Mon - Fri)</Typography>
                                                </Stack>
                                            }
                                        />
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                            Save this as a template. We'll automatically post this ride every weekday morning.
                                        </Typography>
                                    </Paper>

                                </Stack>
                            )}
                        </Box>

                        <Box sx={{ p: 3, borderTop: '1px solid #eee' }}>
                            <Button
                                fullWidth
                                variant="contained"
                                size="large"
                                onClick={isCustomDraft ? () => calculateRoute(points) : handleNext}
                                sx={{ py: 2, borderRadius: 4, fontWeight: 'bold' }}
                                disabled={isCalculating || (activeStep === 0 && points.length < 2)}
                            >
                                {isCalculating ? 'Mapping Road...' : isCustomDraft ? 'Snap to Road (Generate)' : activeStep === 2 ? 'Launch Ride' : 'Continue'}
                            </Button>
                        </Box>
                    </Paper>
                </Slide>
            </Box>
        </Box>
    )
}

export default CreateRidePage
