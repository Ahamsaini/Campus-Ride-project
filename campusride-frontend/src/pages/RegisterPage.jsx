import { useState, useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, Link } from 'react-router-dom'
import {
    Container, Box, Typography, TextField, Button,
    CardContent, Alert, CircularProgress, MenuItem, Grid2 as Grid,
    Paper, Fade, InputAdornment, LinearProgress, Tooltip, IconButton, Collapse, Stack
} from '@mui/material'
import {
    Person, Email, Lock, Phone, School, Work, Badge,
    DirectionsCar, Male, Visibility, VisibilityOff
} from '@mui/icons-material'
import { registerUser, clearError } from '../features/auth/authSlice'

const DEPARTMENTS = ['CSE', 'ECE', 'ME', 'CE', 'BCA', 'MCA', 'Management', 'Other']
const COURSES = ['B.Tech', 'M.Tech', 'BCA', 'MCA', 'BBA', 'MBA', 'PhD']

const validateName = (name) => {
    if (!name.trim()) return 'Name is required'
    if (!/^[A-Za-z]+(\s[A-Za-z]+)*$/.test(name.trim())) return 'Only letters and spaces allowed'
    return ''
}

const validatePhone = (phone) => {
    if (!phone) return 'Required'
    if (!/^[0-9]{10,15}$/.test(phone)) return 'Must be 10 to 15 digits'
    return ''
}

