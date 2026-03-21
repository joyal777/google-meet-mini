import { useEffect, useRef, useState } from 'react'
import { Send, MessageSquare } from 'lucide-react'
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

            {/* Header */}
            <div style={styles.header}>
                <div style={styles.headerLeft}>
                    <MessageSquare size={15} color="#a0aec0" />
                    <span style={styles.title}>In-call messages</span>
                </div>
                <span style={styles.count}>{messages.length}</span>
            </div>

            {/* Messages */}
            <div style={styles.messages}>
                {messages.length === 0 && (
                    <div style={styles.emptyState}>
                        <MessageSquare size={32} color="#2d3748" />
                        <p style={styles.emptyText}>No messages yet</p>
                        <p style={styles.emptySubText}>Start the conversation</p>
                    </div>
                )}
                {messages.map((msg, i) => {
                    const isMe = msg.userName === user?.name
                    const showAvatar = !isMe
                    const prevMsg = messages[i - 1]
                    const showSender = !isMe && (!prevMsg || prevMsg.userName !== msg.userName)

                    return (
                        <div
                            key={i}
                            style={{
                                ...styles.msgWrap,
                                justifyContent: isMe ? 'flex-end' : 'flex-start',
                                marginTop: showSender && i > 0 ? '8px' : '2px',
                            }}
                        >
                            {/* Avatar — only show for first message in a group */}
                            <div style={{ width: '28px', flexShrink: 0 }}>
                                {showAvatar && showSender && (
                                    <Avatar name={msg.userName} size={28} fontSize={11} />
                                )}
                            </div>

                            <div style={{ maxWidth: '78%' }}>
                                {showSender && (
                                    <div style={styles.senderName}>{msg.userName}</div>
                                )}
                                <div style={isMe ? styles.bubbleMe : styles.bubbleOther}>
                                    {msg.message}
                                </div>
                                <div style={{
                                    ...styles.time,
                                    textAlign: isMe ? 'right' : 'left',
                                }}>
                                    {formatTime(msg.timestamp)}
                                </div>
                            </div>
                        </div>
                    )
                })}
                <div ref={chatBottomRef} />
            </div>

            {/* Input */}
            <div style={styles.inputRow}>
                <input
                    style={styles.input}
                    placeholder="Send a message..."
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendMessage()}
                />
                <button
                    style={{
                        ...styles.sendBtn,
                        opacity: newMessage.trim() ? 1 : 0.4,
                        cursor: newMessage.trim() ? 'pointer' : 'default',
                    }}
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                >
                    <Send size={14} />
                </button>
            </div>
        </div>
    )
}

const styles = {
    sidebar: {
        width: '300px',
        background: '#0f172a',
        borderLeft: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        height: '100%',
        fontFamily: "'Google Sans', sans-serif",
    },
    header: {
        padding: '0.875rem 1rem',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
    },
    headerLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    title: {
        fontSize: '13px',
        fontWeight: 500,
        color: '#cbd5e1',
        letterSpacing: '0.1px',
    },
    count: {
        fontSize: '11px',
        color: '#475569',
        background: 'rgba(255,255,255,0.06)',
        padding: '2px 7px',
        borderRadius: '10px',
    },
    messages: {
        flex: 1,
        overflowY: 'auto',
        padding: '1rem 0.75rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
    },
    emptyState: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        gap: '8px',
        marginTop: '4rem',
    },
    emptyText: {
        fontSize: '14px',
        color: '#475569',
        margin: 0,
        fontWeight: 500,
    },
    emptySubText: {
        fontSize: '12px',
        color: '#334155',
        margin: 0,
    },
    msgWrap: {
        display: 'flex',
        alignItems: 'flex-end',
        gap: '6px',
    },
    senderName: {
        fontSize: '11px',
        color: '#64748b',
        marginBottom: '3px',
        paddingLeft: '2px',
    },
    bubbleMe: {
        background: '#4f46e5',
        color: '#fff',
        padding: '7px 12px',
        borderRadius: '16px 16px 4px 16px',
        fontSize: '13px',
        lineHeight: 1.5,
        wordBreak: 'break-word',
    },
    bubbleOther: {
        background: '#1e293b',
        color: '#e2e8f0',
        padding: '7px 12px',
        borderRadius: '16px 16px 16px 4px',
        fontSize: '13px',
        lineHeight: 1.5,
        wordBreak: 'break-word',
        border: '1px solid rgba(255,255,255,0.06)',
    },
    time: {
        fontSize: '10px',
        color: '#334155',
        marginTop: '3px',
        paddingLeft: '2px',
    },
    inputRow: {
        padding: '0.75rem',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        flexShrink: 0,
    },
    input: {
        flex: 1,
        background: '#1e293b',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '20px',
        padding: '8px 14px',
        color: '#e2e8f0',
        fontSize: '13px',
        outline: 'none',
        fontFamily: "'Google Sans', sans-serif",
    },
    sendBtn: {
        width: '32px',
        height: '32px',
        background: '#4f46e5',
        border: 'none',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        flexShrink: 0,
        transition: 'opacity 0.15s',
    },
}

export default ChatSidebar