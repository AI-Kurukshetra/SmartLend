'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { X, Pencil, Check, Phone, Mail, FileText, User, Loader2 } from 'lucide-react'
import { useTheme } from '@/components/ThemeProvider'
import { lightColors, darkColors } from '@/lib/theme'

interface Profile {
    id: string
    first_name: string | null
    last_name: string | null
    email: string | null
    bio: string | null
    phone: string | null
    avatar_url: string | null
}

interface ProfilePopupProps {
    onClose: () => void
}

export default function ProfilePopup({ onClose }: ProfilePopupProps) {
    const overlayRef = useRef<HTMLDivElement>(null)
    const { theme } = useTheme()
    const c = theme === 'dark' ? darkColors : lightColors

    const [profile, setProfile] = useState<Profile | null>(null)
    const [editing, setEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    // Draft state for editing
    const [draft, setDraft] = useState({ first_name: '', last_name: '', bio: '', phone: '' })

    useEffect(() => {
        fetch('/api/profile')
            .then((r) => r.json())
            .then((data) => {
                setProfile(data)
                setDraft({
                    first_name: data.first_name ?? '',
                    last_name: data.last_name ?? '',
                    bio: data.bio ?? '',
                    phone: data.phone ?? '',
                })
            })
            .catch(() => setError('Could not load profile.'))
            .finally(() => setLoading(false))
    }, [])

    const handleSave = async () => {
        setSaving(true)
        setError(null)
        try {
            const res = await fetch('/api/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(draft),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? 'Update failed')
            setProfile((p) => ({ ...p!, ...data }))
            setEditing(false)
            setSuccess(true)
            setTimeout(() => setSuccess(false), 2500)
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Update failed')
        } finally {
            setSaving(false)
        }
    }

    const displayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || profile?.email?.split('@')[0] || 'User'
    const initials = displayName.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)

    return (
        <>
            {/* Click-outside overlay */}
            <div
                ref={overlayRef}
                onClick={onClose}
                style={{
                    position: 'fixed', inset: 0, zIndex: 98,
                }}
            />

            <motion.div
                initial={{ opacity: 0, y: 16, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                className="profile-popup-card"
                style={{
                    position: 'fixed',
                    bottom: 88,
                    left: 16,
                    width: 320,
                    background: c.surface,
                    border: `1px solid ${c.border}`,
                    borderRadius: 18,
                    boxShadow: theme === 'dark'
                        ? '0 24px 64px rgba(0,0,0,0.7)'
                        : '0 24px 64px rgba(0,0,0,0.15)',
                    zIndex: 99,
                    overflow: 'hidden',
                }}
            >
                <style>{`
                    @media (max-width: 400px) {
                        .profile-popup-card { width: calc(100% - 32px) !important; left: 16px !important; }
                    }
                `}</style>
                {/* Header */}
                <div style={{
                    padding: '18px 18px 0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: c.textPrimary }}>
                        User Profile
                    </span>
                    <div style={{ display: 'flex', gap: 6 }}>
                        {!editing && (
                            <button
                                onClick={() => setEditing(true)}
                                title="Edit profile"
                                style={{
                                    width: 30, height: 30, borderRadius: 8,
                                    background: c.surfaceMuted,
                                    border: `1px solid ${c.border}`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', color: c.textSecondary,
                                    transition: 'background 0.15s',
                                }}
                            >
                                <Pencil size={13} />
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            style={{
                                width: 30, height: 30, borderRadius: 8,
                                background: c.surfaceMuted,
                                border: `1px solid ${c.border}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', color: c.textSecondary,
                            }}
                        >
                            <X size={13} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div style={{ padding: '16px 18px 20px' }}>
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
                            <Loader2 size={24} color={c.textMuted} style={{ animation: 'spin 0.8s linear infinite' }} />
                        </div>
                    ) : (
                        <>
                            {/* Avatar + name */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
                                <div style={{
                                    width: 56, height: 56, borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #7c3aed, #2563eb)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0, overflow: 'hidden',
                                    border: `2px solid ${c.border}`,
                                }}>
                                    <Image 
                                        src={profile?.avatar_url || "/image.png"} 
                                        alt={displayName} 
                                        width={56} 
                                        height={56} 
                                        style={{ objectFit: 'cover' }} 
                                    />
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <p style={{ fontWeight: 700, fontSize: '1rem', color: c.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {displayName}
                                    </p>
                                    <p style={{ fontSize: '0.75rem', color: c.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {profile?.email}
                                    </p>
                                </div>
                            </div>

                            {/* Fields */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                                {/* First Name + Last Name */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                    <Field label="First Name" icon={<User size={12} />} c={c}>
                                        {editing
                                            ? <input value={draft.first_name} onChange={(e) => setDraft((d) => ({ ...d, first_name: e.target.value }))} style={inputStyle(c)} placeholder="First" />
                                            : <span style={valueStyle(c)}>{profile?.first_name || '—'}</span>
                                        }
                                    </Field>
                                    <Field label="Last Name" icon={<User size={12} />} c={c}>
                                        {editing
                                            ? <input value={draft.last_name} onChange={(e) => setDraft((d) => ({ ...d, last_name: e.target.value }))} style={inputStyle(c)} placeholder="Last" />
                                            : <span style={valueStyle(c)}>{profile?.last_name || '—'}</span>
                                        }
                                    </Field>
                                </div>

                                {/* Email — read only */}
                                <Field label="Email" icon={<Mail size={12} />} c={c}>
                                    <span style={valueStyle(c)}>{profile?.email || '—'}</span>
                                </Field>

                                {/* Phone */}
                                <Field label="Phone" icon={<Phone size={12} />} c={c}>
                                    {editing
                                        ? <input value={draft.phone} onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))} style={inputStyle(c)} placeholder="+91 ..." />
                                        : <span style={valueStyle(c)}>{profile?.phone || '—'}</span>
                                    }
                                </Field>

                                {/* Bio */}
                                <Field label="Bio" icon={<FileText size={12} />} c={c}>
                                    {editing
                                        ? <textarea value={draft.bio} onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))} style={{ ...inputStyle(c), resize: 'none', minHeight: 64 }} placeholder="Tell us about yourself…" />
                                        : <span style={{ ...valueStyle(c), whiteSpace: 'pre-wrap' }}>{profile?.bio || '—'}</span>
                                    }
                                </Field>
                            </div>

                            {/* Error */}
                            <AnimatePresence>
                                {error && (
                                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                        style={{ marginTop: 10, fontSize: '0.78rem', color: '#ef4444', fontWeight: 500 }}
                                    >{error}</motion.p>
                                )}
                            </AnimatePresence>

                            {/* Success */}
                            <AnimatePresence>
                                {success && (
                                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                        style={{ marginTop: 10, fontSize: '0.78rem', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
                                    ><Check size={13} /> Profile updated!</motion.p>
                                )}
                            </AnimatePresence>

                            {/* Edit actions */}
                            {editing && (
                                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                                    <button
                                        onClick={() => { setEditing(false); setError(null) }}
                                        style={{
                                            flex: 1, padding: '10px', borderRadius: 10,
                                            background: c.surfaceMuted, border: `1px solid ${c.border}`,
                                            color: c.textSecondary, fontWeight: 600,
                                            fontSize: '0.8125rem', cursor: 'pointer',
                                        }}
                                    >Cancel</button>
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        style={{
                                            flex: 1, padding: '10px', borderRadius: 10,
                                            background: c.brand, border: 'none',
                                            color: c.brandFg, fontWeight: 700,
                                            fontSize: '0.8125rem', cursor: saving ? 'not-allowed' : 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                            opacity: saving ? 0.7 : 1,
                                        }}
                                    >
                                        {saving ? <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> : <Check size={14} />}
                                        {saving ? 'Saving…' : 'Save'}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </motion.div>
        </>
    )
}

// ─── Helpers ─────────────────────────────────

type Colors = typeof lightColors

function Field({ label, icon, children, c }: { label: string; icon: React.ReactNode; children: React.ReactNode; c: Colors }) {
    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                <span style={{ color: c.textMuted }}>{icon}</span>
                <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: c.textMuted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
            </div>
            {children}
        </div>
    )
}

function inputStyle(c: Colors): React.CSSProperties {
    return {
        width: '100%', padding: '7px 10px',
        background: c.surfaceMuted,
        border: `1px solid ${c.border}`,
        borderRadius: 8, fontSize: '0.8125rem',
        color: c.textPrimary, outline: 'none',
        fontFamily: 'inherit',
        boxSizing: 'border-box',
    }
}

function valueStyle(c: Colors): React.CSSProperties {
    return {
        display: 'block',
        fontSize: '0.8125rem',
        color: c.textPrimary,
        fontWeight: 500,
        padding: '2px 0',
    }
}
