import { useState, useEffect, useRef } from 'react'
import {
    TextField, Paper, List, ListItemButton, ListItemText, ListItemIcon,
    IconButton, InputAdornment, CircularProgress, Typography, Box, Chip, Stack
} from '@mui/material'
import { MyLocation, Search, LocationOn, Close, GpsFixed } from '@mui/icons-material'

/**
 * A reusable location search component with:
 * - Debounced Nominatim geocoding autocomplete
 * - "Use My Location" GPS button
 * - Fires onLocationSelect({ lat, lng, name }) on selection
 */
const LocationSearchInput = ({
    label = 'Search location',
    placeholder = 'Type a place name...',
    color = 'primary',
    icon = <LocationOn />,
    onLocationSelect,
    value = null,        // { lat, lng, name } or null
    onClear,
    disabled = false,
}) => {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState([])
    const [loading, setLoading] = useState(false)
    const [gpsLoading, setGpsLoading] = useState(false)
    const [showDropdown, setShowDropdown] = useState(false)
    const debounceRef = useRef(null)
    const containerRef = useRef(null)

    // Debounced Nominatim forward geocoding
    useEffect(() => {
        if (query.length < 3) {
            setResults([])
            setShowDropdown(false)
            return
        }

        if (debounceRef.current) clearTimeout(debounceRef.current)

        debounceRef.current = setTimeout(async () => {
            setLoading(true)
            try {
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=jsonv2&limit=6&countrycodes=in&addressdetails=1`
                )
                const data = await res.json()
                setResults(data.map(item => ({
                    name: item.display_name.split(',').slice(0, 3).join(', '),
                    fullName: item.display_name,
                    lat: parseFloat(item.lat),
                    lng: parseFloat(item.lon),
                    type: item.type
                })))
                setShowDropdown(true)
            } catch (err) {
                console.error('Geocoding search failed', err)
                setResults([])
            } finally {
                setLoading(false)
            }
        }, 400)

        return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
    }, [query])

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setShowDropdown(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleSelect = (place) => {
        setQuery('')
        setResults([])
        setShowDropdown(false)
        onLocationSelect?.({ lat: place.lat, lng: place.lng, name: place.name })
    }

    const handleUseMyLocation = () => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser.')
            return
        }
        setGpsLoading(true)
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords
                // Reverse geocode to get name
                let name = 'My Location'
                try {
                    const res = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18`
                    )
                    const data = await res.json()
                    name = data.name || data.display_name?.split(',')[0] || 'My Location'
                } catch (err) {
                    console.error('Reverse geocode failed', err)
                }
                setGpsLoading(false)
                setQuery('')
                setShowDropdown(false)
                onLocationSelect?.({ lat: latitude, lng: longitude, name })
            },
            (err) => {
                setGpsLoading(false)
                alert('Could not get your location. Please allow location access.')
                console.error('GPS error', err)
            },
            { enableHighAccuracy: true, timeout: 10000 }
        )
    }

    const handleClear = () => {
        setQuery('')
        setResults([])
        setShowDropdown(false)
        onClear?.()
    }

    // If a value is already set, show it as a chip instead of the input
    if (value) {
        return (
            <Paper variant="outlined" sx={{
                p: 1.5, borderRadius: 3, display: 'flex', alignItems: 'center', gap: 1.5,
                borderColor: `${color}.main`, bgcolor: `rgba(0,0,0,0.02)`
            }}>
                <Box sx={{ color: `${color}.main`, display: 'flex' }}>{icon}</Box>
                <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1 }}>{label}</Typography>
                    <Typography variant="body2" className="font-bold" noWrap>{value.name}</Typography>
                </Box>
                {!disabled && (
                    <IconButton size="small" onClick={handleClear}>
                        <Close fontSize="small" />
                    </IconButton>
                )}
            </Paper>
        )
    }

    return (
        <Box ref={containerRef} sx={{ position: 'relative' }}>
            <Paper variant="outlined" sx={{
                p: 1, borderRadius: 3,
                borderColor: showDropdown ? `${color}.main` : '#e0e6ed',
                transition: 'border-color 0.2s'
            }}>
                <Typography variant="caption" color="text.secondary" sx={{ px: 1, display: 'block', mb: 0.5 }}>{label}</Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                    <TextField
                        fullWidth
                        size="small"
                        placeholder={placeholder}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        disabled={disabled}
                        variant="standard"
                        sx={{ '& .MuiInputBase-root': { px: 1 } }}
                        InputProps={{
                            disableUnderline: true,
                            startAdornment: (
                                <InputAdornment position="start">
                                    {loading ? <CircularProgress size={18} /> : <Search sx={{ fontSize: 18, opacity: 0.5 }} />}
                                </InputAdornment>
                            ),
                        }}
                    />
                    <Chip
                        icon={gpsLoading ? <CircularProgress size={14} /> : <GpsFixed sx={{ fontSize: '16px !important' }} />}
                        label="Live"
                        size="small"
                        onClick={handleUseMyLocation}
                        disabled={disabled || gpsLoading}
                        color={color}
                        variant="outlined"
                        sx={{ fontWeight: 'bold', cursor: 'pointer', borderRadius: 2 }}
                    />
                </Stack>
            </Paper>

            {/* Autocomplete Dropdown */}
            {showDropdown && results.length > 0 && (
                <Paper sx={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 2000, mt: 0.5,
                    borderRadius: 3, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', maxHeight: 250, overflowY: 'auto',
                    border: '1px solid #eee'
                }}>
                    <List dense disablePadding>
                        {results.map((place, idx) => (
                            <ListItemButton key={idx} onClick={() => handleSelect(place)} sx={{ py: 1.5 }}>
                                <ListItemIcon sx={{ minWidth: 36 }}>
                                    <LocationOn color={color} sx={{ fontSize: 20 }} />
                                </ListItemIcon>
                                <ListItemText
                                    primary={<Typography variant="body2" className="font-bold" noWrap>{place.name}</Typography>}
                                    secondary={<Typography variant="caption" color="text.secondary" noWrap>{place.fullName}</Typography>}
                                />
                            </ListItemButton>
                        ))}
                    </List>
                </Paper>
            )}
        </Box>
    )
}

export default LocationSearchInput
