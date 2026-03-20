const COLORS = [
    '#4f46e5', '#10b981', '#ef4444', '#f59e0b',
    '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'
]

export const getColor = (name) => {
    if (!name) return COLORS[0]
    return COLORS[name.charCodeAt(0) % COLORS.length]
}

function Avatar({ name, size = 48, fontSize = 18 }) {
    const initials = name
        ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : '?'
    const color = getColor(name)

    return (
        <div style={{
            width: size,
            height: size,
            borderRadius: '50%',
            background: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 600,
            fontSize,
            flexShrink: 0,
        }}>
            {initials}
        </div>
    )
}

export default Avatar