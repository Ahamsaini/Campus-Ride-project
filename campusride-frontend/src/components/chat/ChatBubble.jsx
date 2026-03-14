import { useState, useEffect, useRef } from 'react'
import {
    Box, Paper, Typography, TextField, IconButton, List, ListItem,
    Avatar, Divider, Badge, Fade, Zoom, Tooltip, Stack,
    useTheme, Chip, CircularProgress
} from '@mui/material'
import {
    Send, Close, Message, DoneAll, VerifiedUser,
    SentimentSatisfiedAlt, AttachFile, MoreVert
} from '@mui/icons-material'
import { useSelector } from 'react-redux'
import wsService from '../../utils/websocketService'
import axios from '../../api/axiosInstance'
import { jwtDecode } from 'jwt-decode'

/**
 * Premium Chat Component for CampusRide
 */
const ChatBubble = ({ rideId }) => {
    const theme = useTheme()
    const { user } = useSelector(state => state.auth)
    const [open, setOpen] = useState(false)
    const [messages, setMessages] = useState([])
    const [newMessage, setNewMessage] = useState('')
    const [unreadCount, setUnreadCount] = useState(0)
    const [loading, setLoading] = useState(false)
    const scrollRef = useRef(null)
    const inputRef = useRef(null)
    const subscriptionRef = useRef(null)

    // Robust self ID detection
    const getMyId = () => {
        if (user?.id) return user.id
        const savedUser = JSON.parse(localStorage.getItem('user') || '{}')
        if (savedUser.id) return savedUser.id
        const token = localStorage.getItem('token')
        if (token) {
            try {
                const decoded = jwtDecode(token)
                return decoded.sub || decoded.userId || decoded.id
            } catch (e) { return null }
        }
        return null
    }

    const myId = getMyId()

    const encodeMessage = (text) => btoa(encodeURI(text))
    const decodeMessage = (encoded) => {
        try { return decodeURI(atob(encoded)) } catch { return encoded }
    }

    useEffect(() => {
        if (!rideId) return

        const fetchHistory = async () => {
            setLoading(true)
            try {
                const res = await axios.get(`/chat/${rideId}/history`)
                const history = res.data.content.map(m => ({
                    ...m,
                    content: decodeMessage(m.content)
                })).reverse()
                setMessages(history)
            } catch (err) {
                console.error('Chat history error:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchHistory()

        wsService.connect(() => {
            const sub = wsService.subscribe(`/topic/chat/${rideId}`, (msg) => {
                const decodedMsg = {
                    ...msg,
                    content: decodeMessage(msg.content)
                }
                setMessages(prev => {
                    if (prev.some(m => m.id === decodedMsg.id)) return prev
                    return [...prev, decodedMsg]
                })
                if (!open) setUnreadCount(prev => prev + 1)
            })
            subscriptionRef.current = sub
        })

        return () => {
            if (subscriptionRef.current) {
                wsService.unsubscribe(subscriptionRef.current)
                subscriptionRef.current = null
            }
        }
    }, [rideId, open])

    useEffect(() => {
        if (scrollRef.current && open) {
            setTimeout(() => {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight
            }, 100)
        }
    }, [messages, open])

    const handleSend = () => {
        if (!newMessage.trim()) return

        if (!myId) {
            alert('Session invalid. Please log in again.')
            return
        }

        const payload = {
            rideId,
            senderId: myId,
            content: encodeMessage(newMessage.trim())
        }

        wsService.send('/app/chat/send', payload)
        setNewMessage('')
        inputRef.current?.focus()
    }

    const toggleChat = () => {
        const nextState = !open
        setOpen(nextState)
        if (nextState) {
            setUnreadCount(0)
            axios.put(`/chat/${rideId}/read-all`).catch(() => { })
        }
    }

    const formatTime = (isoString) => {
        return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    return (
        <Box sx={{ position: 'fixed', bottom: 40, right: 30, zIndex: 1300 }}>
            {/* Toggle Button */}
            <Tooltip title={open ? "Close Chat" : "Ride Chat"} placement="left" arrow>
                <Zoom in>
                    <Badge badgeContent={unreadCount} color="error" overlap="circular" sx={{ '& .MuiBadge-badge': { top: 8, right: 8 } }}>
                        <IconButton
                            onClick={toggleChat}
                            sx={{
                                bgcolor: '#1976d2',
                                color: 'white',
                                width: 60, height: 60,
                                boxShadow: '0 8px 32px rgba(25, 118, 210, 0.4)',
                                '&:hover': {
                                    bgcolor: '#1565c0',
                                    transform: 'scale(1.1)',
                                },
                                transition: '0.3s'
                            }}
                        >
                            {open ? <Close sx={{ fontSize: 28 }} /> : <Message sx={{ fontSize: 28 }} />}
                        </IconButton>
                    </Badge>
                </Zoom>
            </Tooltip>

            {/* Chat Window */}
            <Fade in={open}>
                <Paper
                    elevation={12}
                    sx={{
                        position: 'absolute',
                        bottom: 80,
                        right: 0,
                        width: { xs: 'calc(100vw - 60px)', sm: 380 },
                        maxHeight: 'calc(100vh - 150px)',
                        height: 500,
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: 4,
                        overflow: 'hidden',
                        bgcolor: 'background.paper',
                        boxShadow: '0 12px 48px rgba(0,0,0,0.15)',
                        border: '1px solid rgba(0,0,0,0.08)'
                    }}
                >
                    {/* Header */}
                    <Box sx={{
                        px: 2.5, py: 2,
                        background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                            <Avatar sx={{ width: 36, height: 36, bgcolor: 'rgba(255,255,255,0.2)' }}>
                                <Message sx={{ fontSize: 20 }} />
                            </Avatar>
                            <Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>Ride Coordination</Typography>
                                <Typography variant="caption" sx={{ opacity: 0.8, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <VerifiedUser sx={{ fontSize: 10 }} /> End-to-End Encrypted
                                </Typography>
                            </Box>
                        </Stack>
                        <IconButton size="small" onClick={toggleChat} sx={{ color: 'white' }}>
                            <Close fontSize="small" />
                        </IconButton>
                    </Box>

                    {/* Messages Area */}
                    <Box
                        ref={scrollRef}
                        sx={{
                            flexGrow: 1,
                            overflowY: 'auto',
                            p: 2,
                            bgcolor: '#f5f7f9',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 1.5
                        }}
                    >
                        {loading && messages.length === 0 && (
                            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                                <CircularProgress size={20} />
                            </Box>
                        )}

                        {messages.length === 0 && !loading && (
                            <Box sx={{ textAlign: 'center', mt: 10, px: 4 }}>
                                <Typography variant="body2" color="text.secondary">
                                    No messages yet. Send a greeting to start coordinating!
                                </Typography>
                            </Box>
                        )}

                        {messages.map((msg, idx) => {
                            const isMe = String(msg.senderId) === String(myId)
                            return (
                                <Box key={idx} sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: isMe ? 'flex-end' : 'flex-start',
                                    width: '100%'
                                }}>
                                    {!isMe && (
                                        <Typography variant="caption" color="text.secondary" sx={{ ml: 1, mb: 0.5, fontSize: '0.7rem' }}>
                                            {msg.senderName}
                                        </Typography>
                                    )}
                                    <Box sx={{
                                        maxWidth: '85%',
                                        p: 1.5,
                                        borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                        bgcolor: isMe ? '#1976d2' : 'white',
                                        color: isMe ? 'white' : 'text.primary',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                        border: isMe ? 'none' : '1px solid #e0e0e0'
                                    }}>
                                        <Typography variant="body2" sx={{ lineHeight: 1.4, wordBreak: 'break-word' }}>
                                            {msg.content}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5, px: 0.5 }}>
                                        <Typography variant="caption" sx={{ fontSize: '0.65rem', opacity: 0.7 }}>
                                            {formatTime(msg.timestamp)}
                                        </Typography>
                                        {isMe && <DoneAll sx={{ fontSize: 12, ml: 0.5, color: msg.read ? '#4caf50' : '#bdbdbd' }} />}
                                    </Box>
                                </Box>
                            )
                        })}
                    </Box>

                    {/* Input Area */}
                    <Divider />
                    <Box sx={{ p: 2, bgcolor: 'white' }}>
                        <Paper
                            component="form"
                            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                            variant="outlined"
                            sx={{
                                p: '4px 8px',
                                display: 'flex',
                                alignItems: 'center',
                                borderRadius: 10,
                                bgcolor: '#f0f2f5',
                                boxShadow: 'none'
                            }}
                        >
                            <IconButton size="small" sx={{ p: 1 }}>
                                <SentimentSatisfiedAlt sx={{ fontSize: 20 }} />
                            </IconButton>
                            <TextField
                                inputRef={inputRef}
                                fullWidth
                                variant="standard"
                                placeholder="Type a message..."
                                InputProps={{ disableUnderline: true }}
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                sx={{ ml: 1, flex: 1, '& input': { py: 0.5, fontSize: '0.9rem' } }}
                            />
                            <IconButton size="small" sx={{ p: 1 }}>
                                <AttachFile sx={{ fontSize: 20 }} />
                            </IconButton>
                            <IconButton
                                color="primary"
                                size="small"
                                onClick={handleSend}
                                disabled={!newMessage.trim()}
                                sx={{
                                    ml: 1, p: 1,
                                    bgcolor: newMessage.trim() ? '#1976d2' : 'transparent',
                                    color: newMessage.trim() ? 'white' : 'action.disabled',
                                    '&:hover': { bgcolor: '#1565c0' }
                                }}
                            >
                                <Send sx={{ fontSize: 20 }} />
                            </IconButton>
                        </Paper>
                    </Box>
                </Paper>
            </Fade>
        </Box>
    )
}

export default ChatBubble
