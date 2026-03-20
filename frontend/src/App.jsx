import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Room from './pages/Room'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'

const PrivateRoute = ({ children }) => {
    const { user } = useAuth()
    return user ? children : <Navigate to="/login" />
}

function App() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={
                <PrivateRoute>
                    <Dashboard />
                </PrivateRoute>
            } />
            <Route path="/room/:roomId" element={
                <PrivateRoute>
                    <Room />
                </PrivateRoute>
            } />
            <Route path="/profile" element={
                <PrivateRoute>
                    <Profile />
                </PrivateRoute>
            } />
            <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
    )
}

export default App