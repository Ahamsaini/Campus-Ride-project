import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { Snackbar, Alert, AlertTitle, Button, Box, Typography, Slide } from '@mui/material'
import { GppBad, DirectionsRun, PhoneInTalk } from '@mui/icons-material'
import wsService from '../../utils/websocketService'

const EmergencyAlert = () => {
    const { user } = useSelector(state => state.auth)
    const [alert, setAlert] = useState(null)
    const [open, setOpen] = useState(false)

    useEffect(() => {
        if (!user) return

        const setupWS = () => {
            wsService.connect(() => {
                wsService.subscribe(`/topic/notifications/${user.id}`, (data) => {
                    if (data.type === 'PEER_SOS') {
                        setAlert(data)
                        setOpen(true)
                    }
                })
            })
        }

        setupWS()
    }, [user])

    const handleClose = () => setOpen(false)

    return (
        <Snackbar
            open={open}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            TransitionComponent={(props) => <Slide {...props} direction="down" />}
            sx={{ top: { xs: 10, sm: 20 } }}
        >
            <Alert
                severity="error"
                variant="filled"
                icon={<GppBad fontSize="large" />}
                sx={{
                    borderRadius: 6,
                    minWidth: { xs: '95vw', sm: 450 },
                    boxShadow: '0 10px 40px rgba(211, 47, 47, 0.4)',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    animation: 'pulse-sos 2s infinite'
                }}
                action={
                    <Button color="inherit" size="small" onClick={handleClose} sx={{ fontWeight: 'bold' }}>
                        Dismiss
                    </Button>
                }
            >
                <AlertTitle sx={{ fontWeight: 800, fontSize: '1.1rem' }}>NEARBY EMERGENCY DETECTED</AlertTitle>
                <Box sx={{ mt: 1 }}>
                    <Typography variant="body2" sx={{ mb: 2, fontWeight: 500 }}>
                        {alert?.message}
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                            variant="outlined"
                            color="inherit"
                            size="small"
                            startIcon={<DirectionsRun />}
                            sx={{ borderRadius: 4, textTransform: 'none', borderColor: 'rgba(255,255,255,0.5)' }}
                        >
                            Stay Alert
                        </Button>
                        <Button
                            variant="contained"
                            color="inherit"
                            size="small"
                            startIcon={<PhoneInTalk />}
                            sx={{ borderRadius: 4, textTransform: 'none', bgcolor: 'white', color: 'error.main', '&:hover': { bgcolor: '#eee' } }}
                            onClick={() => window.location.href = 'tel:100'}
                        >
                            Police
                        </Button>
                    </Box>
                </Box>

                <style>
                    {`
                    @keyframes pulse-sos {
                        0% { transform: scale(1); }
                        50% { transform: scale(1.02); box-shadow: 0 15px 50px rgba(211, 47, 47, 0.6); }
                        100% { transform: scale(1); }
                    }
                    `}
                </style>
            </Alert>
        </Snackbar>
    )
}

export default EmergencyAlert
