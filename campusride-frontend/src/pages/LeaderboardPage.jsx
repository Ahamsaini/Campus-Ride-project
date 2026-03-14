import { useState, useEffect } from 'react'
import {
    Container, Typography, Box, Paper, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Avatar,
    Chip, Stack, Fade, Card, CardContent, CircularProgress,
    Alert, Grid2 as Grid
} from '@mui/material'
import { EmojiEvents, Star, TrendingUp, Forest } from '@mui/icons-material'
import axios from '../api/axiosInstance'

const LeaderboardPage = () => {
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const res = await axios.get('/leaderboard/top-carbon')
                setData(res.data)
            } catch (err) {
                setError('Failed to fetch leaderboard data')
            } finally {
                setLoading(false)
            }
        }
        fetchLeaderboard()
    }, [])

    if (loading) return (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
            <CircularProgress />
        </Box>
    )

    const topThree = data.slice(0, 3)
    const rest = data.slice(3)

    return (
        <Container maxWidth="lg" sx={{ py: 6 }}>
            <Fade in timeout={800}>
                <Box>
                    {/* Header Section */}
                    <Box sx={{ mb: 6, textAlign: 'center' }}>
                        <Typography variant="h3" className="font-bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                            <Forest sx={{ fontSize: 48, color: 'success.main' }} /> Green Campus Leaderboard
                        </Typography>
                        <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
                            Celebrating students who are reducing their carbon footprint through smart carpooling.
                        </Typography>
                    </Box>

                    {error && <Alert severity="error" sx={{ mb: 4, borderRadius: 3 }}>{error}</Alert>}

                    {/* Top 3 Podium */}
                    <Grid container spacing={3} sx={{ mb: 6 }} justifyContent="center">
                        {topThree.map((user, idx) => (
                            <Grid size={{ xs: 12, sm: 4 }} key={idx}>
                                <Card sx={{
                                    height: '100%',
                                    borderRadius: 6,
                                    border: idx === 0 ? '2px solid' : '1px solid #eee',
                                    borderColor: idx === 0 ? 'warning.main' : '#eee',
                                    boxShadow: idx === 0 ? '0 15px 40px rgba(237, 108, 2, 0.15)' : 'none',
                                    position: 'relative',
                                    overflow: 'visible'
                                }}>
                                    {idx === 0 && (
                                        <Box sx={{ position: 'absolute', top: -15, left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
                                            <EmojiEvents sx={{ fontSize: 40, color: '#ffd700' }} />
                                        </Box>
                                    )}
                                    <CardContent sx={{ textAlign: 'center', pt: 4 }}>
                                        <Avatar sx={{
                                            width: 80, height: 80, mx: 'auto', mb: 2,
                                            bgcolor: idx === 0 ? 'warning.light' : idx === 1 ? '#e5e7eb' : '#ffedd5',
                                            border: '4px solid white',
                                            boxShadow: 2
                                        }}>
                                            {user.name.charAt(0)}
                                        </Avatar>
                                        <Typography variant="h6" className="font-bold">{user.name}</Typography>
                                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                                            {user.department}
                                        </Typography>
                                        <Stack direction="row" spacing={1} justifyContent="center" sx={{ mb: 1 }}>
                                            <Chip
                                                icon={<Forest />}
                                                label={`${user.co2Saved} kg Saved`}
                                                color="success"
                                                size="small"
                                                sx={{ fontWeight: 'bold' }}
                                            />
                                        </Stack>
                                        <Typography variant="caption" className="font-bold" color="primary">
                                            {user.trustPoints} Trust Points
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>

                    {/* Full Table */}
                    <TableContainer component={Paper} sx={{ borderRadius: 6, boxShadow: '0 10px 30px rgba(0,0,0,0.03)', border: '1px solid #eee' }}>
                        <Table>
                            <TableHead sx={{ bgcolor: '#f8fafc' }}>
                                <TableRow>
                                    <TableCell className="font-bold">Rank</TableCell>
                                    <TableCell className="font-bold">Student</TableCell>
                                    <TableCell className="font-bold">Department</TableCell>
                                    <TableCell className="font-bold" align="right">CO2 Saved</TableCell>
                                    <TableCell className="font-bold" align="right">Trust Points</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {data.map((user, idx) => (
                                    <TableRow key={idx} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        <TableCell>
                                            <Typography className="font-bold" color={idx < 3 ? 'primary' : 'text.secondary'}>
                                                #{idx + 1}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                <Avatar sx={{ width: 32, height: 32, fontSize: '0.8rem' }}>{user.name.charAt(0)}</Avatar>
                                                <Typography className="font-bold">{user.name}</Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>{user.department}</TableCell>
                                        <TableCell align="right">
                                            <Chip label={`${user.co2Saved} kg`} color="success" variant="soft" size="small" sx={{ fontWeight: 'bold' }} />
                                        </TableCell>
                                        <TableCell align="right">
                                            <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                                                <Star sx={{ fontSize: 14, color: 'warning.main' }} />
                                                <Typography variant="body2">{user.trustPoints}</Typography>
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>
            </Fade>
        </Container>
    )
}

export default LeaderboardPage
