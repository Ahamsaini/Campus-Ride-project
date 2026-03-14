import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { 
    Container, Grid, Paper, Typography, Box, Avatar, 
    Card, CardContent, Button, Divider, LinearProgress, Stack,
    IconButton, TextField, Chip, Fade, useMediaQuery, useTheme
} from '@mui/material'
import { 
    Person, Email, Phone, School, Work, Badge, 
    Verified, Star, DirectionsCar, Map, TrendingUp,
    Edit, Save, Cancel, CameraAlt, Security
} from '@mui/icons-material'
import axios from '../api/axiosInstance'

const StatCard = ({ icon, label, value, unit, color }) => (
    <Card sx={{ 
        borderRadius: 6, height: '100%', 
        boxShadow: '0 10px 30px rgba(0,0,0,0.03)',
        border: '1px solid rgba(0,0,0,0.05)',
        transition: '0.3s',
        '&:hover': { transform: 'translateY(-5px)', boxShadow: '0 20px 40px rgba(0,0,0,0.08)' }
    }}>
        <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1.5 }}>
                <Avatar sx={{ bgcolor: `${color}.light`, color: `${color}.main`, width: 44, height: 44 }}>
                    {icon}
                </Avatar>
                <Typography variant="body2" color="text.secondary" className="font-bold uppercase tracking-wider">
                    {label}
                </Typography>
            </Box>
            <Typography variant="h4" className="font-bold">
                {value} <span style={{ fontSize: '1rem', opacity: 0.6 }}>{unit}</span>
            </Typography>
        </CardContent>
    </Card>
)

