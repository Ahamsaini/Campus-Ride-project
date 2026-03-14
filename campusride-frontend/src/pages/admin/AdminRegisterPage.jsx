import { useState, useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, Link } from 'react-router-dom'
import {
    Container, Box, Typography, TextField, Button,
    CardContent, Alert, CircularProgress, MenuItem, Grid2 as Grid,
    Paper, Fade, InputAdornment, LinearProgress, Tooltip, IconButton, Collapse
} from '@mui/material'
import {
    Person, Email, Lock, Phone, Shield, Male, Visibility, VisibilityOff
} from '@mui/icons-material'
import { registerUser, clearError } from '../../features/auth/authSlice'

const pwdRules = [
    { label: '6+ characters', test: (p) => p.length >= 6 },
    { label: 'Lowercase (a-z)', test: (p) => /[a-z]/.test(p) },
    { label: 'Uppercase (A-Z)', test: (p) => /[A-Z]/.test(p) },
    { label: 'Number (0-9)', test: (p) => /\d/.test(p) },
    { label: 'Special char (!@#$)', test: (p) => /[@$!%*?&#^()_+=\-]/.test(p) },
]

const validateName = (name) => {
    if (!name.trim()) return 'Name is required'
    if (!/^[A-Za-z]+(\s[A-Za-z]+)*$/.test(name.trim())) return 'Only letters and spaces allowed'
    return ''
}

const validatePhone = (phone) => {
    if (!phone) return 'Required'
    if (!/^[0-9]{10}$/.test(phone)) return 'Must be exactly 10 digits'
    return ''
}

const AdminRegisterPage = () => {
    const [form, setForm] = useState({
        name: '', email: '', password: '', phone: '',
        department: 'ADMIN', course: 'ADMIN', year: 1,
        rollNumber: 'ADMIN_' + Date.now(), gender: '', role: 'ADMIN'
    })
    const [touched, setTouched] = useState({})
    const [showPwd, setShowPwd] = useState(false)
    const [pwdFocused, setPwdFocused] = useState(false)
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const { loading, error, token, user } = useSelector((s) => s.auth)

    useEffect(() => {
        if (token && user?.role === 'ADMIN') navigate('/admin')
        return () => dispatch(clearError())
    }, [token, user, navigate, dispatch])

    const set = (e) => {
        const { name, value } = e.target
        if (name === 'phone') {
            setForm({ ...form, phone: value.replace(/\D/g, '').slice(0, 10) })
        } else {
            setForm({ ...form, [name]: value })
        }
    }

    const blur = (e) => setTouched({ ...touched, [e.target.name]: true })

    const nameErr = useMemo(() => validateName(form.name), [form.name])
    const phoneErr = useMemo(() => validatePhone(form.phone), [form.phone])
    const pwdCheck = useMemo(() => pwdRules.map(r => ({ ...r, ok: r.test(form.password) })), [form.password])
    const pwdValid = pwdCheck.every(r => r.ok)
    const pwdPct = useMemo(() => Math.round((pwdCheck.filter(r => r.ok).length / pwdCheck.length) * 100), [pwdCheck])

    const valid = !nameErr && !phoneErr && pwdValid &&
        form.email.endsWith('@shobhituniversity.ac.in') && form.gender

    const submit = (e) => {
        e.preventDefault()
        setTouched({ name: true, phone: true, password: true, email: true })
        if (!valid) return
        dispatch(registerUser({ ...form, name: form.name.trim() }))
    }

    const pwdColor = pwdPct < 40 ? 'error' : pwdPct < 80 ? 'warning' : 'success'
    const pwdLabel = pwdPct < 40 ? 'Weak' : pwdPct < 80 ? 'Fair' : 'Strong'

    const pwdTooltip = (
        <Box sx={{ p: 0.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, mb: 0.5, display: 'block' }}>Password Requirements</Typography>
            {pwdCheck.map((r, i) => (
                <Typography key={i} variant="caption" sx={{ display: 'block', color: r.ok ? '#66bb6a' : '#bbb', lineHeight: 1.6 }}>
                    {r.ok ? '✓' : '○'} {r.label}
                </Typography>
            ))}
        </Box>
    )

    const fieldSx = { '& .MuiOutlinedInput-root': { borderRadius: 2.5, bgcolor: 'rgba(255,255,255,0.6)' } }

    return (
        <Box sx={{
            minHeight: '100vh', display: 'flex', alignItems: 'center',
            background: 'linear-gradient(160deg, #1a0a2e 0%, #2d1b4e 40%, #1b2838 100%)',
            py: { xs: 3, md: 6 }
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
                            background: 'linear-gradient(135deg, #7b1fa2 0%, #4a148c 100%)',
                            color: 'white', position: 'relative', overflow: 'hidden'
                        }}>
                            <Box sx={{
                                position: 'absolute', top: -30, right: -30,
                                width: 120, height: 120, borderRadius: '50%',
                                bgcolor: 'rgba(255,255,255,0.08)'
                            }} />
                            <Shield sx={{ fontSize: 44, mb: 1, opacity: 0.9 }} />
                            <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.5px' }}>
                                Admin Portal
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5 }}>
                                Staff & Safety Registration
                            </Typography>
                        </Box>

                        {/* Form */}
                        <Box sx={{ p: { xs: 3, md: 4 } }}>
                            {error && <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2.5 }}>{error}</Alert>}

                            <form onSubmit={submit}>
                                <Grid container spacing={2}>
                                    <Grid size={12}>
                                        <TextField fullWidth label="Full Name" name="name" size="small"
                                            value={form.name} onChange={set} onBlur={blur} required
                                            error={touched.name && !!nameErr}
                                            helperText={touched.name && nameErr}
                                            sx={fieldSx}
                                            InputProps={{ startAdornment: <InputAdornment position="start"><Person fontSize="small" color="action" /></InputAdornment> }}
                                        />
                                    </Grid>

                                    <Grid size={12}>
                                        <TextField fullWidth label="Official Email" name="email" type="email" size="small"
                                            placeholder="admin@shobhituniversity.ac.in"
                                            value={form.email} onChange={set} onBlur={blur} required
                                            error={touched.email && !!form.email && !form.email.endsWith('@shobhituniversity.ac.in')}
                                            helperText={touched.email && form.email && !form.email.endsWith('@shobhituniversity.ac.in') ? 'Must use university domain' : ''}
                                            sx={fieldSx}
                                            InputProps={{ startAdornment: <InputAdornment position="start"><Email fontSize="small" color="action" /></InputAdornment> }}
                                        />
                                    </Grid>

                                    <Grid size={12}>
                                        <Tooltip title={pwdTooltip} placement="right" arrow
                                            open={pwdFocused && !!form.password}
                                            disableHoverListener disableFocusListener disableTouchListener
                                        >
                                            <TextField fullWidth label="Password" name="password" size="small"
                                                type={showPwd ? 'text' : 'password'}
                                                value={form.password} onChange={set}
                                                onFocus={() => setPwdFocused(true)}
                                                onBlur={(e) => { blur(e); setPwdFocused(false) }}
                                                required error={touched.password && !pwdValid}
                                                sx={fieldSx}
                                                InputProps={{
                                                    startAdornment: <InputAdornment position="start"><Lock fontSize="small" color="action" /></InputAdornment>,
                                                    endAdornment: (
                                                        <InputAdornment position="end">
                                                            <IconButton size="small" onClick={() => setShowPwd(!showPwd)} edge="end">
                                                                {showPwd ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                                            </IconButton>
                                                        </InputAdornment>
                                                    ),
                                                }}
                                            />
                                        </Tooltip>
                                        <Collapse in={!!form.password}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, px: 0.5 }}>
                                                <LinearProgress variant="determinate" value={pwdPct} color={pwdColor}
                                                    sx={{ flex: 1, height: 4, borderRadius: 2 }}
                                                />
                                                <Typography variant="caption" sx={{
                                                    fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
                                                    color: pwdColor === 'error' ? 'error.main' : pwdColor === 'warning' ? 'warning.main' : 'success.main',
                                                    minWidth: 36
                                                }}>
                                                    {pwdLabel}
                                                </Typography>
                                            </Box>
                                        </Collapse>
                                    </Grid>

                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <TextField fullWidth label="Phone" name="phone" size="small"
                                            value={form.phone} onChange={set} onBlur={blur} required
                                            error={touched.phone && !!phoneErr}
                                            helperText={touched.phone && phoneErr}
                                            inputProps={{ maxLength: 10, inputMode: 'numeric' }}
                                            sx={fieldSx}
                                            InputProps={{ startAdornment: <InputAdornment position="start"><Phone fontSize="small" color="action" /></InputAdornment> }}
                                        />
                                    </Grid>

                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <TextField fullWidth select label="Gender" name="gender" size="small"
                                            value={form.gender} onChange={set} required sx={fieldSx}
                                            InputProps={{ startAdornment: <InputAdornment position="start"><Male fontSize="small" color="action" /></InputAdornment> }}
                                        >
                                            <MenuItem value="MALE">Male</MenuItem>
                                            <MenuItem value="FEMALE">Female</MenuItem>
                                            <MenuItem value="OTHER">Other</MenuItem>
                                        </TextField>
                                    </Grid>
                                </Grid>

                                <Button fullWidth variant="contained" type="submit" disabled={loading || !valid}
                                    sx={{
                                        mt: 3.5, py: 1.4, fontSize: '0.95rem', fontWeight: 700,
                                        borderRadius: 2.5, textTransform: 'none',
                                        background: valid
                                            ? 'linear-gradient(135deg, #7b1fa2 0%, #4a148c 100%)'
                                            : undefined,
                                        boxShadow: valid ? '0 8px 24px rgba(123,31,162,0.35)' : 'none',
                                        transition: 'all 0.3s ease',
                                        '&:hover': {
                                            boxShadow: valid ? '0 12px 32px rgba(123,31,162,0.45)' : 'none',
                                            transform: valid ? 'translateY(-1px)' : 'none'
                                        }
                                    }}
                                >
                                    {loading ? <CircularProgress size={22} color="inherit" /> : 'Register Admin Account'}
                                </Button>
                            </form>

                            <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 3 }}>
                                Already have staff access?{' '}
                                <Link to="/login" style={{ color: '#7b1fa2', fontWeight: 600, textDecoration: 'none' }}>
                                    Sign in
                                </Link>
                            </Typography>
                        </Box>
                    </Paper>
                </Fade>
            </Container>
        </Box>
    )
}

export default AdminRegisterPage
