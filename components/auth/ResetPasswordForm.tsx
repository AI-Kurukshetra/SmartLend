'use client'

import { useState, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { Eye, EyeOff, ShieldCheck, KeyRound, ArrowRight, AlertTriangle } from 'lucide-react'
import { updatePassword } from '@/app/actions/auth'
import ProductIcon from '@/components/common/ProductIcon'

export default function ResetPasswordForm() {
    const searchParams = useSearchParams()
    const isExpired = searchParams.get('error') === 'expired'

    const [showPassword, setShowPassword] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setError(null)
        const formData = new FormData(e.currentTarget)
        const pwd     = formData.get('password') as string
        const confirm = formData.get('confirm_password') as string

        if (pwd.length < 6)    { setError('Password must be at least 6 characters.'); return }
        if (pwd !== confirm)    { setError('Passwords do not match.'); return }

        startTransition(async () => {
            const result = await updatePassword(formData)
            if (result?.error) setError(result.error)
        })
    }

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            minHeight: '100vh',
            background: '#fff',
        }}>

            {/* ─── LEFT HERO ─── */}
            <div style={{ position: 'relative', overflow: 'hidden' }}>
                <Image
                    src="/hero-bg2.jpg"
                    alt="SmartLend hero"
                    fill priority
                    style={{ objectFit: 'cover', objectPosition: 'center' }}
                    sizes="50vw"
                />
                <div style={{
                    position: 'absolute', top: 28, left: 28, zIndex: 10,
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(14px)',
                    WebkitBackdropFilter: 'blur(14px)',
                    border: '1px solid rgba(255,255,255,0.22)',
                    borderRadius: 999, padding: '7px 18px 7px 7px',
                }}>
                    <ProductIcon size={34} />
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.9375rem', letterSpacing: '-0.01em' }}>
                        SmartLend
                    </span>
                </div>
                <div style={{ position: 'absolute', bottom: 44, left: 36, right: 36, zIndex: 10 }}>
                    <h1 style={{
                        color: '#fff', fontSize: 'clamp(1.875rem, 3.5vw, 2.625rem)',
                        fontWeight: 800, lineHeight: 1.15, marginBottom: 10,
                        textShadow: '0 2px 16px rgba(0,0,0,0.4)', letterSpacing: '-0.02em',
                    }}>
                        {isExpired ? 'Reset link\nexpired' : 'Set a new\nSmartLend password'}
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.78)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                        {isExpired
                            ? 'Reset links are single-use and expire after 1 hour.'
                            : 'Create a secure password to protect your SmartLend workspace.'}
                    </p>
                </div>
            </div>

            {/* ─── RIGHT PANEL ─── */}
            <div style={{ display: 'flex', flexDirection: 'column', background: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '24px 28px 0' }}>
                    <Link href="/login" style={{
                        display: 'flex', alignItems: 'center', gap: 7,
                        background: '#f8fafc', color: '#0f172a',
                        border: '1px solid #e2e8f0', borderRadius: 999,
                        padding: '10px 22px', fontWeight: 600,
                        fontSize: '0.875rem', textDecoration: 'none',
                    }}>
                        Back to Sign In
                    </Link>
                </div>

                <div style={{
                    flex: 1, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    padding: '24px 56px 48px',
                }}>
                    <div style={{ width: '100%', maxWidth: 400 }}>
                        <AnimatePresence mode="wait">

                            {/* ── Expired / invalid ── */}
                            {isExpired ? (
                                <motion.div
                                    key="expired"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    style={{ textAlign: 'center' }}
                                >
                                    <div style={{
                                        width: 72, height: 72, borderRadius: '50%',
                                        background: '#fff7ed',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        margin: '0 auto 24px',
                                        boxShadow: '0 8px 24px rgba(234,88,12,0.15)',
                                    }}>
                                        <AlertTriangle size={32} color="#ea580c" strokeWidth={1.75} />
                                    </div>
                                    <h2 style={{
                                        fontSize: '1.625rem', fontWeight: 800,
                                        color: '#0f172a', letterSpacing: '-0.025em', marginBottom: 10,
                                    }}>
                                        Reset link expired or invalid
                                    </h2>
                                    <p style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: 1.65, marginBottom: 28 }}>
                                        This SmartLend password reset link has already been used or has expired. Request a new one below.
                                    </p>
                                    <Link href="/forgot-password" style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 8,
                                        background: '#0f172a', color: '#fff',
                                        borderRadius: 12, padding: '14px 28px',
                                        fontWeight: 700, fontSize: '0.9375rem',
                                        textDecoration: 'none',
                                    }}>
                                        <ArrowRight size={17} />
                                        Request new link
                                    </Link>
                                </motion.div>
                            ) : (
                            /* ── Password form ── */
                                <motion.div
                                    key="form"
                                    initial={{ opacity: 0, y: 16 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.35 }}
                                >
                                    <div style={{
                                        width: 52, height: 52, borderRadius: 14,
                                        background: '#f0fdf4',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        marginBottom: 20,
                                    }}>
                                        <KeyRound size={24} color="#16a34a" strokeWidth={1.75} />
                                    </div>

                                    <h2 style={{
                                        fontSize: 'clamp(1.5rem, 2.5vw, 1.875rem)',
                                        fontWeight: 800, color: '#0f172a',
                                        letterSpacing: '-0.025em', lineHeight: 1.2, marginBottom: 6,
                                    }}>
                                        Create new password
                                    </h2>
                                    <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: 28 }}>
                                        Your new SmartLend password must be at least 6 characters.
                                    </p>

                                    <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                                        {/* New Password */}
                                        <div>
                                            <label style={labelStyle}>New Password</label>
                                            <div style={{ position: 'relative' }}>
                                                <input
                                                    name="password"
                                                    type={showPassword ? 'text' : 'password'}
                                                    placeholder="Create a secure password"
                                                    autoComplete="new-password"
                                                    style={inputStyle}
                                                    required
                                                />
                                                <button type="button" onClick={() => setShowPassword(!showPassword)} style={eyeBtnStyle}>
                                                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Confirm Password */}
                                        <div>
                                            <label style={labelStyle}>Confirm Password</label>
                                            <div style={{ position: 'relative' }}>
                                                <input
                                                    name="confirm_password"
                                                    type={showConfirm ? 'text' : 'password'}
                                                    placeholder="Repeat your new password"
                                                    autoComplete="new-password"
                                                    style={inputStyle}
                                                    required
                                                />
                                                <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={eyeBtnStyle}>
                                                    {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Error */}
                                        <AnimatePresence>
                                            {error && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -6 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0 }}
                                                    role="alert"
                                                    style={{
                                                        padding: '10px 14px',
                                                        background: '#fef2f2', border: '1px solid #fecaca',
                                                        borderRadius: 10, fontSize: '0.8125rem',
                                                        color: '#dc2626', fontWeight: 500,
                                                    }}
                                                >
                                                    {error}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* Submit */}
                                        <button
                                            type="submit"
                                            disabled={isPending}
                                            style={{
                                                width: '100%', padding: '15px',
                                                background: isPending ? '#334155' : '#0f172a',
                                                color: '#fff', border: 'none', borderRadius: 12,
                                                fontWeight: 700, fontSize: '1rem',
                                                cursor: isPending ? 'not-allowed' : 'pointer',
                                                letterSpacing: '0.01em', transition: 'background 0.2s',
                                                display: 'flex', alignItems: 'center',
                                                justifyContent: 'center', gap: 8,
                                            }}
                                        >
                                            {isPending ? (
                                                <>
                                                    <span style={{
                                                        width: 16, height: 16,
                                                        border: '2px solid rgba(255,255,255,0.35)',
                                                        borderTop: '2px solid #fff',
                                                        borderRadius: '50%', display: 'inline-block',
                                                        animation: 'spin 0.7s linear infinite',
                                                    }} />
                                                    Updating…
                                                </>
                                            ) : (
                                                <><ShieldCheck size={17} /> Update Password</>
                                            )}
                                        </button>
                                    </form>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    )
}

const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '0.8125rem', fontWeight: 500,
    color: '#64748b', marginBottom: 7, letterSpacing: '0.01em',
}

const inputStyle: React.CSSProperties = {
    width: '100%', padding: '13px 16px', paddingRight: 44,
    border: '1.5px solid #e2e8f0', borderRadius: 10,
    fontSize: '0.9375rem', color: '#0f172a', background: '#fff',
    outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s',
    fontFamily: 'inherit',
}

const eyeBtnStyle: React.CSSProperties = {
    position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', cursor: 'pointer',
    color: '#94a3b8', display: 'flex', alignItems: 'center', padding: 0,
}
