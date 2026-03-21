import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import { useAuth } from '../context/AuthContext'
import Avatar from '../components/Avatar'
import ChatSidebar from '../components/ChatSidebar'
import api from '../api/axios'
import {
    Mic, MicOff, Video, VideoOff,
    PhoneOff, MessageSquare, Crown,
    VolumeX
} from 'lucide-react'

function getGridStyle(count) {
    if (count === 1) return { gridTemplateColumns: '1fr' }
    return { gridTemplateColumns: 'repeat(2, 1fr)' }
}

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ]
}

const getStream = async () => {
    try {
        return await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480 },
            audio: true
        })
    } catch {
        try {
            return await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        } catch {
            try {
                return await navigator.mediaDevices.getUserMedia({ video: false, audio: true })
            } catch {
                throw new Error('No media available')
            }
        }
    }
}

function Room() {
    const { roomId } = useParams()
    const navigate = useNavigate()
    const { user } = useAuth()
    const [peers, setPeers] = useState([])
    const [muted, setMuted] = useState(false)
    const [videoOff, setVideoOff] = useState(false)
    const [roomData, setRoomData] = useState(null)
    const [liveParticipants, setLiveParticipants] = useState([])
    const [error, setError] = useState('')
    const [chatOpen, setChatOpen] = useState(false)
    const [unreadCount, setUnreadCount] = useState(0)
    const [socketReady, setSocketReady] = useState(false)
    const myVideo = useRef()
    const streamRef = useRef()
    const socketRef = useRef()
    const pcsRef = useRef({})
    const joined = useRef(false)

    const parseParticipants = (raw) => {
        if (!raw) return []
        if (Array.isArray(raw)) return raw
        try { return JSON.parse(raw) } catch { return [] }
    }

    useEffect(() => {
        if (!videoOff && myVideo.current && streamRef.current) {
            myVideo.current.srcObject = streamRef.current
        }
    }, [videoOff])

    useEffect(() => {
        if (joined.current) return
        joined.current = true

        const socket = io('http://localhost:5000')
        socketRef.current = socket

        api.post(`/rooms/${roomId}/join`)
            .then(res => {
                setRoomData(res.data.room)
                const parsed = parseParticipants(res.data.room.participants)
                const unique = parsed.filter(
                    (p, i, arr) => arr.findIndex(x => x.name === p.name) === i
                )
                setLiveParticipants(unique.map(p => ({ id: p.id, name: p.name })))
            })
            .catch(() => setError('Room not found or no longer active'))

        getStream()
            .then(stream => {
                streamRef.current = stream
                if (myVideo.current) myVideo.current.srcObject = stream

                socket.on('connect', () => {
                    console.log('Socket connected:', socket.id)
                    socket.emit('join-room', roomId, socket.id, user?.name)
                })

                if (socket.connected) {
                    socket.emit('join-room', roomId, socket.id, user?.name)
                }

                setSocketReady(true)

                socket.on('user-connected', async (socketId, userName) => {
                    console.log('user-connected:', userName, socketId)
                    if (socketId === socket.id) return
                    if (pcsRef.current[socketId]) return

                    const pc = createPC(socketId, userName, stream)
                    pcsRef.current[socketId] = { pc, name: userName }
                    const offer = await pc.createOffer()
                    await pc.setLocalDescription(offer)
                    socket.emit('signal', {
                        to: socketId,
                        signal: { type: 'offer', sdp: offer.sdp },
                        name: user?.name
                    })
                })

                socket.on('signal', async ({ from, signal, name }) => {
                    if (from === socket.id) return

                    if (signal.type === 'offer') {
                        if (pcsRef.current[from]) return
                        const pc = createPC(from, name, stream)
                        pcsRef.current[from] = { pc, name }
                        await pc.setRemoteDescription(new RTCSessionDescription(signal))
                        const answer = await pc.createAnswer()
                        await pc.setLocalDescription(answer)
                        socket.emit('signal', {
                            to: from,
                            signal: { type: 'answer', sdp: answer.sdp },
                            name: user?.name
                        })
                    } else if (signal.type === 'answer') {
                        const entry = pcsRef.current[from]
                        if (entry?.pc.signalingState !== 'stable') {
                            await entry.pc.setRemoteDescription(new RTCSessionDescription(signal))
                        }
                    } else if (signal.candidate) {
                        const entry = pcsRef.current[from]
                        if (entry) {
                            try { await entry.pc.addIceCandidate(new RTCIceCandidate(signal)) }
                            catch (e) { console.error('ICE error:', e) }
                        }
                    }
                })

                socket.on('peer-media-state', ({ socketId, video, audio }) => {
                    setPeers(prev => prev.map(p =>
                        p.socketId === socketId ? { ...p, videoOff: !video, audioOff: !audio } : p
                    ))
                })

                socket.on('user-disconnected', socketId => {
                    const entry = pcsRef.current[socketId]
                    if (entry) {
                        const name = entry.name
                        entry.pc.close()
                        delete pcsRef.current[socketId]
                        setPeers(prev => prev.filter(p => p.socketId !== socketId))
                        setLiveParticipants(prev => prev.filter(p => p.name !== name))
                    }
                })
            })
            .catch(err => {
                console.error('Media error:', err)
                setError('Could not access camera/microphone')
            })

        return () => {
            joined.current = false
            streamRef.current?.getTracks().forEach(t => t.stop())
            Object.values(pcsRef.current).forEach(({ pc }) => pc.close())
            pcsRef.current = {}
            socket.disconnect()
        }
    }, [roomId])

    const createPC = (socketId, name, stream) => {
        const pc = new RTCPeerConnection(ICE_SERVERS)
        stream.getTracks().forEach(track => pc.addTrack(track, stream))

        pc.onicecandidate = (e) => {
            if (e.candidate) {
                socketRef.current.emit('signal', {
                    to: socketId,
                    signal: e.candidate,
                    name: user?.name
                })
            }
        }

        pc.ontrack = (e) => {
            const remoteStream = e.streams[0]
            if (!remoteStream) return
            setPeers(prev => {
                const exists = prev.find(p => p.socketId === socketId)
                if (exists) {
                    return prev.map(p =>
                        p.socketId === socketId ? { ...p, stream: remoteStream } : p
                    )
                }
                return [...prev, {
                    socketId, name,
                    stream: remoteStream,
                    videoOff: false,
                    audioOff: false
                }]
            })
        }

        pc.onconnectionstatechange = () => {
            console.log(`Connection (${name}):`, pc.connectionState)
        }

        return pc
    }

    const toggleMute = () => {
        const newMuted = !muted
        streamRef.current.getAudioTracks().forEach(t => t.enabled = !newMuted)
        setMuted(newMuted)
        socketRef.current.emit('media-state', { video: !videoOff, audio: !newMuted })
    }

    const toggleVideo = () => {
        const newVideoOff = !videoOff
        streamRef.current.getVideoTracks().forEach(t => t.enabled = !newVideoOff)
        setVideoOff(newVideoOff)
        socketRef.current.emit('media-state', { video: !newVideoOff, audio: !muted })
    }

    const leaveRoom = async () => {
        streamRef.current?.getTracks().forEach(t => t.stop())
        Object.values(pcsRef.current).forEach(({ pc }) => pc.close())
        await api.post(`/rooms/${roomId}/leave`)
        socketRef.current?.disconnect()
        navigate('/dashboard')
    }

    const isHost = roomData?.host_id === user?.id
    const totalCount = peers.length + 1

    if (error) return (
        <div style={styles.errorScreen}>
            <p style={{ color: '#fff', marginBottom: '1rem' }}>{error}</p>
            <button style={styles.btnRed} onClick={() => navigate('/dashboard')}>
                Back to Dashboard
            </button>
        </div>
    )

    return (
        <div style={styles.container}>

            {/* Header */}
            <div style={styles.header}>
                <div style={styles.headerLeft}>
                    <Video size={14} color="#64748b" />
                    <span style={styles.roomCode}>{roomId}</span>
                    {isHost && (
                        <span style={styles.hostBadge}>
                            <Crown size={10} color="#1a1a2e" />
                            Host
                        </span>
                    )}
                </div>
                <div style={styles.participantsList}>
                    {liveParticipants.map((p, i) => (
                        <div key={i} style={styles.chip}>
                            <Avatar name={p.name} size={20} fontSize={8} />
                            <span style={styles.chipName}>{p.name}</span>
                            {roomData?.host_name === p.name && (
                                <span style={styles.hostTag}>host</span>
                            )}
                        </div>
                    ))}
                </div>
                <span style={styles.count}>
                    {totalCount} participant{totalCount !== 1 ? 's' : ''}
                </span>
            </div>

            {/* Body */}
            <div style={styles.body}>

                {/* Video Grid */}
                <div style={{ ...styles.grid, ...getGridStyle(totalCount) }}>

                    {/* My Video */}
                    <div style={styles.videoBox}>
                        {videoOff ? (
                            <div style={styles.avatarBox}>
                                <Avatar name={user?.name} size={80} fontSize={28} />
                            </div>
                        ) : (
                            <video ref={myVideo} autoPlay muted playsInline style={styles.video} />
                        )}
                        <div style={styles.nameTag}>
                            <span>{user?.name} (You)</span>
                            {isHost && <Crown size={11} color="#f59e0b" style={{ marginLeft: '4px' }} />}
                        </div>
                        <div style={styles.badgeRow}>
                            {muted && (
                                <span style={styles.badge}>
                                    <MicOff size={10} color="#fff" />
                                    <span>Muted</span>
                                </span>
                            )}
                            {videoOff && (
                                <span style={styles.badge}>
                                    <VideoOff size={10} color="#fff" />
                                    <span>Cam Off</span>
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Remote Peers */}
                    {peers.map(({ socketId, name, stream, videoOff: pvo, audioOff: pao }) => (
                        <PeerVideo
                            key={socketId}
                            stream={stream}
                            name={name}
                            videoOff={pvo}
                            audioOff={pao}
                        />
                    ))}
                </div>

                {/* Chat Sidebar */}
                <div style={{ display: chatOpen ? 'flex' : 'none', height: '100%' }}>
                    {socketReady && (
                        <ChatSidebar
                            roomId={roomId}
                            user={user}
                            socket={socketRef.current}
                            onUnread={() => setUnreadCount(c => c + 1)}
                            isOpen={chatOpen}
                        />
                    )}
                </div>
            </div>

            {/* Controls */}
            <div style={styles.controls}>

                <button
                    style={muted ? styles.btnActive : styles.btnControl}
                    onClick={toggleMute}
                    title={muted ? 'Unmute' : 'Mute'}
                >
                    {muted
                        ? <MicOff size={18} color="#fff" />
                        : <Mic size={18} color="#fff" />
                    }
                    <span style={styles.btnLabel}>{muted ? 'Unmute' : 'Mute'}</span>
                </button>

                <button
                    style={videoOff ? styles.btnActive : styles.btnControl}
                    onClick={toggleVideo}
                    title={videoOff ? 'Start Camera' : 'Stop Camera'}
                >
                    {videoOff
                        ? <VideoOff size={18} color="#fff" />
                        : <Video size={18} color="#fff" />
                    }
                    <span style={styles.btnLabel}>{videoOff ? 'Start Cam' : 'Stop Cam'}</span>
                </button>

                <button
                    style={{ ...styles.btnControl, position: 'relative' }}
                    onClick={() => { setChatOpen(o => !o); setUnreadCount(0) }}
                    title="Chat"
                >
                    <MessageSquare size={18} color="#fff" />
                    <span style={styles.btnLabel}>Chat</span>
                    {unreadCount > 0 && (
                        <span style={styles.unreadBadge}>{unreadCount}</span>
                    )}
                </button>

                <button
                    style={styles.btnLeave}
                    onClick={leaveRoom}
                    title="Leave"
                >
                    <PhoneOff size={18} color="#fff" />
                    <span style={styles.btnLabel}>Leave</span>
                </button>

            </div>
        </div>
    )
}

function PeerVideo({ stream, name, videoOff, audioOff }) {
    const ref = useRef()

    useEffect(() => {
        if (!stream || !ref.current) return
        ref.current.srcObject = stream
    }, [stream])

    return (
        <div style={styles.videoBox}>
            <video
                ref={ref}
                autoPlay
                playsInline
                style={{ ...styles.video, display: (!videoOff && stream) ? 'block' : 'none' }}
            />
            {(videoOff || !stream) && (
                <div style={styles.avatarBox}>
                    <Avatar name={name} size={80} fontSize={28} />
                </div>
            )}
            <div style={styles.nameTag}>
                <span>{name}</span>
            </div>
            <div style={styles.badgeRow}>
                {audioOff && (
                    <span style={styles.badge}>
                        <VolumeX size={10} color="#fff" />
                        <span>Muted</span>
                    </span>
                )}
                {videoOff && (
                    <span style={styles.badge}>
                        <VideoOff size={10} color="#fff" />
                        <span>Cam Off</span>
                    </span>
                )}
            </div>
        </div>
    )
}

const styles = {
    container: {
        display: 'flex', flexDirection: 'column',
        height: '100vh', background: '#0f172a',
        color: '#fff', fontFamily: "'Google Sans', sans-serif"
    },
    errorScreen: {
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: '#0f172a',
        color: '#fff', gap: '1rem'
    },
    header: {
        padding: '0.6rem 1.5rem', background: '#1e293b',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', gap: '1rem',
        flexWrap: 'wrap', flexShrink: 0,
        borderBottom: '1px solid rgba(255,255,255,0.06)'
    },
    headerLeft: { display: 'flex', alignItems: 'center', gap: '8px' },
    roomCode: { fontSize: '13px', color: '#94a3b8', fontWeight: 500 },
    hostBadge: {
        display: 'flex', alignItems: 'center', gap: '4px',
        background: '#f59e0b', color: '#1a1a2e',
        fontSize: '10px', fontWeight: 600,
        padding: '2px 8px', borderRadius: '20px'
    },
    hostTag: {
        background: 'rgba(245,158,11,0.15)',
        color: '#f59e0b', fontSize: '9px',
        padding: '1px 5px', borderRadius: '4px'
    },
    participantsList: { display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' },
    chip: {
        display: 'flex', alignItems: 'center', gap: '5px',
        background: 'rgba(255,255,255,0.06)',
        padding: '3px 8px', borderRadius: '20px'
    },
    chipName: { fontSize: '11px', color: '#cbd5e1' },
    count: { fontSize: '12px', color: '#475569', whiteSpace: 'nowrap' },
    body: { flex: 1, display: 'flex', overflow: 'hidden' },
    grid: {
        flex: 1, display: 'grid', gap: '10px',
        padding: '12px', overflowY: 'auto', alignContent: 'start'
    },
    videoBox: {
        position: 'relative', background: '#0d0d1f',
        borderRadius: '12px', overflow: 'hidden',
        minHeight: '220px', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        border: '1px solid rgba(255,255,255,0.04)'
    },
    avatarBox: {
        display: 'flex', alignItems: 'center',
        justifyContent: 'center', width: '100%',
        height: '100%', minHeight: '220px',
        position: 'absolute', top: 0, left: 0
    },
    video: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' },
    nameTag: {
        position: 'absolute', bottom: '10px', left: '10px',
        background: 'rgba(0,0,0,0.7)',
        padding: '3px 10px', borderRadius: '6px',
        fontSize: '12px', color: '#fff', zIndex: 2,
        display: 'flex', alignItems: 'center', gap: '4px'
    },
    badgeRow: {
        position: 'absolute', top: '10px', right: '10px',
        display: 'flex', gap: '4px', zIndex: 2
    },
    badge: {
        display: 'flex', alignItems: 'center', gap: '4px',
        background: 'rgba(0,0,0,0.65)',
        borderRadius: '6px', padding: '3px 7px',
        fontSize: '11px', color: '#fff'
    },
    controls: {
        display: 'flex', justifyContent: 'center',
        gap: '0.75rem', padding: '1rem 1.5rem',
        background: '#1e293b', flexShrink: 0,
        borderTop: '1px solid rgba(255,255,255,0.06)'
    },
    btnControl: {
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', padding: '10px 22px',
        background: '#334155', color: '#fff',
        border: 'none', borderRadius: '10px',
        cursor: 'pointer', gap: '4px',
        transition: 'background 0.15s'
    },
    btnActive: {
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', padding: '10px 22px',
        background: '#475569', color: '#fff',
        border: 'none', borderRadius: '10px',
        cursor: 'pointer', gap: '4px'
    },
    btnLeave: {
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', padding: '10px 22px',
        background: '#dc2626', color: '#fff',
        border: 'none', borderRadius: '10px',
        cursor: 'pointer', gap: '4px'
    },
    btnLabel: { fontSize: '11px', fontWeight: 500, color: '#cbd5e1' },
    unreadBadge: {
        position: 'absolute', top: '6px', right: '6px',
        background: '#ef4444', color: '#fff',
        fontSize: '10px', fontWeight: 700,
        borderRadius: '50%', width: '16px', height: '16px',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
    },
    btn: {
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', padding: '10px 22px',
        background: '#334155', color: '#fff',
        border: 'none', borderRadius: '10px',
        cursor: 'pointer', gap: '4px'
    },
    btnRed: {
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', padding: '10px 22px',
        background: '#dc2626', color: '#fff',
        border: 'none', borderRadius: '10px',
        cursor: 'pointer', gap: '4px'
    },
}

export default Room