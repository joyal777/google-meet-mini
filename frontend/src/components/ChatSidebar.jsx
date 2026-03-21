import { useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'
import Avatar from './Avatar'
import api from '../api/axios'

function formatTime(iso) {
    const d = new Date(iso)
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

function ChatSidebar({ roomId, user, socket, onUnread, isOpen }) {
    const [messages, setMessages] = useState([])
    const [newMessage, setNewMessage] = useState('')
    const chatBottomRef = useRef()
    const isOpenRef = useRef(isOpen)

    useEffect(() => {
        isOpenRef.current = isOpen
    }, [isOpen])

    useEffect(() => {
        api.get(`/rooms/${roomId}/messages`)
            .then(res => setMessages(res.data.map(m => ({
                id:        m._id,
                userName:  m.user_name,
                message:   m.message,
                timestamp: m.created_at,
            }))))
            .catch(() => {})
    }, [roomId])

    useEffect(() => {
        if (!socket) return
        const handler = (msg) => {
            setMessages(prev => {
                if (prev.find(m => m.id === msg.id)) return prev
                return [...prev, msg]
            })
            if (!isOpenRef.current) onUnread?.()
        }
        socket.on('chat-message', handler)
        return () => socket.off('chat-message', handler)
    }, [socket])

    useEffect(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const sendMessage = async () => {
        if (!newMessage.trim()) return
        const text = newMessage.trim()
        setNewMessage('')
        await api.post(`/rooms/${roomId}/messages`, { message: text })
        socket.emit('chat-message', { userName: user?.name, message: text })
    }

    return (
        <div style={styles.sidebar}>
            <div style={styles.header}>
                <span style={styles.title}>In-call messages</span>
            </div>
            <div style={styles.messages}>
                {messages.length === 0 && (
                    <div style={styles.empty}>No messages yet. Say hello!</div>
                )}
                {messages.map((msg, i) => {
                    const isMe = msg.userName === user?.name
                    return (
                        <div key={i} style={{ ...styles.msgWrap, justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                            {!isMe && (
                                <div style={styles.msgAvatar}>
                                    <Avatar name={msg.userName} size={28} fontSize={11} />
                                </div>
                            )}
                            <div style={{ maxWidth: '75%' }}>
                                {!isMe && <div style={styles.senderName}>{msg.userName}</div>}
                                <div style={isMe ? styles.bubbleMe : styles.bubbleOther}>
                                    {msg.message}
                                </div>
                                <div style={{ ...styles.time, textAlign: isMe ? 'right' : 'left' }}>
                                    {formatTime(msg.timestamp)}
                                </div>
                            </div>
                        </div>
                    )
                })}
                <div ref={chatBottomRef} />
            </div>
            <div style={styles.inputRow}>
                <input
                    style={styles.input}
                    placeholder="Send a message..."
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendMessage()}
                />
                <button style={styles.sendBtn} onClick={sendMessage}>
                    <Send size={15} />
                </button>
            </div>
        </div>
    )
}

const styles = {
    sidebar: { width: '300px', background: '#16213e', borderLeft: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', flexShrink: 0, height: '100%' },
    header: { padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    title: { fontSize: '14px', fontWeight: 600, color: '#e2e8f0' },
    messages: { flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '12px' },
    empty: { textAlign: 'center', color: '#4a5568', fontSize: '13px', marginTop: '2rem' },
    msgWrap: { display: 'flex', alignItems: 'flex-end', gap: '8px' },
    msgAvatar: { flexShrink: 0 },
    senderName: { fontSize: '11px', color: '#a0aec0', marginBottom: '3px', paddingLeft: '2px' },
    bubbleMe: { background: '#4f46e5', color: '#fff', padding: '8px 12px', borderRadius: '16px 16px 4px 16px', fontSize: '13px', lineHeight: 1.4, wordBreak: 'break-word' },
    bubbleOther: { background: '#2d3748', color: '#e2e8f0', padding: '8px 12px', borderRadius: '16px 16px 16px 4px', fontSize: '13px', lineHeight: 1.4, wordBreak: 'break-word' },
    time: { fontSize: '10px', color: '#4a5568', marginTop: '3px', paddingLeft: '2px' },
    inputRow: { padding: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: '8px', alignItems: 'center' },
    input: { flex: 1, background: '#2d3748', border: 'none', borderRadius: '20px', padding: '8px 14px', color: '#fff', fontSize: '13px', outline: 'none' },
    sendBtn: { width: '34px', height: '34px', background: '#4f46e5', border: 'none', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', flexShrink: 0 },
}

export default ChatSidebar