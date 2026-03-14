import { Box, Container, Typography, Button, Stack, Grid, Paper, Avatar, useTheme, useMediaQuery, Fade, Chip } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { 
    DirectionsCar, Shield, Search, LocationOn, 
    Groups, Speed, AccountCircle, TrendingUp,
    CheckCircleOutline, ArrowForward
} from '@mui/icons-material'

const FeatureCard = ({ icon, title, desc }) => (
    <Paper elevation={0} sx={{ 
        p: 4, height: '100%', borderRadius: 6, 
        bgcolor: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)',
        border: '1px solid rgba(0,0,0,0.05)',
        transition: '0.3s',
        '&:hover': { transform: 'translateY(-10px)', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }
    }}>
        <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main', mb: 3, width: 56, height: 56 }}>
            {icon}
        </Avatar>
        <Typography variant="h6" className="font-bold" gutterBottom>{title}</Typography>
        <Typography variant="body2" color="text.secondary">{desc}</Typography>
    </Paper>
)

const LandingPage = () => {
    const navigate = useNavigate()
    const theme = useTheme()
    const isMobile = useMediaQuery(theme.breakpoints.down('md'))

    return (
        <Box sx={{ overflowX: 'hidden' }}>
            {/* Hero Section */}
            <Box sx={{ 
                minHeight: '90vh', position: 'relative', display: 'flex', alignItems: 'center',
                background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
                color: 'white', py: 10
            }}>
                <Box sx={{ 
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    opacity: 0.1, backgroundImage: 'url("https://www.transparenttextures.com/patterns/carbon-fibre.png")'
                }} />
                
                <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
                    <Grid container spacing={6} alignItems="center">
                        <Grid item xs={12} md={7}>
                            <Fade in timeout={1000}>
                                <Box>
                                    <Chip 
                                        label="v1.0 is now live for Shobhit University" 
                                        color="primary" 
                                        sx={{ mb: 3, bgcolor: 'rgba(25, 118, 210, 0.2)', color: 'white', fontWeight: 'bold' }} 
                                    />
                                    <Typography variant={isMobile ? "h3" : "h1"} sx={{ fontWeight: 900, mb: 3, letterSpacing: '-2px', lineHeight: 1.1 }}>
                                        The Smart Way to <br />
                                        <span style={{ color: '#1976d2' }}>Travel Together.</span>
                                    </Typography>
                                    <Typography variant="h6" sx={{ mb: 6, opacity: 0.8, maxWidth: 500, fontWeight: 400 }}>
                                        Join Shobhit University's exclusive carpooling community. 
                                        Save money, reduce emissions, and meet your campus peers.
                                    </Typography>
                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                        <Button 
                                            variant="contained" size="large" 
                                            onClick={() => navigate('/register')}
                                            sx={{ borderRadius: 4, px: 4, py: 2, fontWeight: 'bold', textTransform: 'none', fontSize: '1.1rem' }}
                                        >
                                            Get Started Now
                                        </Button>
                                        <Button 
                                            variant="outlined" size="large" 
                                            onClick={() => navigate('/login')}
                                            sx={{ borderRadius: 4, px: 4, py: 2, color: 'white', borderColor: 'white', fontWeight: 'bold', textTransform: 'none', fontSize: '1.1rem' }}
                                        >
                                            Sign In
                                        </Button>
                                    </Stack>
                                </Box>
                            </Fade>
                        </Grid>
                        <Grid item xs={12} md={5}>
                            <Box sx={{ position: 'relative', display: { xs: 'none', md: 'block' } }}>
                                <Paper sx={{ 
                                    p: 2, borderRadius: 8, bgcolor: 'rgba(255,255,255,0.1)', 
                                    backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)' 
                                }}>
                                    <img 
                                        src="https://img.freepik.com/free-vector/city-driver-concept-illustration_114360-3164.jpg" 
                                        alt="Campus Carpool" 
                                        style={{ width: '100%', borderRadius: '24px' }} 
                                    />
                                </Paper>
                                <Paper sx={{ 
                                    position: 'absolute', bottom: -30, left: -30, p: 3, borderRadius: 6,
                                    bgcolor: 'white', color: 'black', boxShadow: 6, display: 'flex', alignItems: 'center', gap: 2
                                }}>
                                    <Avatar sx={{ bgcolor: 'success.main' }}><TrendingUp /></Avatar>
                                    <Box>
                                        <Typography variant="h6" className="font-bold">50% Savings</Typography>
                                        <Typography variant="caption" color="text.secondary">Avg. fuel cost reduction</Typography>
                                    </Box>
                                </Paper>
                            </Box>
                        </Grid>
                    </Grid>
                </Container>
            </Box>

            {/* Features Section */}
            <Container maxWidth="lg" sx={{ py: 15 }}>
                <Box textAlign="center" mb={10}>
                    <Typography variant="h3" className="font-bold" gutterBottom>Why Choose CampusRide?</Typography>
                    <Typography variant="h6" color="text.secondary">Exclusively designed for university safety and efficiency.</Typography>
                </Box>
                <Grid container spacing={4}>
                    <Grid item xs={12} md={4}>
                        <FeatureCard 
                            icon={<Shield />} 
                            title="Verified Community" 
                            desc="Every user is verified via @shobhituniversity.ac.in emails, ensuring a safe and secure environment."
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <FeatureCard 
                            icon={<LocationOn />} 
                            title="Live Tracking" 
                            desc="Follow your ride in real-time on our integrated maps. Share tracking links with guardians for extra safety."
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <FeatureCard 
                            icon={<Groups />} 
                            title="Trust System" 
                            desc="Rate your experience and build your trust score. High-rated users get priority matching and rewards."
                        />
                    </Grid>
                </Grid>
            </Container>

            {/* How It Works */}
            <Box sx={{ bgcolor: 'grey.50', py: 15 }}>
                <Container maxWidth="lg">
                    <Grid container spacing={8} alignItems="center">
                        <Grid item xs={12} md={6}>
                            <Typography variant="h3" className="font-bold" gutterBottom>How It Works</Typography>
                            <Typography variant="body1" color="text.secondary" sx={{ mb: 6 }}>
                                Getting from A to B has never been easier or more social. Follow these three simple steps to start carpooling.
                            </Typography>
                            
                            <Stack spacing={4}>
                                {[
                                    { step: '01', title: 'Register Account', desc: 'Sign up using your official university email and complete your profile.' },
                                    { step: '02', title: 'Search or Create', desc: 'Find rides heading your way or offer your empty seats to campus peers.' },
                                    { step: '03', title: 'Start Commuting', desc: 'Meet at the pickup point, start the live tracking, and reach together.' }
                                ].map((item, idx) => (
                                    <Box key={idx} sx={{ display: 'flex', gap: 3 }}>
                                        <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 900, opacity: 0.3 }}>{item.step}</Typography>
                                        <Box>
                                            <Typography variant="h6" className="font-bold">{item.title}</Typography>
                                            <Typography variant="body2" color="text.secondary">{item.desc}</Typography>
                                        </Box>
                                    </Box>
                                ))}
                            </Stack>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Box sx={{ width: '100%', borderRadius: 8, overflow: 'hidden', boxShadow: 10 }}>
                                <img src="https://img.freepik.com/free-vector/shared-goals-concept-illustration_114360-5206.jpg" alt="Carpooling" style={{ width: '100%' }} />
                            </Box>
                        </Grid>
                    </Grid>
                </Container>
            </Box>

            {/* CTA Section */}
            <Box sx={{ 
                py: 15, textAlign: 'center', 
                background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
                color: 'white'
            }}>
                <Container maxWidth="md">
                    <Typography variant="h3" className="font-bold" gutterBottom>Ready to Ride Smart?</Typography>
                    <Typography variant="h6" sx={{ mb: 6, opacity: 0.8 }}>
                        Join hundreds of Shobhit University students today. Safe, social, and eco-friendly.
                    </Typography>
                    <Button 
                        variant="contained" size="large" disableElevation
                        onClick={() => navigate('/register')}
                        sx={{ 
                            bgcolor: 'white', color: 'primary.main', borderRadius: 4, px: 6, py: 2.5, 
                            fontWeight: 'bold', fontSize: '1.2rem',
                            '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' } 
                        }}
                    >
                        Create Your Account
                    </Button>
                </Container>
            </Box>

            {/* Footer */}
            <Box sx={{ py: 6, borderTop: '1px solid rgba(0,0,0,0.05)', textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                    © 2026 CampusRide • Built for Shobhit University Hackathon
                </Typography>
            </Box>
        </Box>
    )
}

export default LandingPage
