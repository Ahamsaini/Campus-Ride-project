import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import axios from '../../api/axiosInstance'
import { jwtDecode } from 'jwt-decode'

const savedUser = localStorage.getItem('user')
const savedToken = localStorage.getItem('token')

const initialState = {
    user: (savedUser && savedToken) ? JSON.parse(savedUser) : null,
    token: (savedUser && savedToken) ? savedToken : null,
    loading: false,
    error: null,
}

// Clean up if mismatched
if (!initialState.user || !initialState.token) {
    localStorage.removeItem('user')
    localStorage.removeItem('token')
}

export const loginUser = createAsyncThunk(
    'auth/login',
    async (credentials, { rejectWithValue }) => {
        try {
            const response = await axios.post('/auth/login', credentials)
            const { token, ...user } = response.data
            localStorage.setItem('token', token)
            localStorage.setItem('user', JSON.stringify(user))
            return { token, user }
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || 'Login failed')
        }
    }
)

export const registerUser = createAsyncThunk(
    'auth/register',
    async (userData, { rejectWithValue }) => {
        try {
            const response = await axios.post('/auth/register', userData)
            const { token, ...user } = response.data
            localStorage.setItem('token', token)
            localStorage.setItem('user', JSON.stringify(user))
            return { token, user }
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || 'Registration failed')
        }
    }
)

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        logout: (state) => {
            state.user = null
            state.token = null
            localStorage.removeItem('token')
            localStorage.removeItem('user')
        },
        clearError: (state) => {
            state.error = null
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(loginUser.pending, (state) => {
                state.loading = true
                state.error = null
            })
            .addCase(loginUser.fulfilled, (state, action) => {
                state.loading = false
                state.user = action.payload.user
                state.token = action.payload.token
            })
            .addCase(loginUser.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload
            })
            .addCase(registerUser.pending, (state) => {
                state.loading = true
                state.error = null
            })
            .addCase(registerUser.fulfilled, (state, action) => {
                state.loading = false
                state.user = action.payload.user
                state.token = action.payload.token
            })
            .addCase(registerUser.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload
            })
    },
})

export const { logout, clearError } = authSlice.actions
export default authSlice.reducer
