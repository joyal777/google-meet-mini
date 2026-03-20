import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import { useAuth } from '../context/AuthContext'
import Avatar from '../components/Avatar'
import api from '../api/axios'

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

        socketRef.current = io('http://localhost:5000')

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

        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then(stream => {
                streamRef.current = stream
                if (myVideo.current) myVideo.current.srcObject = stream

                socketRef.current.emit('join-room', roomId, socketRef.current.id, user?.name)

                socketRef.current.on('user-connected', async (socketId, userName) => {
                    console.log('✅ user-connected:', userName, socketId)
                    if (pcsRef.current[socketId]) return

                    const pc = createPC(socketId, userName, stream)
                    pcsRef.current[socketId] = { pc, name: userName }

                    const offer = await pc.createOffer()
                    await pc.setLocalDescription(offer)
                    socketRef.current.emit('signal', {
                        to: socketId,
                        signal: { type: 'offer', sdp: offer.sdp },
                        name: user?.name
                    })
                })

                socketRef.current.on('signal', async ({ from, signal, name }) => {
                    if (signal.type === 'offer') {
                        if (pcsRef.current[from]) return
                        const pc = createPC(from, name, stream)
                        pcsRef.current[from] = { pc, name }

                        await pc.setRemoteDescription(new RTCSessionDescription(signal))
                        const answer = await pc.createAnswer()
                        await pc.setLocalDescription(answer)
                        socketRef.current.emit('signal', {
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
                            try {
                                await entry.pc.addIceCandidate(new RTCIceCandidate(signal))
                            } catch (e) {
                                console.error('ICE error:', e)
                            }
                        }
                    }
                })

                // Receive media state from other peers
                socketRef.current.on('peer-media-state', ({ socketId, video, audio }) => {
                    console.log('📸 peer-media-state:', socketId, video, audio)
                    setPeers(prev => prev.map(p =>
                        p.socketId === socketId
                            ? { ...p, videoOff: !video, audioOff: !audio }
                            : p
                    ))
                })

                socketRef.current.on('user-disconnected', socketId => {
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
            streamRef.current?.getTracks().forEach(t => t.stop())
            Object.values(pcsRef.current).forEach(({ pc }) => pc.close())
            socketRef.current?.disconnect()
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
            console.log('🎥 Got track from:', name)
            const remoteStream = e.streams[0]
            setPeers(prev => {
                const exists = prev.find(p => p.socketId === socketId)
                if (exists) {
                    return prev.map(p =>
                        p.socketId === socketId ? { ...p, stream: remoteStream } : p
                    )
                }
                return [...prev, { socketId, name, stream: remoteStream, videoOff: false, audioOff: false }]
            })
        }

        pc.onconnectionstatechange = () => {
            console.log(`🔗 Connection (${name}):`, pc.connectionState)
        }

        return pc
    }

    const toggleMute = () => {
        const newMuted = !muted
        streamRef.current.getAudioTracks().forEach(t => t.enabled = !newMuted)
        setMuted(newMuted)
        // Tell everyone our audio state
        socketRef.current.emit('media-state', {
            video: !videoOff,
            audio: !newMuted,
        })
    }

    const toggleVideo = () => {
        const newVideoOff = !videoOff
        streamRef.current.getVideoTracks().forEach(t => t.enabled = !newVideoOff)
        setVideoOff(newVideoOff)
        // Tell everyone our video state
        socketRef.current.emit('media-state', {
            video: !newVideoOff,
            audio: !muted,
        })
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
            <button style={styles.btn} onClick={() => navigate('/dashboard')}>
                Back to Dashboard
            </button>
        </div>
    )

    return (
        <div style={styles.container}>

            {/* Header */}
            <div style={styles.header}>
                <div style={styles.headerLeft}>
                    <span style={styles.roomCode}>📹 {roomId}</span>
                    {isHost && <span style={styles.hostBadge}>Host</span>}
                </div>
                <div style={styles.participantsList}>
                    {liveParticipants.map((p, i) => (
                        <div key={i} style={styles.chip}>
                            <Avatar name={p.name} size={22} fontSize={9} />
                            <span style={styles.chipName}>{p.name}</span>
                            {roomData?.host_name === p.name &&
                                <span style={styles.hostTag}>host</span>}
                        </div>
                    ))}
                </div>
                <span style={styles.count}>
                    {totalCount} participant{totalCount !== 1 ? 's' : ''}
                </span>
            </div>

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
                        {user?.name} (You) {isHost ? '👑' : ''}
                    </div>
                    <div style={styles.badgeRow}>
                        {muted && <span style={styles.badge}>🔇</span>}
                        {videoOff && <span style={styles.badge}>📷 Off</span>}
                    </div>
                </div>

                {/* Remote Peers */}
                {peers.map(({ socketId, name, stream, videoOff: peerVideoOff, audioOff: peerAudioOff }) => (
                    <PeerVideo
                        key={socketId}
                        stream={stream}
                        name={name}
                        videoOff={peerVideoOff}
                        audioOff={peerAudioOff}
                    />
                ))}
            </div>

            {/* Controls */}
            <div style={styles.controls}>
                <button style={muted ? styles.btnOff : styles.btn} onClick={toggleMute}>
                    {muted ? '🔇' : '🎤'}
                    <span style={styles.btnLabel}>{muted ? 'Unmute' : 'Mute'}</span>
                </button>
                <button style={styles.btnRed} onClick={leaveRoom}>
                    📵
                    <span style={styles.btnLabel}>Leave</span>
                </button>
                <button style={videoOff ? styles.btnOff : styles.btn} onClick={toggleVideo}>
                    {videoOff ? '📷' : '📹'}
                    <span style={styles.btnLabel}>{videoOff ? 'Start Cam' : 'Stop Cam'}</span>
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
            {/* Always render video element but hide when off */}
            <video
                ref={ref}
                autoPlay
                playsInline
                style={{ ...styles.video, display: (!videoOff && stream) ? 'block' : 'none' }}
            />
            {/* Show avatar when camera off */}
            {(videoOff || !stream) && (
                <div style={styles.avatarBox}>
                    <Avatar name={name} size={80} fontSize={28} />
                </div>
            )}
            <div style={styles.nameTag}>{name}</div>
            {/* Show mute/video off badges */}
            <div style={styles.badgeRow}>
                {audioOff && <span style={styles.badge}>🔇</span>}
                {videoOff && <span style={styles.badge}>📷 Off</span>}
            </div>
        </div>
    )
}

const styles = {
    container: { display: 'flex', flexDirection: 'column', height: '100vh', background: '#1a1a2e', color: '#fff', fontFamily: 'sans-serif' },
    errorScreen: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#1a1a2e', color: '#fff', gap: '1rem' },
    header: { padding: '0.6rem 1.5rem', background: '#16213e', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' },
    headerLeft: { display: 'flex', alignItems: 'center', gap: '8px' },
    roomCode: { fontSize: '13px', color: '#a0aec0', fontWeight: 500 },
    hostBadge: { background: '#f59e0b', color: '#1a1a2e', fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '20px' },
    hostTag: { background: 'rgba(245,158,11,0.2)', color: '#f59e0b', fontSize: '9px', padding: '1px 5px', borderRadius: '4px' },
    participantsList: { display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' },
    chip: { display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(255,255,255,0.08)', padding: '3px 8px', borderRadius: '20px' },
    chipName: { fontSize: '11px', color: '#e2e8f0' },
    count: { fontSize: '12px', color: '#718096', whiteSpace: 'nowrap' },
    grid: { flex: 1, display: 'grid', gap: '10px', padding: '12px', overflowY: 'auto', alignContent: 'start' },
    videoBox: { position: 'relative', background: '#0d0d1f', borderRadius: '12px', overflow: 'hidden', minHeight: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    avatarBox: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', minHeight: '220px', position: 'absolute', top: 0, left: 0 },
    video: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' },
    nameTag: { position: 'absolute', bottom: '10px', left: '10px', background: 'rgba(0,0,0,0.65)', padding: '3px 10px', borderRadius: '6px', fontSize: '12px', color: '#fff', zIndex: 2 },
    badgeRow: { position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '4px', zIndex: 2 },
    badge: { background: 'rgba(0,0,0,0.6)', borderRadius: '6px', padding: '3px 7px', fontSize: '11px' },
    controls: { display: 'flex', justifyContent: 'center', gap: '1rem', padding: '1rem 1.5rem', background: '#16213e' },
    btn: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 20px', background: '#2d3748', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '18px', gap: '3px' },
    btnOff: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 20px', background: '#4a5568', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '18px', gap: '3px' },
    btnRed: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 20px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '18px', gap: '3px' },
    btnLabel: { fontSize: '11px', fontWeight: 500 },
}

export default Room