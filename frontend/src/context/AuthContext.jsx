import { createContext, useContext, useState } from 'react'
import api from '../api/axios'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(
        JSON.parse(localStorage.getItem('user')) || null
    )

    const register = async (name, email, password) => {
        const res = await api.post('/auth/register', { name, email, password })
        localStorage.setItem('token', res.data.token)
        localStorage.setItem('user', JSON.stringify(res.data.user))
        setUser(res.data.user)
    }

    const login = async (email, password) => {
        const res = await api.post('/auth/login', { email, password })
        localStorage.setItem('token', res.data.token)
        localStorage.setItem('user', JSON.stringify(res.data.user))
        setUser(res.data.user)
    }

    const logout = () => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setUser(null)
    }

    const updateProfile = async (data) => {
        const res = await api.put('/profile', data)
        localStorage.setItem('user', JSON.stringify(res.data))
        setUser(res.data)
    }

    return (
        <AuthContext.Provider value={{ user, register, login, logout, updateProfile }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)