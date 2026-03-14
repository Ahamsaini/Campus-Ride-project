import { AppBar, Toolbar, Typography, Button, Box, Avatar, IconButton, Menu, MenuItem, Container, Tooltip, Fade, Divider, BottomNavigation, BottomNavigationAction, Paper, useMediaQuery, useTheme, Badge } from '@mui/material'
import { AccountCircle, DirectionsCar, ExitToApp, Dashboard, AdminPanelSettings, Search, AddCircleOutline, History, Menu as MenuIcon, Forest, Notifications as NotificationsIcon } from '@mui/icons-material'
import { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate, Link } from 'react-router-dom'
import { logout } from '../../features/auth/authSlice'
import { useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import axios from '../../api/axiosInstance'
import { Bolt } from '@mui/icons-material'

const Navbar = () => {
    const { user, token } = useSelector((state) => state.auth)
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const [anchorEl, setAnchorEl] = useState(null)
    const [activeTripId, setActiveTripId] = useState(null)
    const theme = useTheme()
    const isMobile = useMediaQuery(theme.breakpoints.down('md'))
    const location = useLocation()

    useEffect(() => {
        if (!user || !token) {
            setActiveTripId(null)
            return
        }

        const checkActive = async () => {
            try {
                const res = await axios.get('/rides/active-session')
                if (res.status === 200 && res.data?.id) {
                    setActiveTripId(res.data.id)
                } else {
                    setActiveTripId(null)
                }
            } catch (err) {
                setActiveTripId(null)
            }
        }

        checkActive()
        const interval = setInterval(checkActive, 30000) // Poll every 30s
        return () => clearInterval(interval)
    }, [user, token, location.pathname])

    const handleMenu = (event) => setAnchorEl(event.currentTarget)
    const handleClose = () => setAnchorEl(null)

    const handleLogout = () => {
        dispatch(logout())
        navigate('/')
        handleClose()
    }

    const isActive = (path) => location.pathname === path

    const navItems = [
        { label: 'Dashboard', path: '/dashboard', icon: <Dashboard /> },
        { label: 'Search', path: '/search-ride', icon: <Search /> },
        { label: 'Offer', path: '/create-ride', icon: <AddCircleOutline /> },
        { label: 'History', path: '/history', icon: <History /> },
        { label: 'Leaders', path: '/leaderboard', icon: <Forest /> },
    ]

    return (
        <>
            <AppBar position="sticky" sx={{
                bgcolor: 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(15px)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.3)',
                color: 'text.primary',
                boxShadow: '0 4px 30px rgba(0, 0, 0, 0.03)',
                zIndex: 1100
            }}>
                <Container maxWidth="xl">
                    <Toolbar sx={{ height: 80, display: 'flex', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, textDecoration: 'none', color: 'primary.main' }} component={Link} to="/">
                            <DirectionsCar sx={{ fontSize: 32 }} />
                            <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.5px' }}>
                                CampusRide
                            </Typography>
                        </Box>

                        {user ? (
                            <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1 }}>
                                {navItems.map((item) => (
                                    <Button 
                                        key={item.path}
                                        component={Link} to={item.path} 
                                        startIcon={item.icon} 
                                        color={isActive(item.path) ? "primary" : "inherit"} 
                                        sx={{ 
                                            borderRadius: 6, px: 2, py: 1, fontWeight: 'bold',
                                            bgcolor: isActive(item.path) ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
                                            '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' }
                                        }}
                                    >
                                        {item.label}
                                    </Button>
                                ))}
                                
                                {activeTripId && !location.pathname.includes('/live-tracking') && (
                                    <Button
                                        component={Link} 
                                        to={`/live-tracking/${activeTripId}`}
                                        variant="contained"
                                        color="error"
                                        startIcon={<Bolt />}
                                        sx={{ 
                                            borderRadius: 6, px: 3, fontWeight: '900',
                                            animation: 'pulse-red 2s infinite',
                                            boxShadow: '0 4px 15px rgba(244, 67, 54, 0.4)'
                                        }}
                                    >
                                        Active Journey
                                    </Button>
                                )}

                                {user.role === 'ADMIN' && (
                                    <Button
                                        component={Link} to="/admin"
                                        startIcon={<AdminPanelSettings />}
                                        variant="outlined"
                                        color={isActive('/admin') ? "primary" : "inherit"}
                                        sx={{ borderRadius: 6, px: 3, py: 1, fontWeight: 'bold' }}
                                    >
                                        Admin Panel
                                    </Button>
                                )}
                            </Box>
                        ) : (
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <Button component={Link} to="/login" sx={{ fontWeight: 'bold' }}>Login</Button>
                                <Button component={Link} to="/register" variant="contained" sx={{ borderRadius: 4, fontWeight: 'bold' }}>Join Now</Button>
                            </Box>
                        )}

                        {user && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Tooltip title="Notifications">
                                    <IconButton color="inherit" sx={{ bgcolor: 'rgba(0,0,0,0.03)' }}>
                                        <Badge badgeContent={3} color="error">
                                            <NotificationsIcon />
                                        </Badge>
                                    </IconButton>
                                </Tooltip>
                                
                                {!isMobile && (
                                    <Box sx={{ textAlign: 'right', mr: 1 }}>
                                        <Typography variant="body2" className="font-bold">{user.name}</Typography>
                                        <Typography variant="caption" color="text.secondary">{user.department}</Typography>
                                    </Box>
                                )}

                                <Tooltip title="View Profile">
                                    <IconButton
                                        size="large"
                                        onClick={handleMenu}
                                        sx={{
                                            p: 0.5,
                                            border: '2px solid',
                                            borderColor: 'primary.light',
                                            transition: '0.3s',
                                            '&:hover': { transform: 'scale(1.05)', borderColor: 'primary.main' }
                                        }}
                                    >
                                        <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main', fontWeight: 'bold' }}>
                                            {user.name?.charAt(0) || 'U'}
                                        </Avatar>
                                    </IconButton>
                                </Tooltip>

                                <Menu
                                    anchorEl={anchorEl}
                                    open={Boolean(anchorEl)}
                                    onClose={handleClose}
                                    TransitionComponent={Fade}
                                    PaperProps={{
                                        sx: {
                                            mt: 1.5,
                                            borderRadius: 4,
                                            boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                                            border: '1px solid #eee',
                                            minWidth: 200,
                                            p: 1
                                        }
                                    }}
                                >
                                    <Box sx={{ px: 2, py: 2 }}>
                                        <Typography variant="subtitle1" className="font-bold text-ellipsis overflow-hidden">{user.name || 'User'}</Typography>
                                        <Typography variant="caption" color="text.secondary" className="text-ellipsis overflow-hidden">{user.email || ''}</Typography>
                                    </Box>
                                    <Divider sx={{ my: 1 }} />
                                    <MenuItem onClick={() => { navigate('/profile'); handleClose(); }} sx={{ borderRadius: 2, mb: 1 }}>
                                        <AccountCircle sx={{ mr: 2, color: 'text.secondary' }} /> My Profile
                                    </MenuItem>
                                    <MenuItem onClick={() => { navigate('/dashboard'); handleClose(); }} sx={{ borderRadius: 2, mb: 1 }}>
                                        <Dashboard sx={{ mr: 2, color: 'text.secondary' }} /> Dashboard
                                    </MenuItem>
                                    {user.role === 'ADMIN' && (
                                        <MenuItem onClick={() => { navigate('/admin'); handleClose(); }} sx={{ borderRadius: 2, mb: 1, color: 'primary.main' }}>
                                            <AdminPanelSettings sx={{ mr: 2 }} /> Admin Panel
                                        </MenuItem>
                                    )}
                                    <Divider sx={{ my: 1 }} />
                                    <MenuItem onClick={handleLogout} sx={{ borderRadius: 2, color: 'error.main', '&:hover': { bgcolor: '#fff5f5' } }}>
                                        <ExitToApp sx={{ mr: 2 }} /> Sign Out
                                    </MenuItem>
                                </Menu>
                            </Box>
                        )}
                    </Toolbar>
                </Container>
            </AppBar>

            {isMobile && user && (
                <Paper sx={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    zIndex: 1200,
                    borderRadius: '20px 20px 0 0',
                    overflow: 'hidden',
                    boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
                    bgcolor: 'rgba(255,255,255,0.95)',
                    backdropFilter: 'blur(10px)',
                    borderTop: '1px solid rgba(0,0,0,0.05)'
                }} elevation={0}>
                    <BottomNavigation
                        showLabels
                        value={navItems.findIndex(item => item.path === location.pathname)}
                        sx={{ height: 75, bgcolor: 'transparent' }}
                    >
                        <BottomNavigationAction 
                            onClick={() => navigate('/dashboard')} 
                            label="Home" 
                            icon={<Dashboard sx={{ color: location.pathname === '/dashboard' ? 'primary.main' : 'inherit' }} />} 
                        />
                        <BottomNavigationAction 
                            onClick={() => navigate('/search-ride')} 
                            label="Find" 
                            icon={<Search sx={{ color: location.pathname === '/search-ride' ? 'primary.main' : 'inherit' }} />} 
                        />
                        <BottomNavigationAction 
                            onClick={() => navigate('/create-ride')} 
                            label="Offer" 
                            icon={
                                <Box sx={{ 
                                    bgcolor: 'primary.main', 
                                    color: 'white', 
                                    p: 1.5, 
                                    borderRadius: 4, 
                                    mt: -4,
                                    boxShadow: '0 4px 15px rgba(25, 118, 210, 0.4)',
                                    display: 'flex'
                                }}>
                                    <AddCircleOutline />
                                </Box>
                            } 
                            sx={{ '& .MuiBottomNavigationAction-label': { mt: 0.5 } }}
                        />
                        <BottomNavigationAction 
                            onClick={() => navigate('/history')} 
                            label="Activity" 
                            icon={<History sx={{ color: location.pathname === '/history' ? 'primary.main' : 'inherit' }} />} 
                        />
                        <BottomNavigationAction 
                            onClick={() => navigate('/profile')} 
                            label="Profile" 
                            icon={<AccountCircle sx={{ color: location.pathname === '/profile' ? 'primary.main' : 'inherit' }} />} 
                        />
                    </BottomNavigation>
                </Paper>
            )}
        </>
    )
}

export default Navbar
