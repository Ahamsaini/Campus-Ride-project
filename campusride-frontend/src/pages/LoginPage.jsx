import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, Link } from 'react-router-dom'
import {
    Container, Box, Typography, TextField, Button,
    CardContent, Alert, CircularProgress, InputAdornment, IconButton,
    Paper, Stack, Fade
} from '@mui/material'
import { Visibility, VisibilityOff, Email, Lock, DirectionsCar } from '@mui/icons-material'
import { loginUser, clearError } from '../features/auth/authSlice'

const LoginPage = () => {
    const [credentials, setCredentials] = useState({ email: '', password: '' })
    const [showPassword, setShowPassword] = useState(false)
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const { loading, error, token, user } = useSelector((state) => state.auth)

    useEffect(() => {
        if (token && user) navigate('/dashboard')
        return () => dispatch(clearError())
    }, [token, user, navigate, dispatch])

    const handleChange = (e) => {
        setCredentials({ ...credentials, [e.target.name]: e.target.value })
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        dispatch(loginUser(credentials))
    }

    const fieldSx = { '& .MuiOutlinedInput-root': { borderRadius: 2.5, bgcolor: 'rgba(255,255,255,0.6)' } }

    return (
        <Box sx={{
            minHeight: '100vh', display: 'flex', alignItems: 'center',
            background: 'linear-gradient(160deg, #0f2027 0%, #203a43 40%, #2c5364 100%)',
            py: 4
        }}>
            <Container maxWidth="xs">
                <Fade in timeout={800}>
                    <Paper elevation={0} sx={{
                        borderRadius: 5, overflow: 'hidden',
                        bgcolor: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(24px)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        boxShadow: '0 30px 60px rgba(0,0,0,0.3)'
                    }}>
                        {/* Header */}
                        <Box sx={{
                            p: { xs: 4, md: 5 }, textAlign: 'center',
                            background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
                            color: 'white', position: 'relative', overflow: 'hidden'
                        }}>
                            <Box sx={{
                                position: 'absolute', top: -30, right: -30,
                                width: 120, height: 120, borderRadius: '50%',
                                bgcolor: 'rgba(255,255,255,0.08)'
                            }} />
                            <DirectionsCar sx={{ fontSize: 44, mb: 1, opacity: 0.9 }} />
                            <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.5px' }}>
                                CampusRide
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5 }}>
                                University Carpooling Reimagined
                            </Typography>
                        </Box>

                        {/* Form */}
                        <Box sx={{ p: { xs: 3, md: 4 } }}>
                            {error && <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2.5 }}>{error}</Alert>}

                            <form onSubmit={handleSubmit}>
                                <Stack spacing={2.5}>
                                    <TextField fullWidth label="University Email" name="email" type="email" size="small"
                                        placeholder="you@shobhituniversity.ac.in"
                                        value={credentials.email} onChange={handleChange} required
                                        sx={fieldSx}
                                        InputProps={{
                                            startAdornment: <InputAdornment position="start"><Email fontSize="small" color="action" /></InputAdornment>,
                                        }}
                                    />
                                    <TextField fullWidth label="Password" name="password" size="small"
                                        type={showPassword ? 'text' : 'password'}
                                        value={credentials.password} onChange={handleChange} required
                                        sx={fieldSx}
                                        InputProps={{
                                            startAdornment: <InputAdornment position="start"><Lock fontSize="small" color="action" /></InputAdornment>,
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <IconButton size="small" onClick={() => setShowPassword(!showPassword)} edge="end">
                                                        {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                                    </IconButton>
                                                </InputAdornment>
                                            ),
                                        }}
                                    />

                                    <Button fullWidth variant="contained" type="submit" disabled={loading}
                                        sx={{
                                            py: 1.4, fontSize: '0.95rem', fontWeight: 700,
                                            borderRadius: 2.5, textTransform: 'none',
                                            background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
                                            boxShadow: '0 8px 24px rgba(21,101,192,0.35)',
                                            transition: 'all 0.3s ease',
                                            '&:hover': {
                                                boxShadow: '0 12px 32px rgba(21,101,192,0.45)',
                                                transform: 'translateY(-1px)'
                                            }
                                        }}
                                    >
                                        {loading ? <CircularProgress size={22} color="inherit" /> : 'Sign In'}
                                    </Button>
                                </Stack>
                            </form>

                            <Box sx={{ mt: 3, textAlign: 'center' }}>
                                <Typography variant="body2" color="text.secondary">
                                    Don't have an account?{' '}
                                    <Link to="/register" style={{ color: '#1565c0', fontWeight: 600, textDecoration: 'none' }}>
                                        Join CampusRide
                                    </Link>
                                </Typography>
                                <Typography variant="body2" sx={{ mt: 1 }}>
                                    <Link to="/admin/register" style={{ color: '#9e9e9e', fontSize: '0.7rem', textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        Staff Registration
                                    </Link>
                                </Typography>
                            </Box>
                        </Box>
                    </Paper>
                </Fade>
            </Container>
        </Box>
    )
}

export default LoginPage
