import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
    Container, Paper, Typography, Box, Grid2 as Grid, Card, CardContent,
    Avatar, Chip, Button, Divider, Fab, Tooltip, Zoom, Fade, Stack, Alert, AlertTitle,
    CircularProgress
} from '@mui/material'
import {
    DirectionsCar, Person, Navigation, Message, Security,
    Phone, AccessTime, LocalPolice, Warning, MyLocation, ShareLocation, Close,
    ThumbUp, ThumbDown, Send
} from '@mui/icons-material'
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material'
import CampusMap, { StartIcon, RiderLiveIcon, EndIcon, PassengerLiveIcon, PickupIcon } from '../components/map/CampusMap'
import ChatBubble from '../components/chat/ChatBubble'
import wsService from '../utils/websocketService'
import { useSelector } from 'react-redux'
import axios from '../api/axiosInstance'

const InfoCard = ({ icon, label, value }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main', width: 40, height: 40 }}>
            {icon}
        </Avatar>
        <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 'bold', textTransform: 'uppercase' }}>
                {label}
            </Typography>
            <Typography variant="body1" className="font-bold">
                {value}
            </Typography>
        </Box>
    </Box>
)

const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in metres
}

const LiveTrackingPage = () => {
    const { rideId } = useParams()
    const navigate = useNavigate()
    const { user } = useSelector(state => state.auth)
    const [ride, setRide] = useState(null)
    const [requests, setRequests] = useState([])
    const [localGPS, setLocalGPS] = useState(null)
    const [hasAutoCentered, setHasAutoCentered] = useState(false)
    const [participantsLocations, setParticipantsLocations] = useState({}) // { userId: { lat, lng, role, name } }
    const [sosSent, setSosSent] = useState(false)
    const [isSharingLocation, setIsSharingLocation] = useState(false)
    const [isCompleting, setIsCompleting] = useState(false)
    const [showFeedback, setShowFeedback] = useState(false)
    const [feedbackIndex, setFeedbackIndex] = useState(0) // For rating multiple passengers
    const [reportText, setReportText] = useState('')
    const [isReporting, setIsReporting] = useState(false)
    const [gpsError, setGpsError] = useState(null)
    const [isNavigationMode, setIsNavigationMode] = useState(true) // Follow me strictly

    // Check if current user is the rider (string-safe comparison)
    const isRider = ride?.riderId?.toString() === user?.id?.toString()
    const watchIdRef = useRef(null)
    const localGPSRef = useRef(null) // Ref mirror for interval-based sync
    const backendFallbackCalledRef = useRef(false) // Prevent duplicate backend calls

    // Keep ref in sync with state
    useEffect(() => { localGPSRef.current = localGPS }, [localGPS])

    // Track GPS
    useEffect(() => {
        if (!navigator.geolocation) {
            setGpsError('Geolocation is not supported by your browser')
            return
        }

        const handleSuccess = (pos) => {
            const { latitude: lat, longitude: lng, accuracy, heading, speed } = pos.coords
            console.log(`📡 GPS Update: ${lat.toFixed(5)}, ${lng.toFixed(5)} (±${accuracy}m)`)

            // Prevent wild jumps
            if (localGPSRef.current && !localGPSRef.current.manual) {
                const dist = calculateDistance(
                    localGPSRef.current.lat, localGPSRef.current.lng, lat, lng
                )
                if (dist > 500 && accuracy > 100) {
                    console.warn(`🚩 Ignoring wild GPS jump: ${Math.round(dist)}m away`)
                    return
                }
            }

            setLocalGPS({ lat, lng, accuracy, heading, speed, manual: false })
            setGpsError(null)
            
            // Auto-center map on first lock
            if (!hasAutoCentered && lat && lng) {
                setHasAutoCentered(true)
            }
        }

        const handleError = (err) => {
            console.error('GPS Error:', err)
            if (err.code === 1) setGpsError('Please allow location access')
            else if (err.code === 2) setGpsError('Position unavailable. Are you indoors?')
            else if (err.code === 3) setGpsError('GPS timeout. Getting signal...')
        }

        // 1. Get initial position immediately
        navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
            enableHighAccuracy: true, maximumAge: 0, timeout: 5000
        })

        // 2. Watch for continuous updates
        watchIdRef.current = navigator.geolocation.watchPosition(handleSuccess, handleError, {
            enableHighAccuracy: true, maximumAge: 0, timeout: 5000
        })

        return () => {
            if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current)
        }
    }, [hasAutoCentered])

    // Manual Calibration Button
    const calibrateGPS = () => {
        setGpsError('Scanning for precise location...')
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const { latitude: lat, longitude: lng, accuracy, heading, speed } = pos.coords
                    setLocalGPS({ lat, lng, accuracy, heading, speed, manual: false })
                    setGpsError(null)
                    setHasAutoCentered(true)
                },
                (err) => {
                    console.error('Calibration failed:', err)
                    setGpsError('Could not get precise location. Try stepping outside.')
                },
                { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
            )
        }
    }

    // Handle map click
    const handleMapClick = (latlng) => {
        const { lat, lng } = latlng
        setLocalGPS({ lat, lng, accuracy: 1, manual: true })
        setGpsError(null)
        console.log('📍 Manual Location Set:', lat, lng)
    }

    const handleStartTrip = async () => {
        try {
            const res = await axios.put(`/rides/${rideId}/start`)
            setRide(res.data)
            setIsSharingLocation(true)
        } catch (err) {
            console.error('Failed to start trip', err)
            alert('Error starting trip')
        }
    }

    const handleEndTrip = async () => {
        if (isCompleting) return
        if (!window.confirm("Complete this journey?")) return
        
        setIsCompleting(true)
        setIsSharingLocation(false) // Stop geofencing/sync immediately
        
        try {
            if (isRider) {
                // Rider ends the entire ride
                const res = await axios.put(`/rides/${rideId}/complete`)
                setRide(res.data)
                
                // Skip feedback if no passengers
                if (requests.length === 0) {
                    alert("Trip completed successfully!")
                    navigate('/dashboard')
                } else {
                    setShowFeedback(true)
                }
            } else {
                // Passenger ends their individual session
                await axios.put(`/ride-requests/ride/${rideId}/complete`)
                setShowFeedback(true)
            }
        } catch (err) {
            console.error('Failed to end trip', err)
            setIsCompleting(false)
            setIsSharingLocation(true) // Re-enable if it failed
            alert('Error completing trip')
        }
    }

    const submitFeedback = async (impact) => {
        const target = isRider ? requests[feedbackIndex]?.passenger : { id: ride.riderId, name: ride.riderName }
        if (!target) return

        try {
            await axios.post('/feedback', {
                rideId,
                toUserId: target.id,
                pointImpact: impact,
                isReport: impact < 0 && reportText.length > 0,
                reportText: impact < 0 ? reportText : ""
            })
        } catch (err) {
            console.error('Feedback failed', err)
            if (err.response?.status === 409) {
                console.log('Feedback already submitted for this participant. Proceeding.')
            } else {
                alert('Error submitting feedback')
                return // Stop progression on real errors
            }
        }

        // Advance to next or finish
        if (isRider && feedbackIndex < requests.length - 1) {
            setFeedbackIndex(prev => prev + 1)
            setReportText('')
            setIsReporting(false)
        } else {
            setShowFeedback(false)
            alert("Thank you! Trip history updated.")
            navigate('/dashboard')
        }
    }

    const handleSOS = async () => {
        if (window.confirm('⚠️ CRITICAL: Trigger SOS Emergency?\n\nThis will immediately alert campus security and university admins with your live location.')) {
            try {
                await axios.post(`/trip/sos/${rideId}`)
                setSosSent(true)
            } catch (err) {
                console.error('SOS error:', err)
                alert('Connection error. Please call campus security directly if in immediate danger.')
            }
        }
    }

    const handleResolveSOS = async () => {
        if (window.confirm('Mark emergency as RESOLVED? This will clear the alert for all participants and security.')) {
            try {
                await axios.post(`/trip/sos/${rideId}/resolve`)
                setSosSent(false)
            } catch (err) {
                console.error('Failed to resolve SOS', err)
                alert('Connection error. Could not resolve SOS.')
            }
        }
    }

    const toggleLocationSharing = () => {
        setIsSharingLocation(!isSharingLocation)
    }

    const handleShareGuardian = async () => {
        try {
            const res = await axios.put(`/rides/${rideId}/share?active=true`)
            const token = res.data.trackingToken
            const shareUrl = `${window.location.origin}/track/${token}`

            if (navigator.share) {
                await navigator.share({
                    title: 'CampusRide Live Tracking',
                    text: `Hey, I'm taking a CampusRide! Follow my live location here for safety:`,
                    url: shareUrl,
                })
            } else {
                await navigator.clipboard.writeText(shareUrl)
                alert('Tracking link copied to clipboard! Send it to your guardian.')
            }
        } catch (err) {
            console.error('Sharing failed', err)
            alert('Failed to generate sharing link.')
        }
    }

    // FIX 3: Removed raw GPS probe from fetchData — Smart Anchor + watchPosition handle it
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [rideRes, reqRes] = await Promise.all([
                    axios.get(`/rides/${rideId}`),
                    axios.get(`/ride-requests/ride/${rideId}`)
                ])
                const fetchedRide = rideRes.data
                setRide(fetchedRide)

                if (fetchedRide.emergencyActive) {
                    setSosSent(true)
                }

                // Auto-share location ONLY when trip is IN_PROGRESS
                const isTripActive = fetchedRide.status === 'IN_PROGRESS' || fetchedRide.emergencyActive
                setIsSharingLocation(isTripActive)

                // Filter only confirmed requests
                const confirmed = reqRes.data.filter(r => r.riderAccepted && r.passengerAccepted)
                setRequests(confirmed)

                // Initialize rider location from start point ONLY if we don't have it yet
                const riderId = fetchedRide.riderId?.toString()
                if (riderId) {
                    setParticipantsLocations(prev => {
                        if (prev[riderId]) return prev // Don't overwrite live data
                        return {
                            ...prev,
                            [riderId]: {
                                lat: fetchedRide.startLat,
                                lng: fetchedRide.startLng,
                                role: 'RIDER',
                                name: fetchedRide.riderName
                            }
                        }
                    })
                }
            } catch (err) {
                console.error('Failed to fetch tracking data', err)
            }
        }
        fetchData()

        wsService.connect(() => {
            // 1. Subscribe to Location Updates
            wsService.subscribe(`/topic/ride/${rideId}`, (data) => {
                const incomingId = data.userId || data.id // Fallback ID
                if (incomingId) {
                    const uid = incomingId.toString()
                    const isRiderUpdate = uid === ride?.riderId?.toString()
                    console.log(`📍 Received location for ${uid}: ${data.lat}, ${data.lng} (${data.role})${isRiderUpdate ? ' [RIDER]' : ''}`)
                    
                    setParticipantsLocations(prev => {
                        const isMatch = !!prev[uid]
                        if (isMatch) console.log(`   └─ 🎯 TRACKING HIT: Updating existing marker for ${uid}`)
                        return {
                            ...prev,
                            [uid]: {
                                lat: data.lat,
                                lng: data.lng,
                                role: data.role,
                                name: data.name || 'Anonymous'
                            }
                        }
                    })
                }
            })

            wsService.subscribe(`/topic/ride/${rideId}/sos`, (data) => {
                console.log('🚨 SOS Emergency received:', data)
                setSosSent(true)
                setRide(prev => prev ? { ...prev, emergencyActive: true } : null)
            })

            // 3. Subscribe to SOS Resolution
            wsService.subscribe(`/topic/ride/${rideId}/sos/resolved`, (data) => {
                console.log('✅ SOS Resolved received:', data)
                setSosSent(false)
                setRide(prev => prev ? { ...prev, emergencyActive: false } : null)
            })

            // 4. Subscribe to Ride Status Changes (Start/Complete)
            wsService.subscribe(`/topic/ride/${rideId}/status`, (data) => {
                console.log('🔄 Ride status update:', data)
                if (data.status) {
                    setRide(prev => prev ? { ...prev, status: data.status } : null)
                    
                    if (data.status === 'IN_PROGRESS') {
                        setIsSharingLocation(true)
                    } else if (data.status === 'COMPLETED' || data.status === 'CANCELLED' || data.status === 'OPEN') {
                        setIsSharingLocation(false)
                        if (data.status !== 'OPEN') setShowFeedback(true)
                    }
                }
            })
        })
    }, [rideId])

    // FIX 1: Removed duplicate calculateDistance — using module-level version


    // Visibility API: Instant sync when returning to tab
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && isSharingLocation) {
                console.log("Tab focused, triggering instant location sync...")
                navigator.geolocation.getCurrentPosition(() => {
                    lastSyncTimeRef.current = 0 // Reset throttle to force next watchPosition update
                })
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
    }, [isSharingLocation])

    // BeforeUnload: Prevent accidental tab closure
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (ride?.status === 'IN_PROGRESS') {
                e.preventDefault()
                e.returnValue = ''
            }
        }
        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [ride?.status])

    // FIX 5: WebSocket sync via setInterval (reliable 5s broadcasts)
    useEffect(() => {
        if (!isSharingLocation || !ride || !user) return

        const syncInterval = setInterval(() => {
            const gps = localGPSRef.current
            if (!gps || !wsService.client?.connected) return

            wsService.send('/app/ride/location', {
                rideId,
                userId: user.id,
                name: user.name,
                role: isRider ? 'RIDER' : 'PASSENGER',
                lat: gps.lat,
                lng: gps.lng,
                heading: gps.heading,
                accuracy: gps.accuracy
            })

            // Geofencing check
            if (ride.endLat && ride.endLng && !isCompleting) {
                const dist = calculateDistance(gps.lat, gps.lng, ride.endLat, ride.endLng)
                if (dist < 50) {
                    handleEndTrip()
                }
            }
        }, 5000)

        return () => clearInterval(syncInterval)
    }, [isSharingLocation, ride, user, isRider, rideId])

    if (!ride) return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
            <CircularProgress />
        </Box>
    )

    const markers = []

    // LAYER 1: STATIC ROUTE LAYER
    // Rider Start (Green)
    markers.push({ 
        id: 'start-point',
        position: [ride.startLat, ride.startLng], 
        popup: `Rider's Start: ${ride.riderName}`, 
        icon: StartIcon 
    })

    // Destination (Red)
    markers.push({ 
        id: 'end-point',
        position: [ride.endLat, ride.endLng], 
        popup: 'End Point: Destination', 
        icon: EndIcon 
    })

    // Passenger Pickups (Blue)
    requests.forEach((req, idx) => {
        markers.push({ 
            id: `pickup-${req.passenger.id}`,
            position: [req.pickupLat, req.pickupLng], 
            popup: `Pickup Point: ${req.passenger.name}`, 
            icon: PickupIcon 
        })
    })

    // LAYER 2: DYNAMIC LIVE TRACKING LAYER
    const riderIdStr = ride.riderId?.toString()
    const userIdStr = user?.id?.toString()
    const riderLive = riderIdStr ? participantsLocations[riderIdStr] : null
    
    // Draw Rider (Only if "I" am not the rider)
    if (userIdStr !== riderIdStr) {
        if (riderLive) {
            markers.push({ 
                id: `live-rider-${riderIdStr}`,
                position: [riderLive.lat, riderLive.lng], 
                popup: `${ride.riderName} (Rider Live)`, 
                icon: RiderLiveIcon // Red Pulsing
            })
        }
    }

    // Draw Passengers
    requests.forEach((req, index) => {
        const passengerIdStr = req.passenger.id?.toString()
        const passengerLive = participantsLocations[passengerIdStr]
        
        // Skip myself from DRAWING as a separate participant icon (I have the blue pulse "ME" icon)
        if (passengerIdStr === userIdStr) return

        if (passengerLive) {
            // Simulation Offset if overlapping
            const isSimulating = riderLive && Math.abs(passengerLive.lat - riderLive.lat) < 0.00001 && Math.abs(passengerLive.lng - riderLive.lng) < 0.00001
            const offset = isSimulating ? 0.00015 * (index + 1) : 0

            markers.push({ 
                id: `live-passenger-${passengerIdStr}`,
                position: [passengerLive.lat + offset, passengerLive.lng + offset], 
                popup: `${req.passenger.name} (Passenger Live)`, 
                icon: PassengerLiveIcon // Yellow Pulsing
            })

            // PROXIMITY CHECK: 30m Radius to Pickup Point
            const distToPickup = calculateDistance(passengerLive.lat, passengerLive.lng, req.pickupLat, req.pickupLng)
            if (distToPickup < 30) {
                console.log(`🎯 Proximity Alert: ${req.passenger.name} is at the pickup point!`)
            }
        }
    })

    // LAYER 3: "ME" Marker (Pulsing blue dot on top)
    if (localGPS) {
        markers.push({
            id: 'me-pulsing-dot',
            position: [localGPS.lat, localGPS.lng],
            popup: 'You are here',
            icon: 'USER_LOCATION',
            accuracy: localGPS.accuracy,
            heading: localGPS.heading
        })

        // PROXIMITY CHECK FOR ME: If I am a passenger, check distance to my own pickup
        if (!isRider) {
            const myRequest = requests.find(r => r.passenger.id.toString() === userIdStr)
            if (myRequest) {
                const myDist = calculateDistance(localGPS.lat, localGPS.lng, myRequest.pickupLat, myRequest.pickupLng)
                if (myDist < 30) {
                    console.log(`🎯 You have reached the pickup point!`)
                }
            }
        }
    }

    const getDistanceBetween = (p1, p2) => {
        if (!p1 || !p2) return null;
        const dist = calculateDistance(p1.lat, p1.lng, p2.lat, p2.lng);
        return dist > 1000 ? `${(dist / 1000).toFixed(1)} km` : `${Math.round(dist)} m`;
    }

    // Centering logic: 
    // 1. Follow ME if I'm navigating/auto-centering
    // 2. Follow RIDER if I'm a passenger and not navigating myself
    const centerPoint = (localGPS && !localGPS.suspicious && (isNavigationMode || !hasAutoCentered)) 
        ? [localGPS.lat, localGPS.lng] 
        : (riderLive ? [riderLive.lat, riderLive.lng] : [ride.startLat, ride.startLng])

    const mapCenter = centerPoint

    return (
        <Container maxWidth="xl" sx={{ mt: 4, pb: 10 }}>
            <Fade in timeout={800}>
                <Grid container spacing={4}>
                    {/* Left Side: Map and Status */}
                    <Grid size={{ xs: 12, md: 8 }}>
                        {gpsError && (
                            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setGpsError(null)}>
                                <AlertTitle>Location Error</AlertTitle>
                                {gpsError}
                            </Alert>
                        )}
                        
                        <Paper sx={{
                            borderRadius: 6,
                            overflow: 'hidden',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                            border: '1px solid rgba(0,0,0,0.05)',
                            position: 'relative',
                            height: 600
                        }}>
                            {/* Floating Map Status Bar */}
                            <Box sx={{
                                position: 'absolute',
                                top: 24,
                                left: 24,
                                right: 24,
                                zIndex: 1000,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 2,
                                pointerEvents: 'none'
                            }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ width: '100%' }}>
                                    <Card sx={{
                                        bgcolor: 'rgba(255,255,255,0.95)',
                                        backdropFilter: 'blur(10px)',
                                        borderRadius: 4,
                                        px: 2, py: 1,
                                        boxShadow: 3,
                                        pointerEvents: 'auto'
                                    }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <Box sx={{
                                                width: 10, height: 10,
                                                bgcolor: ride.emergencyActive ? 'error.main' :
                                                    ride.status === 'IN_PROGRESS' ? 'success.main' :
                                                        ride.status === 'COMPLETED' ? 'text.disabled' : 'warning.main',
                                                borderRadius: '50%',
                                                animation: (ride.status === 'IN_PROGRESS' || ride.emergencyActive) ? 'pulse-green 2s infinite' : 'none'
                                            }} />
                                            <Typography variant="body2" className="font-bold uppercase tracking-wider">
                                                {ride.emergencyActive ? '🚨 EMERGENCY SOS ACTIVE' :
                                                    ride.status === 'OPEN' ? 'Waiting to Start' :
                                                        ride.status === 'IN_PROGRESS' ? 'Trip in Progress • Live' :
                                                            ride.status === 'COMPLETED' ? 'Trip Completed' : ride.status}
                                            </Typography>
                                        </Box>
                                    </Card>

                                    {sosSent && (
                                        <Card sx={{
                                            bgcolor: 'error.main',
                                            color: 'white',
                                            borderRadius: 4,
                                            px: 2, py: 1,
                                            boxShadow: 3,
                                            animation: 'shake 0.5s infinite',
                                            pointerEvents: 'auto'
                                        }}>
                                            <Typography variant="body2" className="font-bold text-center">
                                                🚨 SOS SIGNAL TRANSMITTED
                                            </Typography>
                                        </Card>
                                    )}
                                </Stack>

                                {ride.emergencyActive && (
                                    <Alert severity="error" variant="filled" sx={{ pointerEvents: 'auto', borderRadius: 4, boxShadow: 6 }}>
                                        <AlertTitle className="font-bold">EMERGENCY ALERT</AlertTitle>
                                        Campus Security and University Admins have been notified of your live location and situation. Help is on the way.
                                    </Alert>
                                )}
                            </Box>

                            <Box sx={{
                                position: 'absolute',
                                bottom: 24,
                                right: 24,
                                zIndex: 1000,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 2,
                                pointerEvents: 'auto'
                            }}>
                                <Tooltip title="Force Recalibrate GPS">
                                    <Fab 
                                        color="warning" 
                                        size="small" 
                                        onClick={calibrateGPS}
                                    >
                                        <ShareLocation />
                                    </Fab>
                                </Tooltip>
                                <Tooltip title={isNavigationMode ? "Disable Auto-Follow" : "Enable Auto-Follow"}>
                                    <Fab 
                                        color={isNavigationMode ? "primary" : "default"} 
                                        size="small" 
                                        onClick={() => {
                                            const newMode = !isNavigationMode;
                                            setIsNavigationMode(newMode);
                                            if (newMode) setHasAutoCentered(false); // Force a recenter if turning on
                                        }}
                                    >
                                        <Navigation sx={{ transform: isNavigationMode ? 'rotate(0deg)' : 'rotate(45deg)', transition: '0.3s' }} />
                                    </Fab>
                                </Tooltip>
                                <Tooltip title="Center on Me">
                                    <Fab 
                                        color="secondary" 
                                        size="small" 
                                        onClick={() => {
                                            if (localGPS) {
                                                setHasAutoCentered(false)
                                                setIsNavigationMode(true)
                                            }
                                        }}
                                    >
                                        <MyLocation />
                                    </Fab>
                                </Tooltip>
                            </Box>

                            <CampusMap
                                markers={markers}
                                polyline={ride.routeCoordinates}
                                center={mapCenter}
                                zoom={hasAutoCentered ? undefined : (localGPS && !localGPS.suspicious ? 18 : 15)}
                                onMapClick={(latlng) => {
                                    handleMapClick(latlng);
                                    setHasAutoCentered(true);
                                    setIsNavigationMode(false); // Stop following on click
                                }}
                                onZoom={() => {
                                    setHasAutoCentered(true);
                                    setIsNavigationMode(false); // Stop following on zoom
                                }}
                                style={{ height: '100%', width: '100%' }}
                            />

                            {/* Coordinate Debug Overlay — FIX 6: pointerEvents auto */}
                            <Box sx={{ 
                                position: 'absolute', top: 20, right: 20, 
                                bgcolor: 'rgba(0,0,0,0.8)', color: 'white', 
                                p: 1.5, borderRadius: 3, fontSize: '0.75rem',
                                zIndex: 1100, pointerEvents: 'auto',
                                border: '1px solid rgba(255,255,255,0.2)',
                                backdropFilter: 'blur(5px)',
                                minWidth: 150
                            }}>
                                <Typography variant="caption" sx={{ display: 'block', fontWeight: 'bold', mb: 0.5, color: '#4fc3f7' }}>
                                    📡 GPS STATUS ({isRider ? 'RIDER' : 'PASSENGER'})
                                </Typography>
                                {localGPS ? (
                                    <>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span>Latitude:</span>
                                            <span style={{ fontWeight: 'bold' }}>{localGPS.lat.toFixed(5)}</span>
                                        </Box>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span>Longitude:</span>
                                            <span style={{ fontWeight: 'bold' }}>{localGPS.lng.toFixed(5)}</span>
                                        </Box>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5, pt: 0.5, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                            <span>Accuracy:</span>
                                            <span style={{ color: localGPS.accuracy < 30 ? '#4caf50' : localGPS.accuracy < 100 ? '#ffeb3b' : '#ff9800' }}>
                                                ±{Math.round(localGPS.accuracy)}m
                                            </span>
                                        </Box>
                                        {localGPS.speed !== null && (
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span>Speed:</span>
                                                <span>{Math.round(localGPS.speed * 3.6)} km/h</span>
                                            </Box>
                                        )}
                                        <Typography variant="caption" sx={{ fontSize: '0.6rem', mt: 1, display: 'block', opacity: 0.7 }}>
                                            {localGPS.manual ? '🔵 Manually Set (Click)' :
                                             localGPS.accuracy > 500 ? '🟡 Low Precision (WiFi/IP)' : 
                                             '🟢 High Precision (GPS)'}
                                        </Typography>
                                        
                                        {localGPS.manual && (
                                            <Button 
                                                variant="contained" 
                                                size="small" 
                                                color="info"
                                                fullWidth
                                                sx={{ mt: 1, py: 0, height: 20, fontSize: '0.6rem' }}
                                                onClick={() => setLocalGPS(null)}
                                            >
                                                Reset to Auto
                                            </Button>
                                        )}
                                    </>
                                ) : (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <CircularProgress size={10} color="inherit" />
                                        <span>Searching for GPS...</span>
                                    </Box>
                                )}
                            </Box>
                        </Paper>
                    </Grid>

                    {/* Right Side: Ride Details & Participants */}
                    <Grid size={{ xs: 12, md: 4 }}>
                        <Stack spacing={3}>
                            <Paper sx={{ p: 3, borderRadius: 6, boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                                <Typography variant="h5" className="font-bold" gutterBottom>
                                    Ride Details
                                </Typography>
                                <Divider sx={{ mb: 3 }} />

                                <InfoCard icon={<DirectionsCar />} label="Vehicle" value={ride.vehicleType || 'Not Specified'} />
                                <InfoCard icon={<AccessTime />} label="Departure" value={new Date(ride.departureTime).toLocaleTimeString()} />
                                <InfoCard icon={<Person />} label="Rider" value={ride.riderName} />

                                <Box sx={{ mt: 4 }}>
                                    <Typography variant="subtitle2" color="text.secondary" gutterBottom className="font-bold">
                                        PARTICIPANTS ({requests.length})
                                    </Typography>
                                    <Stack spacing={1}>
                                        {requests.map((req, idx) => {
                                            const passengerLoc = participantsLocations[req.passenger.id]
                                            const distance = getDistanceBetween(localGPS || riderLive, passengerLoc)
                                            return (
                                                <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Chip
                                                        avatar={<Avatar>{req.passenger.name.charAt(0)}</Avatar>}
                                                        label={req.passenger.name}
                                                        variant="outlined"
                                                        color={req.passenger.id === user?.id ? "primary" : "default"}
                                                        sx={{ justifyContent: 'flex-start', p: 0.5, borderRadius: 2, flex: 1 }}
                                                    />
                                                    {distance && (
                                                        <Typography variant="caption" color="primary.main" className="font-bold">
                                                            {distance} away
                                                        </Typography>
                                                    )}
                                                </Box>
                                            )
                                        })}
                                    </Stack>

                                    <Stack direction="row" spacing={2} sx={{ mt: 4 }}>
                                        {isRider ? (
                                            ride.status === 'OPEN' ? (
                                                <Button
                                                    fullWidth variant="contained"
                                                    color="success"
                                                    startIcon={<ShareLocation />}
                                                    onClick={handleStartTrip}
                                                    sx={{ borderRadius: 3, py: 1.5, fontWeight: 'bold' }}
                                                >
                                                    Start Trip
                                                </Button>
                                            ) : (ride.status === 'IN_PROGRESS' || ride.emergencyActive) ? (
                                                <Button
                                                    fullWidth variant="contained"
                                                    color="error"
                                                    startIcon={<Close />}
                                                    onClick={handleEndTrip}
                                                    sx={{ borderRadius: 3, py: 1.5, fontWeight: 'bold' }}
                                                >
                                                    End Trip
                                                </Button>
                                            ) : (
                                                <Button
                                                    fullWidth variant="outlined"
                                                    disabled
                                                    sx={{ borderRadius: 3, py: 1.5, fontWeight: 'bold' }}
                                                >
                                                    Trip Completed
                                                </Button>
                                            )
                                        ) : (
                                            <Button
                                                fullWidth variant={isSharingLocation ? "contained" : "outlined"}
                                                color={isSharingLocation ? "error" : "primary"}
                                                startIcon={isSharingLocation ? <Close /> : <MyLocation />}
                                                onClick={() => {
                                                    if (isSharingLocation) {
                                                        if (window.confirm("Stop sharing and end your trip tracking?")) {
                                                            setIsSharingLocation(false);
                                                            setShowFeedback(true);
                                                        }
                                                    } else {
                                                        setIsSharingLocation(true);
                                                    }
                                                }}
                                                sx={{ borderRadius: 3, py: 1.5, fontWeight: 'bold' }}
                                            >
                                                {isSharingLocation ? "End Trip / Stop Sharing" : "Start Trip / Share Location"}
                                            </Button>
                                        )}
                                        <Button
                                            fullWidth variant="outlined"
                                            color="info"
                                            startIcon={<ShareLocation />}
                                            onClick={handleShareGuardian}
                                            sx={{ borderRadius: 3, py: 1.5, fontWeight: 'bold' }}
                                        >
                                            Share Journey
                                        </Button>
                                        <Button
                                            fullWidth variant="outlined"
                                            startIcon={<Phone />}
                                            sx={{ borderRadius: 3, py: 1.5, fontWeight: 'bold' }}
                                        >
                                            Call
                                        </Button>
                                    </Stack>

                                    <Button
                                        fullWidth variant="contained"
                                        color="error"
                                        size="large"
                                        startIcon={<Security />}
                                        onClick={ride.emergencyActive ? handleResolveSOS : handleSOS}
                                        disabled={ride.status === 'COMPLETED'}
                                        sx={{
                                            mt: 2,
                                            borderRadius: 3,
                                            py: 2,
                                            fontWeight: 'bold',
                                            boxShadow: ride.emergencyActive ? '0 8px 30px #f44336' : '0 8px 20px rgba(211, 47, 47, 0.4)',
                                            animation: ride.emergencyActive ? 'pulse-red 1s infinite' : 'none',
                                            bgcolor: ride.emergencyActive ? '#d32f2f' : 'error.main',
                                            '&:hover': { bgcolor: ride.emergencyActive ? '#b71c1c' : 'error.dark' }
                                        }}
                                    >
                                        {ride.emergencyActive ? 'RESOLVE EMERGENCY (AM SAFE)' : 'SOS EMERGENCY BRAKE'}
                                    </Button>
                                </Box>
                            </Paper>
                        </Stack>
                    </Grid>
                </Grid>
            </Fade>

            <ChatBubble rideId={rideId} />

            {/* Mandatory Feedback Modal */}
            <Dialog
                open={showFeedback}
                maxWidth="xs"
                fullWidth
                PaperProps={{
                    sx: { borderRadius: 6, p: 2 }
                }}
            >
                <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold' }}>
                    Mandatory Trip Feedback
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ textAlign: 'center', mb: 3 }}>
                        <Typography variant="body1" gutterBottom>
                            How was your experience with:
                        </Typography>
                        <Chip
                            label={isRider ? requests[feedbackIndex]?.passenger?.name : ride.riderName}
                            color="primary"
                            variant="filled"
                            sx={{ fontWeight: 'bold', fontSize: '1.1rem', py: 2.5, px: 1, borderRadius: 3 }}
                        />
                    </Box>

                    <Stack spacing={2}>
                        <Button
                            fullWidth
                            variant="contained"
                            color="success"
                            size="large"
                            startIcon={<ThumbUp />}
                            onClick={() => submitFeedback(5)}
                            sx={{ borderRadius: 4, py: 2, fontWeight: 'bold' }}
                        >
                            Positive (+5 Points)
                        </Button>

                        <Button
                            fullWidth
                            variant="outlined"
                            color="error"
                            size="large"
                            startIcon={<ThumbDown />}
                            onClick={() => setIsReporting(true)}
                            sx={{ borderRadius: 4, py: 2, fontWeight: 'bold' }}
                        >
                            Negative (-5 Points)
                        </Button>

                        {isReporting && (
                            <Fade in>
                                <Box sx={{ mt: 2 }}>
                                    <TextField
                                        fullWidth
                                        multiline
                                        rows={3}
                                        placeholder="Reason for report (Will be sent to Admin)..."
                                        variant="outlined"
                                        value={reportText}
                                        onChange={(e) => setReportText(e.target.value)}
                                        sx={{ mb: 2 }}
                                    />
                                    <Button
                                        fullWidth
                                        variant="contained"
                                        color="error"
                                        onClick={() => submitFeedback(-5)}
                                        disabled={!reportText.trim()}
                                        sx={{ borderRadius: 3 }}
                                    >
                                        Submit Negative Review
                                    </Button>
                                </Box>
                            </Fade>
                        )}
                    </Stack>
                </DialogContent>
            </Dialog>

            <style>
                {`
                @keyframes pulse-green {
                    0% { box-shadow: 0 0 0 0 rgba(76, 175, 137, 0.7); }
                    70% { box-shadow: 0 0 0 10px rgba(76, 175, 137, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(76, 175, 137, 0); }
                }
                @keyframes pulse-red {
                    0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(211, 47, 47, 0.7); }
                    50% { transform: scale(1.02); box-shadow: 0 0 0 15px rgba(211, 47, 47, 0); }
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
    )
}

export default LiveTrackingPage
