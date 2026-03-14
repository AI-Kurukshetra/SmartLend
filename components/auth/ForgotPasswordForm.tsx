'use client'

import { useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Mail, CheckCircle2 } from 'lucide-react'
import { resetPassword } from '@/app/actions/auth'
import ProductIcon from '@/components/common/ProductIcon'

export default function ForgotPasswordForm() {
    const [error, setError] = useState<string | null>(null)
    const [sent, setSent] = useState(false)
    const [isPending, startTransition] = useTransition()

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setError(null)
        const formData = new FormData(e.currentTarget)
        startTransition(async () => {
            const result = await resetPassword(formData)
            if (result?.error) {
                setError(result.error)
            } else {
                setSent(true)
            }
        })
    }

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            minHeight: '100vh',
            background: '#fff',
        }}>

            {/* ─── LEFT HERO PANEL ─── */}
            <div style={{ position: 'relative', overflow: 'hidden' }}>
                <Image
                    src="/hero-bg2.jpg"
                    alt="SmartLend hero"
                    fill
                    priority
                    style={{ objectFit: 'cover', objectPosition: 'center' }}
                    sizes="50vw"
                />
                {/* Logo pill */}
                <div style={{
                    position: 'absolute',
                    top: 28,
                    left: 28,
                    zIndex: 10,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    background: 'rgba(255,255,255,0.14)',
                    backdropFilter: 'blur(14px)',
                    WebkitBackdropFilter: 'blur(14px)',
                    border: '1px solid rgba(255,255,255,0.22)',
                    borderRadius: 999,
                    padding: '7px 18px 7px 7px',
                }}>
                    <ProductIcon size={34} />
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.9375rem', letterSpacing: '-0.01em' }}>
                        SmartLend
                    </span>
                </div>

                {/* Bottom text */}
                <div style={{
                    position: 'absolute',
                    bottom: 44,
                    left: 36,
                    right: 36,
                    zIndex: 10,
                }}>
                    <h1 style={{
                        color: '#fff',
                        fontSize: 'clamp(1.875rem, 3.5vw, 2.625rem)',
                        fontWeight: 800,
                        lineHeight: 1.15,
                        marginBottom: 10,
                        textShadow: '0 2px 16px rgba(0,0,0,0.4)',
                        letterSpacing: '-0.02em',
                    }}>
                        Reset your<br />SmartLend password
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.78)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                        We&apos;ll send reset instructions so you can get back to your loan management workspace.
                    </p>
                </div>
            </div>

            {/* ─── RIGHT PANEL ─── */}
            <div style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                background: '#fff',
            }}>
                {/* Back to Sign In — top-right */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '24px 28px 0' }}>
                    <Link
                        href="/login"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 7,
                            background: '#f8fafc',
                            color: '#0f172a',
                            border: '1px solid #e2e8f0',
                            borderRadius: 999,
                            padding: '10px 22px',
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                            textDecoration: 'none',
                            letterSpacing: '0.01em',
                        }}
                    >
                        <ArrowLeft size={15} />
                        Back to Sign In
                    </Link>
                </div>

                {/* Form centered */}
                <motion.div
                    initial={{ opacity: 0, x: 32 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.55, ease: 'easeOut' }}
                    style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '24px 56px 48px',
                    }}
                >
                    <div style={{ width: '100%', maxWidth: 400 }}>
                        <AnimatePresence mode="wait">
                            {!sent ? (
                                <motion.div
                                    key="form"
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -12 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <div style={{
                                        width: 52, height: 52,
                                        background: '#f0f7ff',
                                        borderRadius: 14,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        marginBottom: 20,
                                    }}>
                                        <Mail size={24} color="#0284c7" strokeWidth={1.75} />
                                    </div>

                                    <h2 style={{
                                        fontSize: 'clamp(1.5rem, 2.5vw, 1.875rem)',
                                        fontWeight: 800,
                                        color: '#0f172a',
                                        letterSpacing: '-0.025em',
                                        lineHeight: 1.2,
                                        marginBottom: 6,
                                    }}>
                                        Reset your password
                                    </h2>
                                    <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: 28 }}>
                                        Enter your work email and we&apos;ll send you a secure link to restore SmartLend access.
                                    </p>

                                    <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                                        <div>
                                            <label style={labelStyle}>Work Email</label>
                                            <input
                                                name="email"
                                                type="email"
                                                placeholder="you@example.com"
                                                autoComplete="email"
                                                style={inputStyle}
                                                required
                                            />
                                        </div>

                                        <AnimatePresence>
                                            {error && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -6 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0 }}
                                                    role="alert"
                                                    style={{
                                                        padding: '10px 14px',
                                                        background: '#fef2f2',
                                                        border: '1px solid #fecaca',
                                                        borderRadius: 10,
                                                        fontSize: '0.8125rem',
                                                        color: '#dc2626',
                                                        fontWeight: 500,
                                                    }}
                                                >
                                                    {error}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        <button
                                            type="submit"
                                            disabled={isPending}
                                            style={{
                                                width: '100%',
                                                padding: '15px',
                                                background: isPending ? '#334155' : '#0f172a',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: 12,
                                                fontWeight: 700,
                                                fontSize: '1rem',
                                                cursor: isPending ? 'not-allowed' : 'pointer',
                                                letterSpacing: '0.01em',
                                                transition: 'background 0.2s',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: 8,
                                            }}
                                        >
                                            {isPending ? (
                                                <>
                                                    <span style={{
                                                        width: 16, height: 16,
                                                        border: '2px solid rgba(255,255,255,0.35)',
                                                        borderTop: '2px solid #fff',
                                                        borderRadius: '50%',
                                                        display: 'inline-block',
                                                        animation: 'spin 0.7s linear infinite',
                                                    }} />
                                                    Sending reset link...
                                                </>
                                            ) : 'Send SmartLend reset link'}
                                        </button>
                                    </form>

                                    <p style={{ textAlign: 'center', marginTop: 24, fontSize: '0.8125rem', color: '#94a3b8' }}>
                                        Remember your password?{' '}
                                        <Link href="/login" style={{ color: '#0f172a', fontWeight: 700, textDecoration: 'none' }}>
                                            Sign in
                                        </Link>
                                    </p>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="success"
                                    initial={{ opacity: 0, scale: 0.96 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.35 }}
                                    style={{ textAlign: 'center' }}
                                >
                                    <div style={{
                                        width: 64, height: 64,
                                        background: '#f0fdf4',
                                        borderRadius: 18,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        margin: '0 auto 24px',
                                    }}>
                                        <CheckCircle2 size={32} color="#16a34a" strokeWidth={1.75} />
                                    </div>
                                    <h2 style={{
                                        fontSize: '1.75rem',
                                        fontWeight: 800,
                                        color: '#0f172a',
                                        letterSpacing: '-0.025em',
                                        marginBottom: 10,
                                    }}>
                                        Check your inbox
                                    </h2>
                                    <p style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: 1.65, marginBottom: 32 }}>
                                        We&apos;ve sent a SmartLend password reset link to your email. The link will expire in 1 hour.
                                    </p>
                                    <Link
                                        href="/login"
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 7,
                                            background: '#0f172a',
                                            color: '#fff',
                                            borderRadius: 12,
                                            padding: '13px 28px',
                                            fontWeight: 700,
                                            fontSize: '0.9375rem',
                                            textDecoration: 'none',
                                        }}
                                    >
                                        Back to Sign In
                                    </Link>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            </div>

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                input[type="email"]:focus {
                    outline: none;
                    border-color: #0f172a !important;
                    box-shadow: 0 0 0 3px rgba(15,23,42,0.08) !important;
                }
            `}</style>
        </div>
    )
}

const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: '#64748b',
    marginBottom: 7,
    letterSpacing: '0.01em',
}

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '13px 16px',
    border: '1.5px solid #e2e8f0',
    borderRadius: 10,
    fontSize: '0.9375rem',
    color: '#0f172a',
    background: '#fff',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    fontFamily: 'inherit',
}
