import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import Avatar from '../components/Avatar'

function Profile() {
    const { user, updateProfile, logout } = useAuth()
    const navigate = useNavigate()
    const [name, setName] = useState(user?.name || '')
    const [saved, setSaved] = useState(false)
    const [error, setError] = useState('')

    const handleSave = async () => {
        try {
            await updateProfile({ name })
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
        } catch (err) {
            setError('Failed to update profile')
        }
    }

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <button style={styles.back} onClick={() => navigate('/dashboard')}>
                    ← Back
                </button>
                <div style={styles.avatarRow}>
                    <Avatar name={name} size={80} fontSize={28} />
                </div>
                <h2 style={styles.title}>Your Profile</h2>
                <p style={styles.email}>{user?.email}</p>

                <label style={styles.label}>Display Name</label>
                <input
                    style={styles.input}
                    value={name}
                    onChange={e => setName(e.target.value)}
                />

                {error && <p style={styles.error}>{error}</p>}
                {saved && <p style={styles.success}>Saved!</p>}

                <button style={styles.saveBtn} onClick={handleSave}>
                    Save Changes
                </button>

                <button style={styles.logoutBtn} onClick={() => { logout(); navigate('/login') }}>
                    Logout
                </button>
            </div>
        </div>
    )
}

const styles = {
    container: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0f2f5' },
    card: { background: '#fff', padding: '2rem', borderRadius: '12px', width: '380px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' },
    back: { background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', fontSize: '14px', marginBottom: '1rem', padding: 0 },
    avatarRow: { display: 'flex', justifyContent: 'center', marginBottom: '1rem' },
    title: { textAlign: 'center', color: '#1a1a2e', marginBottom: '0.25rem' },
    email: { textAlign: 'center', color: '#999', fontSize: '13px', marginBottom: '1.5rem' },
    label: { fontSize: '13px', color: '#555', display: 'block', marginBottom: '6px' },
    input: { width: '100%', padding: '10px', marginBottom: '1rem', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box', fontSize: '14px' },
    saveBtn: { width: '100%', padding: '10px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', marginBottom: '0.75rem' },
    logoutBtn: { width: '100%', padding: '10px', background: 'none', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' },
    error: { color: 'red', fontSize: '13px', marginBottom: '0.5rem' },
    success: { color: '#10b981', fontSize: '13px', marginBottom: '0.5rem' },
}

export default Profile