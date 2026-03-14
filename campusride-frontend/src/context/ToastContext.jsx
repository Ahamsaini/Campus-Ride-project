import React, { createContext, useContext, useState, useCallback } from 'react'
import { Snackbar, Alert } from '@mui/material'

const ToastContext = createContext()

export const ToastProvider = ({ children }) => {
    const [open, setOpen] = useState(false)
    const [message, setMessage] = useState('')
    const [severity, setSeverity] = useState('info') // 'success' | 'error' | 'warning' | 'info'

    const showToast = useCallback((msg, sev = 'info') => {
        setMessage(msg)
        setSeverity(sev)
        setOpen(true)
    }, [])

    const handleClose = (event, reason) => {
        if (reason === 'clickaway') return
        setOpen(false)
    }

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <Snackbar 
                open={open} 
                autoHideDuration={4000} 
                onClose={handleClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={handleClose} severity={severity} variant="filled" sx={{ width: '100%', borderRadius: 3, fontWeight: 'bold' }}>
                    {message}
                </Alert>
            </Snackbar>
        </ToastContext.Provider>
    )
}

export const useToast = () => {
    const context = useContext(ToastContext)
    if (!context) throw new Error('useToast must be used within a ToastProvider')
    return context
}

// Global bus for axios interceptor
export const toastBus = {
    show: (msg, sev) => {
        // This will be overridden in ToastProvider or used as a fallback
        console.log(`Toast: [${sev}] ${msg}`)
    }
}
