import { Container, Box, Typography, Button, Paper } from '@mui/material'
import { Link } from 'react-router-dom'
import { DirectionsCar, Home } from '@mui/icons-material'

const NotFoundPage = () => {
    return (
        <Container maxWidth="md" sx={{ 
            height: '100vh', 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center', 
            alignItems: 'center',
            textAlign: 'center'
        }}>
            <Box sx={{ position: 'relative', mb: 4 }}>
                <DirectionsCar sx={{ fontSize: 120, color: 'primary.main', opacity: 0.1 }} />
                <Typography variant="h1" sx={{ 
                    fontWeight: 900, 
                    position: 'absolute', 
                    top: '50%', 
                    left: '50%', 
                    transform: 'translate(-50%, -50%)',
                    fontSize: '8rem',
                    color: 'primary.main',
                    letterSpacing: -5
                }}>
                    404
                </Typography>
            </Box>
            <Typography variant="h4" className="font-bold" gutterBottom>
                Oops! This Road is Closed.
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 500 }}>
                The page you are looking for doesn't exist or has been moved. 
                Let's get you back on track to the campus dashboard.
            </Typography>
            <Button 
                component={Link} 
                to="/dashboard" 
                variant="contained" 
                size="large" 
                startIcon={<Home />}
                sx={{ borderRadius: 4, px: 4, py: 1.5, fontWeight: 'bold' }}
            >
                Back to Dashboard
            </Button>
        </Container>
    )
}

export default NotFoundPage
