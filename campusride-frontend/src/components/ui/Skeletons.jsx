import { Box, Skeleton, Grid, Paper, Stack } from '@mui/material'

export const StatsSkeleton = () => (
    <Grid container spacing={3} sx={{ mb: 6 }}>
        {[1, 2, 3, 4].map((i) => (
            <Grid item xs={6} md={3} key={i}>
                <Paper sx={{ p: 2, borderRadius: 5, border: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Skeleton variant="circular" width={48} height={48} />
                    <Box sx={{ flexGrow: 1 }}>
                        <Skeleton variant="text" width="60%" height={24} />
                        <Skeleton variant="text" width="40%" height={16} />
                    </Box>
                </Paper>
            </Grid>
        ))}
    </Grid>
)

export const RideCardSkeleton = () => (
    <Stack spacing={2}>
        {[1, 2, 3].map((i) => (
            <Paper key={i} sx={{ p: 2.5, borderRadius: 5, border: '1px solid #eee' }}>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                    <Skeleton variant="circular" width={44} height={44} />
                    <Box sx={{ flexGrow: 1 }}>
                        <Skeleton variant="text" width="30%" height={24} />
                        <Skeleton variant="text" width="50%" height={16} />
                    </Box>
                    <Skeleton variant="rounded" width={60} height={24} />
                </Stack>
                <Divider sx={{ my: 1.5, opacity: 0.1 }} />
                <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                    <Skeleton variant="rounded" width={100} height={26} />
                    <Skeleton variant="rounded" width={80} height={26} />
                    <Skeleton variant="rounded" width={120} height={26} />
                </Stack>
                <Skeleton variant="rounded" width="100%" height={40} sx={{ borderRadius: 3 }} />
            </Paper>
        ))}
    </Stack>
)

const Divider = ({ sx }) => <Box sx={{ borderBottom: '1px solid #eee', ...sx }} />
