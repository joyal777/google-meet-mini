import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import Avatar from '../components/Avatar'
import api from '../api/axios'
import {
    Video, Plus, LogIn, LogOut, User,
    Clock, Users, Wifi, WifiOff
} from 'lucide-react'

function Dashboard() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [roomId, setRoomId] = useState('')
    const [error, setError] = useState('')
    const [creating, setCreating] = useState(false)
    const [joining, setJoining] = useState(false)
    const [history, setHistory] = useState([])
    const [loadingHistory, setLoadingHistory] = useState(true)

    useEffect(() => {
        api.get('/rooms/history')
            .then(res => setHistory(res.data))
            .catch(() => {})
            .finally(() => setLoadingHistory(false))
    }, [])

    const createRoom = async () => {
        try {
            setCreating(true)
            setError('')
            const res = await api.post('/rooms')
            navigate(`/room/${res.data.room.room_code}`)
        } catch (err) {
            setError('Failed to create room')
        } finally {
            setCreating(false)
        }
    }

    const joinRoom = async () => {
        if (!roomId.trim()) return
        try {
            setJoining(true)
            setError('')
            const res = await api.post(`/rooms/${roomId.trim()}/join`)
            navigate(`/room/${res.data.room.room_code}`)
        } catch (err) {
            setError(err.response?.data?.message || 'Room not found')
        } finally {
            setJoining(false)
        }
    }

    const rejoinRoom = async (code) => {
        try {
            const res = await api.post(`/rooms/${code}/join`)
            navigate(`/room/${res.data.room.room_code}`)
        } catch (err) {
            setError(err.response?.data?.message || 'Room not available')
        }
    }

    const formatDate = (dateStr) => {
        if (!dateStr) return ''
        const d = new Date(dateStr)
        return d.toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        })
    }

    return (
        <div style={styles.page}>

            {/* Sidebar */}
            <div style={styles.sidebar}>
                <div style={styles.logo}>
                    <Video size={20} color="#4f46e5" />
                    <span style={styles.logoText}>Meet Mini</span>
                </div>

                <div style={styles.sidebarNav}>
                    <div style={{ ...styles.navItem, ...styles.navItemActive }}>
                        <Video size={16} />
                        <span>Meetings</span>
                    </div>
                    <div style={styles.navItem} onClick={() => navigate('/profile')}>
                        <User size={16} />
                        <span>Profile</span>
                    </div>
                </div>

                <div style={styles.sidebarBottom}>
                    <div style={styles.sidebarUser} onClick={() => navigate('/profile')}>
                        <Avatar name={user?.name} size={34} fontSize={13} />
                        <div style={styles.sidebarUserInfo}>
                            <div style={styles.sidebarUserName}>{user?.name}</div>
                            <div style={styles.sidebarUserEmail}>{user?.email}</div>
                        </div>
                    </div>
                    <div
                        style={styles.logoutBtn}
                        onClick={() => { api.post('/auth/logout'); navigate('/login') }}
                    >
                        <LogOut size={15} />
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div style={styles.main}>

                {/* Top bar */}
                <div style={styles.topBar}>
                    <div>
                        <div style={styles.greeting}>Good day, {user?.name}</div>
                        <div style={styles.subGreeting}>Start or join a meeting below</div>
                    </div>
                </div>

                {/* Action cards */}
                <div style={styles.actionRow}>

                    {/* New meeting */}
                    <div style={styles.actionCard}>
                        <div style={styles.actionIcon}>
                            <Plus size={22} color="#4f46e5" />
                        </div>
                        <div style={styles.actionTitle}>New Meeting</div>
                        <div style={styles.actionDesc}>Create an instant meeting room</div>
                        <button
                            style={styles.actionBtn}
                            onClick={createRoom}
                            disabled={creating}
                        >
                            {creating ? 'Creating room...' : 'Start Meeting'}
                        </button>
                    </div>

                    {/* Join meeting */}
                    <div style={styles.actionCard}>
                        <div style={styles.actionIcon}>
                            <LogIn size={22} color="#10b981" />
                        </div>
                        <div style={styles.actionTitle}>Join Meeting</div>
                        <input
                            style={styles.codeInput}
                            placeholder="Enter room code"
                            value={roomId}
                            onChange={e => { setRoomId(e.target.value); setError('') }}
                            onKeyDown={e => e.key === 'Enter' && joinRoom()}
                        />
                        <button
                            style={{ ...styles.actionBtn, background: '#10b981' }}
                            onClick={joinRoom}
                            disabled={joining || !roomId.trim()}
                        >
                            {joining ? 'Joining room...' : 'Join Meeting'}
                        </button>
                    </div>

                </div>

                {error && <div style={styles.errorMsg}>{error}</div>}

                {/* Room History */}
                <div style={styles.historySection}>
                    <div style={styles.historyTitle}>
                        <Clock size={15} />
                        <span>Recent Meetings</span>
                    </div>

                    {loadingHistory ? (
                        <div style={styles.emptyMsg}>Loading...</div>
                    ) : history.length === 0 ? (
                        <div style={styles.emptyMsg}>No meetings yet. Start your first one above!</div>
                    ) : (
                        <div style={styles.historyList}>
                            {history.map((room, i) => (
                                <div key={i} style={styles.historyCard}>
                                    <div style={styles.historyLeft}>
                                        <div style={styles.historyCode}>
                                            <Video size={13} color="#4f46e5" />
                                            <span>{room.room_code}</span>
                                        </div>
                                        <div style={styles.historyMeta}>
                                            <span>Host: {room.host_name}</span>
                                            <span style={styles.dot}>·</span>
                                            <Users size={11} />
                                            <span>{room.all_participants?.length || 0} joined</span>
                                            <span style={styles.dot}>·</span>
                                            <span>{formatDate(room.created_at)}</span>
                                        </div>
                                        {/* Participant avatars */}
                                        <div style={styles.avatarStack}>
                                            {(room.all_participants || []).slice(0, 5).map((p, j) => (
                                                <div key={j} style={{ ...styles.stackedAvatar, zIndex: 5 - j }}>
                                                    <Avatar name={p.name} size={26} fontSize={10} />
                                                </div>
                                            ))}
                                            {room.all_participants?.length > 5 && (
                                                <div style={styles.moreAvatar}>
                                                    +{room.all_participants.length - 5}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div style={styles.historyRight}>
                                        <div style={room.is_active ? styles.activeBadge : styles.endedBadge}>
                                            {room.is_active
                                                ? <><Wifi size={10} /> Live</>
                                                : <><WifiOff size={10} /> Ended</>
                                            }
                                        </div>
                                        {room.is_active && (
                                            <button
                                                style={styles.rejoinBtn}
                                                onClick={() => rejoinRoom(room.room_code)}
                                            >
                                                Rejoin
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    )
}

const styles = {
    page: { display: 'flex', height: '100vh', background: '#f7f8fc', fontFamily: 'sans-serif' },

    // Sidebar
    sidebar: { width: '220px', background: '#fff', borderRight: '0.5px solid #e5e7eb', display: 'flex', flexDirection: 'column', padding: '1.5rem 1rem' },
    logo: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2rem', paddingLeft: '4px' },
    logoText: { fontSize: '16px', fontWeight: 600, color: '#1a1a2e' },
    sidebarNav: { display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 },
    navItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', color: '#6b7280' },
    navItemActive: { background: '#f0f0ff', color: '#4f46e5', fontWeight: 500 },
    sidebarBottom: { display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '1rem', borderTop: '0.5px solid #e5e7eb' },
    sidebarUser: { display: 'flex', alignItems: 'center', gap: '8px', flex: 1, cursor: 'pointer', borderRadius: '8px', padding: '6px' },
    sidebarUserInfo: { flex: 1, overflow: 'hidden' },
    sidebarUserName: { fontSize: '13px', fontWeight: 500, color: '#1a1a2e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    sidebarUserEmail: { fontSize: '11px', color: '#9ca3af', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    logoutBtn: { padding: '6px', cursor: 'pointer', color: '#ef4444', borderRadius: '6px' },

    // Main
    main: { flex: 1, padding: '2rem', overflowY: 'auto' },
    topBar: { marginBottom: '2rem' },
    greeting: { fontSize: '22px', fontWeight: 600, color: '#1a1a2e' },
    subGreeting: { fontSize: '14px', color: '#6b7280', marginTop: '4px' },

    // Action cards
    actionRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem', maxWidth: '700px' },
    actionCard: { background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: '12px', padding: '1.5rem' },
    actionIcon: { width: '42px', height: '42px', background: '#f0f0ff', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' },
    actionTitle: { fontSize: '15px', fontWeight: 600, color: '#1a1a2e', marginBottom: '4px' },
    actionDesc: { fontSize: '13px', color: '#6b7280', marginBottom: '1rem' },
    actionBtn: { width: '100%', padding: '10px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 500 },
    codeInput: { width: '100%', padding: '9px 12px', marginBottom: '0.75rem', borderRadius: '8px', border: '1px solid #e5e7eb', boxSizing: 'border-box', fontSize: '14px', outline: 'none' },

    errorMsg: { color: '#ef4444', fontSize: '13px', marginBottom: '1rem', padding: '10px 14px', background: '#fef2f2', borderRadius: '8px', maxWidth: '700px' },

    // History
    historySection: { maxWidth: '700px' },
    historyTitle: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '1rem' },
    emptyMsg: { fontSize: '14px', color: '#9ca3af', padding: '2rem', textAlign: 'center', background: '#fff', borderRadius: '12px', border: '0.5px solid #e5e7eb' },
    historyList: { display: 'flex', flexDirection: 'column', gap: '10px' },
    historyCard: { background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: '12px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    historyLeft: { display: 'flex', flexDirection: 'column', gap: '6px' },
    historyCode: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 600, color: '#1a1a2e' },
    historyMeta: { display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#6b7280' },
    dot: { color: '#d1d5db' },
    avatarStack: { display: 'flex', alignItems: 'center' },
    stackedAvatar: { marginRight: '-6px', border: '2px solid #fff', borderRadius: '50%' },
    moreAvatar: { width: '26px', height: '26px', borderRadius: '50%', background: '#e5e7eb', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', marginLeft: '8px' },
    historyRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' },
    activeBadge: { display: 'flex', alignItems: 'center', gap: '4px', background: '#d1fae5', color: '#065f46', fontSize: '11px', fontWeight: 500, padding: '3px 8px', borderRadius: '20px' },
    endedBadge: { display: 'flex', alignItems: 'center', gap: '4px', background: '#f3f4f6', color: '#6b7280', fontSize: '11px', padding: '3px 8px', borderRadius: '20px' },
    rejoinBtn: { padding: '5px 14px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 500 },
}

export default Dashboard