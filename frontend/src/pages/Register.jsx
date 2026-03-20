import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate, Link } from 'react-router-dom'
import { Video, Mail, Lock, User, AlertCircle } from 'lucide-react'

function Register() {
    const { register } = useAuth()
    const navigate = useNavigate()
    const [form, setForm] = useState({ name: '', email: '', password: '' })
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async () => {
        try {
            setLoading(true)
            setError('')
            await register(form.name, form.email, form.password)
            navigate('/dashboard')
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={styles.page}>

            {/* Left — Form */}
            <div style={styles.left}>
                <div style={styles.formWrap}>

                    <div style={styles.logo}>
                        <div style={styles.logoIcon}>
                            <Video size={20} color="#fff" />
                        </div>
                        <span style={styles.logoText}>Meet Mini</span>
                    </div>

                    <h1 style={styles.heading}>Create account</h1>
                    <p style={styles.subheading}>
                        Start meeting with Meet Mini today
                    </p>

                    {error && (
                        <div style={styles.errorBox}>
                            <AlertCircle size={14} color="#c0392b" />
                            <span>{error}</span>
                        </div>
                    )}

                    <div style={styles.fieldWrap}>
                        <div style={styles.fieldIcon}>
                            <User size={16} color="#5f6368" />
                        </div>
                        <input
                            style={styles.input}
                            type="text"
                            placeholder="Full name"
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                        />
                    </div>

                    <div style={styles.fieldWrap}>
                        <div style={styles.fieldIcon}>
                            <Mail size={16} color="#5f6368" />
                        </div>
                        <input
                            style={styles.input}
                            type="email"
                            placeholder="Email address"
                            value={form.email}
                            onChange={e => setForm({ ...form, email: e.target.value })}
                        />
                    </div>

                    <div style={styles.fieldWrap}>
                        <div style={styles.fieldIcon}>
                            <Lock size={16} color="#5f6368" />
                        </div>
                        <input
                            style={styles.input}
                            type="password"
                            placeholder="Password (min 6 characters)"
                            value={form.password}
                            onChange={e => setForm({ ...form, password: e.target.value })}
                            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                        />
                    </div>

                    <button
                        style={{ ...styles.btn, opacity: loading ? 0.8 : 1 }}
                        onClick={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? 'Creating account...' : 'Create account'}
                    </button>

                    <div style={styles.divider}>
                        <span style={styles.dividerLine} />
                        <span style={styles.dividerText}>or</span>
                        <span style={styles.dividerLine} />
                    </div>

                    <p style={styles.switchText}>
                        Already have an account?{' '}
                        <Link to="/login" style={styles.switchLink}>
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>

            {/* Right */}
            <div style={styles.right}>
                <div style={styles.rightContent}>
                    <img
                        src="/meet-illustration.png"
                        alt="Video meeting illustration"
                        style={styles.illustration}
                        onError={e => e.target.style.display = 'none'}
                    />
                    <h2 style={styles.rightHeading}>
                        Connect with anyone, anywhere.
                    </h2>
                    <p style={styles.rightSub}>
                        Join millions of people using Meet Mini for
                        secure, high-quality video meetings.
                    </p>
                    <div style={styles.featureList}>
                        {['Free to use, always', 'No downloads required', 'Works on any device'].map((f, i) => (
                            <div key={i} style={styles.featureItem}>
                                <div style={styles.featureDot} />
                                <span>{f}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

        </div>
    )
}

const styles = {
    page: { display: 'flex', height: '100vh', fontFamily: "'Google Sans', 'Roboto', sans-serif", background: '#fff' },
    left: { width: '440px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', borderRight: '1px solid #e8eaed' },
    formWrap: { width: '100%', maxWidth: '340px' },
    logo: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2.5rem' },
    logoIcon: { width: '36px', height: '36px', background: 'linear-gradient(135deg, #4285f4, #1a73e8)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    logoText: { fontSize: '20px', fontWeight: 600, color: '#202124', letterSpacing: '-0.3px' },
    heading: { fontSize: '26px', fontWeight: 500, color: '#202124', margin: '0 0 8px' },
    subheading: { fontSize: '15px', color: '#5f6368', margin: '0 0 2rem' },
    errorBox: { display: 'flex', alignItems: 'center', gap: '8px', background: '#fce8e6', border: '1px solid #f5c6c2', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#c0392b', marginBottom: '1.25rem' },
    fieldWrap: { position: 'relative', marginBottom: '1rem' },
    fieldIcon: { position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' },
    input: { width: '100%', padding: '13px 14px 13px 42px', border: '1.5px solid #dadce0', borderRadius: '8px', fontSize: '15px', color: '#202124', boxSizing: 'border-box', outline: 'none', fontFamily: "'Google Sans', 'Roboto', sans-serif" },
    btn: { width: '100%', padding: '13px', background: '#1a73e8', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 500, cursor: 'pointer', marginTop: '0.5rem', fontFamily: "'Google Sans', 'Roboto', sans-serif" },
    divider: { display: 'flex', alignItems: 'center', gap: '12px', margin: '1.5rem 0' },
    dividerLine: { flex: 1, height: '1px', background: '#e8eaed' },
    dividerText: { fontSize: '13px', color: '#5f6368' },
    switchText: { textAlign: 'center', fontSize: '14px', color: '#5f6368', margin: 0 },
    switchLink: { color: '#1a73e8', fontWeight: 500, textDecoration: 'none' },
    right: { flex: 1, background: '#f8f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem' },
    rightContent: { maxWidth: '460px', textAlign: 'center' },
    illustration: { width: '100%', maxWidth: '250px', marginBottom: '2rem', borderRadius: '16px' },
    rightHeading: { fontSize: '28px', fontWeight: 600, color: '#202124', margin: '0 0 12px', lineHeight: 1.3 },
    rightSub: { fontSize: '15px', color: '#5f6368', lineHeight: 1.6, margin: '0 0 2rem' },
    featureList: { display: 'inline-flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-start' },
    featureItem: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#3c4043' },
    featureDot: { width: '8px', height: '8px', borderRadius: '50%', background: '#1a73e8', flexShrink: 0 },
}

export default Register