const pwdRules = [
    { label: '6+ characters', test: (p) => p.length >= 6 },
    { label: 'Lowercase (a-z)', test: (p) => /[a-z]/.test(p) },
    { label: 'Uppercase (A-Z)', test: (p) => /[A-Z]/.test(p) },
    { label: 'Number (0-9)', test: (p) => /\d/.test(p) },
    { label: 'Special char (!@#$)', test: (p) => /[@$!%*?&#^()_+=\-]/.test(p) },
]

const RegisterPage = () => {
    const [step, setStep] = useState(1)
    const [form, setForm] = useState({
        name: '', email: '', password: '', phone: '',
        department: '', course: '', year: '', rollNumber: '', gender: '',
    })
    const [touched, setTouched] = useState({})
    const [showPwd, setShowPwd] = useState(false)
    const [pwdFocused, setPwdFocused] = useState(false)
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const { loading, error, token, user } = useSelector((s) => s.auth)

    useEffect(() => {
        if (token && user) navigate('/dashboard')
        return () => dispatch(clearError())
    }, [token, user, navigate, dispatch])

    const set = (e) => {
        const { name, value } = e.target
        if (name === 'phone') {
            setForm({ ...form, phone: value.replace(/\D/g, '') })
        } else {
            setForm({ ...form, [name]: value })
        }
    }

    const blur = (e) => setTouched({ ...touched, [e.target.name]: true })

    const nameErr = useMemo(() => validateName(form.name), [form.name])
    const phoneErr = useMemo(() => validatePhone(form.phone), [form.phone])
    const pwdCheck = useMemo(() => pwdRules.map(r => ({ ...r, ok: r.test(form.password) })), [form.password])
    const pwdValid = pwdCheck.every(r => r.ok)
    const pwdPct = useMemo(() => Math.round((pwdCheck.filter(r => r.ok).length / pwdCheck.length) * 100), [form.password])

    const isStep1Valid = !nameErr && form.email.endsWith('@shobhituniversity.ac.in') && pwdValid
    const isStep2Valid = form.rollNumber && form.department && form.course && form.year
    const isStep3Valid = !phoneErr && form.gender

    const submit = (e) => {
        e.preventDefault()
        if (step < 3) {
            setStep(step + 1)
            return
        }
        setTouched({ name: true, phone: true, password: true, email: true })
        dispatch(registerUser({ ...form, name: form.name.trim() }))
    }

    const pwdColor = pwdPct < 40 ? 'error' : pwdPct < 80 ? 'warning' : 'success'
    const pwdLabel = pwdPct < 40 ? 'Weak' : pwdPct < 80 ? 'Fair' : 'Strong'

    const fieldSx = { '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: 'rgba(255,255,255,0.8)', transition: '0.3s', '&:hover': { bgcolor: 'white' } } }

    return (
        <Box sx={{
            minHeight: '100vh', display: 'flex', alignItems: 'center',
            background: 'linear-gradient(160deg, #0f2027 0%, #203a43 40%, #2c5364 100%)',
            py: { xs: 2, md: 6 }
        }}>
            <Container maxWidth="xs">
                <Fade in timeout={800}>
                    <Paper elevation={0} sx={{
                        borderRadius: 6, overflow: 'hidden',
                        bgcolor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(24px)',
                        boxShadow: '0 30px 60px rgba(0,0,0,0.4)',
                        position: 'relative'
                    }}>
                        {/* Progress Bar */}
                        <LinearProgress variant="determinate" value={(step / 3) * 100} sx={{ height: 6, bgcolor: 'rgba(0,0,0,0.05)' }} />

                        {/* Header */}
                        <Box sx={{
                            p: 3, textAlign: 'center',
                            background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
                            color: 'white'
                        }}>
                             <Typography variant="h5" sx={{ fontWeight: 800 }}>Step {step} of 3</Typography>
                             <Typography variant="body2" sx={{ opacity: 0.8 }}>
                                {step === 1 ? 'Create your account' : step === 2 ? 'Academic details' : 'Final verification'}
                             </Typography>
                        </Box>

                        <Box sx={{ p: 3 }}>
                            {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

                            <form onSubmit={submit}>
                                <Collapse in={step === 1} mountOnEnter unmountOnExit>
                                    <Stack spacing={2.5}>
                                        <TextField fullWidth label="Full Name" name="name"
                                            value={form.name} onChange={set} onBlur={blur} required
                                            error={touched.name && !!nameErr} helperText={touched.name && nameErr}
                                            sx={fieldSx} InputProps={{ startAdornment: <InputAdornment position="start"><Person color="action" /></InputAdornment> }}
                                        />
                                        <TextField fullWidth label="University Email" name="email" type="email"
                                            placeholder="you@shobhituniversity.ac.in"
                                            value={form.email} onChange={set} onBlur={blur} required
                                            error={touched.email && form.email && !form.email.endsWith('@shobhituniversity.ac.in')}
                                            helperText={touched.email && form.email && !form.email.endsWith('@shobhituniversity.ac.in') ? 'Must use @shobhituniversity.ac.in' : ''}
                                            sx={fieldSx} InputProps={{ startAdornment: <InputAdornment position="start"><Email color="action" /></InputAdornment> }}
                                        />
                                        <Box>
                                            <TextField fullWidth label="Password" name="password"
                                                type={showPwd ? 'text' : 'password'}
                                                value={form.password} onChange={set}
                                                onFocus={() => setPwdFocused(true)} onBlur={(e) => { blur(e); setPwdFocused(false) }}
                                                required error={touched.password && !pwdValid}
                                                sx={fieldSx} InputProps={{
                                                    startAdornment: <InputAdornment position="start"><Lock color="action" /></InputAdornment>,
                                                    endAdornment: (
                                                        <InputAdornment position="end">
                                                            <IconButton onClick={() => setShowPwd(!showPwd)} edge="end">
                                                                {showPwd ? <VisibilityOff /> : <Visibility />}
                                                            </IconButton>
                                                        </InputAdornment>
                                                    ),
                                                }}
                                            />
                                            <Collapse in={!!form.password}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, px: 1 }}>
                                                    <LinearProgress variant="determinate" value={pwdPct} color={pwdColor} sx={{ flex: 1, height: 4, borderRadius: 2 }} />
                                                    <Typography variant="caption" sx={{ fontWeight: 700, color: `${pwdColor}.main` }}>{pwdLabel}</Typography>
                                                </Box>
                                            </Collapse>
                                        </Box>
                                    </Stack>
                                </Collapse>

                                <Collapse in={step === 2} mountOnEnter unmountOnExit>
                                    <Stack spacing={2.5}>
                                        <TextField fullWidth label="Roll Number" name="rollNumber"
                                            value={form.rollNumber} onChange={set} required sx={fieldSx}
                                            InputProps={{ startAdornment: <InputAdornment position="start"><Badge color="action" /></InputAdornment> }}
                                        />
                                        <TextField fullWidth select label="Department" name="department"
                                            value={form.department} onChange={set} required sx={fieldSx}
                                        >
                                            {DEPARTMENTS.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                                        </TextField>
                                        <TextField fullWidth select label="Course" name="course"
                                            value={form.course} onChange={set} required sx={fieldSx}
                                        >
                                            {COURSES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                                        </TextField>
                                        <TextField fullWidth label="Year of Study" name="year" type="number"
                                            value={form.year} onChange={set} required sx={fieldSx}
                                            InputProps={{ startAdornment: <InputAdornment position="start"><School color="action" /></InputAdornment> }}
                                        />
                                    </Stack>
                                </Collapse>

                                <Collapse in={step === 3} mountOnEnter unmountOnExit>
                                    <Stack spacing={2.5}>
                                        <TextField fullWidth label="Phone (WhatsApp preferred)" name="phone"
                                            value={form.phone} onChange={set} onBlur={blur} required
                                            error={touched.phone && !!phoneErr} helperText={touched.phone && phoneErr}
                                            inputProps={{ maxLength: 15, inputMode: 'numeric' }}
                                            sx={fieldSx} InputProps={{ startAdornment: <InputAdornment position="start"><Phone color="action" /></InputAdornment> }}
                                        />
                                        <TextField fullWidth select label="Gender" name="gender"
                                            value={form.gender} onChange={set} required sx={fieldSx}
                                        >
                                            <MenuItem value="MALE">Male</MenuItem>
                                            <MenuItem value="FEMALE">Female</MenuItem>
                                            <MenuItem value="OTHER">Other</MenuItem>
                                        </TextField>
                                        <Box sx={{ p: 2, bgcolor: 'primary.light', borderRadius: 3, opacity: 0.1, mt: 2 }}>
                                            <Typography variant="caption" align="center" display="block">
                                                By clicking register, you agree to our Campus Safety Guidelines.
                                            </Typography>
                                        </Box>
                                    </Stack>
                                </Collapse>

                                <Stack direction="row" spacing={2} sx={{ mt: 4 }}>
                                    {step > 1 && (
                                        <Button fullWidth onClick={() => setStep(step - 1)} variant="outlined" sx={{ borderRadius: 3, py: 1.5, fontWeight: 'bold' }}>
                                            Back
                                        </Button>
                                    )}
                                    <Button fullWidth variant="contained" type="submit" 
                                        disabled={loading || (step === 1 && !isStep1Valid) || (step === 2 && !isStep2Valid) || (step === 3 && !isStep3Valid)}
                                        sx={{ borderRadius: 3, py: 1.5, fontWeight: 'bold', boxShadow: '0 8px 24px rgba(21,101,192,0.3)' }}
                                    >
                                        {loading ? <CircularProgress size={24} color="inherit" /> : step === 3 ? 'Register' : 'Next'}
                                    </Button>
                                </Stack>
                            </form>

                            <Typography variant="body2" align="center" sx={{ mt: 3, opacity: 0.7 }}>
                                Already have an account? <Link to="/login" style={{ fontWeight: 700, color: '#1565c0', textDecoration: 'none' }}>Login</Link>
                            </Typography>
                        </Box>
                    </Paper>
                </Fade>
            </Container>
        </Box>
    )
}


export default RegisterPage
