import { configureStore } from '@reduxjs/toolkit'
import authReducer from '../features/auth/authSlice'
import ridesReducer from '../features/rides/ridesSlice'
// Other reducers will be added here

export const store = configureStore({
    reducer: {
        auth: authReducer,
        rides: ridesReducer,
    },
})