const ProfilePage = () => {
    const { user: authUser } = useSelector(state => state.auth)
    const theme = useTheme()
    const isMobile = useMediaQuery(theme.breakpoints.down('md'))
    const [profile, setProfile] = useState(null)
    const [isEditing, setIsEditing] = useState(false)
    const [editedForm, setEditedForm] = useState({})
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await axios.get(`/users/${authUser.id}`)
                setProfile(res.data)
                setEditedForm(res.data)
                setLoading(false)
            } catch (err) {
                console.error('Failed to fetch profile', err)
            }
        }
        fetchProfile()
    }, [authUser.id])

    const handleSave = async () => {
        try {
            await axios.put(`/users/${authUser.id}`, editedForm)
            setProfile(editedForm)
            setIsEditing(false)
            alert('Profile updated successfully!')
        } catch (err) {
            console.error('Update failed', err)
            alert('Failed to update profile')
        }
    }

    if (loading || !profile) return <Box sx={{ p: 10, textAlign: 'center' }}><Typography>Loading Profile...</Typography></Box>

    const co2Saved = (profile.totalDistance * 0.12).toFixed(1)
    const trustPercent = (profile.trustScore / 200) * 100 // Assume 200 is max trust

    return (
        <Container maxWidth="lg" sx={{ py: { xs: 3, md: 8 }, pb: { xs: 12, md: 8 } }}>
            <Fade in timeout={800}>
                <Box>
                    <Box sx={{ 
                        display: 'flex', 
                        flexDirection: { xs: 'column', md: 'row' },
                        justifyContent: 'space-between', 
                        alignItems: { xs: 'center', md: 'flex-end' }, 
                        mb: 6,
                        gap: { xs: 3, md: 0 },
                        textAlign: { xs: 'center', md: 'left' }
                    }}>
                        <Box sx={{ 
                            display: 'flex', 
                            flexDirection: { xs: 'column', md: 'row' },
                            alignItems: 'center', 
                            gap: 3 
                        }}>
                            <Box sx={{ position: 'relative' }}>
                                <Avatar 
                                    sx={{ width: { xs: 100, md: 120 }, height: { xs: 100, md: 120 }, fontSize: { xs: '2.5rem', md: '3rem' }, bgcolor: 'primary.main', boxShadow: 4 }}
                                >
                                    {profile.name.charAt(0)}
                                </Avatar>
                                <IconButton 
                                    size="small" 
                                    sx={{ 
                                        position: 'absolute', bottom: 5, right: 5, 
                                        bgcolor: 'white', border: '1px solid #ddd', 
                                        '&:hover': { bgcolor: '#f5f5f5' } 
                                    }}
                                >
                                    <CameraAlt fontSize="small" />
                                </IconButton>
                            </Box>
                            <Box>
                                <Typography variant={isMobile ? "h5" : "h4"} className="font-bold">{profile.name}</Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: { xs: 'center', md: 'flex-start' }, alignItems: 'center', gap: 1, mt: 1 }}>
                                    <Chip 
                                        icon={profile.role === 'ADMIN' ? <Security sx={{ fontSize: '1rem !important' }} /> : <Verified sx={{ fontSize: '1rem !important' }} />} 
                                        label={profile.role === 'ADMIN' ? "Campus Administrator" : "Verified Student"} 
                                        color={profile.role === 'ADMIN' ? "secondary" : "success"} 
                                        size="small" 
                                        sx={{ fontWeight: 'bold' }} 
                                    />
                                    <Typography variant="body2" color="text.secondary">
                                        Joined {new Date(profile.createdAt).toLocaleDateString()}
                                    </Typography>
                                </Box>
                            </Box>
                        </Box>
                        <Button 
                            variant={isEditing ? "outlined" : "contained"} 
                            fullWidth={isMobile}
                            startIcon={isEditing ? <Cancel /> : <Edit />}
                            onClick={() => setIsEditing(!isEditing)}
                            sx={{ borderRadius: 3, px: 3, height: 48 }}
                        >
                            {isEditing ? "Cancel" : "Edit Profile"}
                        </Button>
                    </Box>

                    <Grid container spacing={4}>
                        {/* Stats Column */}
                        <Grid item xs={12} md={8}>
                            <Grid container spacing={3} sx={{ mb: 4 }}>
                                <Grid item xs={12} sm={4}>
                                    <StatCard icon={<DirectionsCar />} label="Total Rides" value={profile.totalRides || 0} unit="Trips" color="primary" />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <StatCard icon={<Map />} label="Distance" value={profile.totalDistance?.toFixed(1) || 0} unit="KM" color="success" />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <StatCard icon={<TrendingUp />} label="CO₂ Saved" value={co2Saved} unit="KG" color="info" />
                                </Grid>
                            </Grid>

                            <Paper sx={{ p: 4, borderRadius: 6, boxShadow: '0 10px 30px rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.05)' }}>
                                <Typography variant="h6" className="font-bold" gutterBottom>Trust & Reputation</Typography>
                                <Divider sx={{ my: 2 }} />
                                
                                <Box sx={{ mt: 3, mb: 1, display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="body1" className="font-bold">Trust Score</Typography>
                                    <Typography variant="body1" color="primary" className="font-bold">{profile.trustScore} / 200</Typography>
                                </Box>
                                <LinearProgress 
                                    variant="determinate" 
                                    value={trustPercent} 
                                    sx={{ height: 12, borderRadius: 6, bgcolor: 'grey.100' }} 
                                />
                                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                                    <Chip label="Reliable" color="success" size="small" variant="outlined" />
                                    <Chip label="Punctual" color="success" size="small" variant="outlined" />
                                    <Chip label="Helpful" color="success" size="small" variant="outlined" />
                                </Box>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
                                    Your trust score is calculated based on feedback from passengers and riders, ride completion rate, and profile verification.
                                </Typography>
                            </Paper>
                        </Grid>

                        {/* Details Column */}
                        <Grid item xs={12} md={4}>
                            <Paper sx={{ p: { xs: 3, md: 4 }, borderRadius: 6, boxShadow: '0 10px 30px rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.05)' }}>
                                <Typography variant="h6" className="font-bold" gutterBottom>Account Details</Typography>
                                <Divider sx={{ my: 2 }} />
                                
                                <Stack spacing={3} sx={{ mt: 3 }}>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary" className="font-bold uppercase tracking-wider">Department</Typography>
                                        {isEditing ? (
                                            <TextField fullWidth size="small" value={editedForm.department} onChange={(e) => setEditedForm({...editedForm, department: e.target.value})} sx={{ mt: 1 }} />
                                        ) : (
                                            <Typography variant="body1" className="font-bold" sx={{ mt: 0.5 }}>{profile.department}</Typography>
                                        )}
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary" className="font-bold uppercase tracking-wider">Course</Typography>
                                        {isEditing ? (
                                            <TextField fullWidth size="small" value={editedForm.course} onChange={(e) => setEditedForm({...editedForm, course: e.target.value})} sx={{ mt: 1 }} />
                                        ) : (
                                            <Typography variant="body1" className="font-bold" sx={{ mt: 0.5 }}>{profile.course}</Typography>
                                        )}
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary" className="font-bold uppercase tracking-wider">University Roll</Typography>
                                        <Typography variant="body1" className="font-bold" sx={{ mt: 0.5 }}>{profile.rollNumber}</Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary" className="font-bold uppercase tracking-wider">Official Email</Typography>
                                        <Typography variant="body1" className="font-bold" sx={{ mt: 0.5 }}>{profile.email}</Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary" className="font-bold uppercase tracking-wider">Phone Number</Typography>
                                        {isEditing ? (
                                            <TextField fullWidth size="small" value={editedForm.phone} onChange={(e) => setEditedForm({...editedForm, phone: e.target.value})} sx={{ mt: 1 }} />
                                        ) : (
                                            <Typography variant="body1" className="font-bold" sx={{ mt: 0.5 }}>+91 {profile.phone}</Typography>
                                        )}
                                    </Box>

                                    {isEditing && (
                                        <Button 
                                            fullWidth variant="contained" 
                                            startIcon={<Save />} 
                                            onClick={handleSave}
                                            sx={{ mt: 2, borderRadius: 3, py: 1.5 }}
                                        >
                                            Save Changes
                                        </Button>
                                    )}
                                </Stack>
                            </Paper>

                            <Button 
                                fullWidth variant="outlined" color="error"
                                startIcon={<Security />}
                                sx={{ mt: 4, borderRadius: 3, textTransform: 'none', py: 1.5, fontWeight: 'bold' }}
                            >
                                Security Settings
                            </Button>
                        </Grid>
                    </Grid>
                </Box>
            </Fade>
        </Container>
    )
}

export default ProfilePage
