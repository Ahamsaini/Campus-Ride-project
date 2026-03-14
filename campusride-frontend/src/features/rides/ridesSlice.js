import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import axios from '../../api/axiosInstance'

const initialState = {
    availableRides: [],
    myRides: [],
    myRequests: [],
    currentRide: null,
    loading: false,
    error: null,
}

export const searchRides = createAsyncThunk(
    'rides/search',
    async ({ lat, lng }, { rejectWithValue }) => {
        try {
            const response = await axios.get(`/rides/search?lat=${lat}&lng=${lng}`)
            return response.data
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || 'Failed to search rides')
        }
    }
)

const ridesSlice = createSlice({
    name: 'rides',
    initialState,
    reducers: {
        setCurrentRide: (state, action) => {
            state.currentRide = action.payload
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(searchRides.pending, (state) => {
                state.loading = true
                state.error = null
            })
            .addCase(searchRides.fulfilled, (state, action) => {
                state.loading = false
                state.availableRides = action.payload
            })
            .addCase(searchRides.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload
            })
    },
})

export const { setCurrentRide } = ridesSlice.actions
export default ridesSlice.reducer
