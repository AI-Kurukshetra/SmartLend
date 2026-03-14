'use client'

import { useState, useTransition, useEffect } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { Eye, EyeOff, Mail, CheckCircle2, ArrowRight, Wand2, ShieldCheck } from 'lucide-react'
import { login, signup } from '@/app/actions/auth'
import ProductIcon from '@/components/common/ProductIcon'

type Mode = 'login' | 'signup' | 'email-confirm' | 'already-registered'

const heroSlides = [
  {
    heading: 'Modernize loan\norigination',
    sub: 'Capture borrower details, documents, and verification from one SmartLend workflow.',
  },
  {
    heading: 'Manage lending\noperations',
    sub: 'Review underwriting, servicing activity, and borrower tasks from one loan management platform.',
  },
  {
    heading: 'Service every loan\nwith confidence',
    sub: 'Track payments, delinquencies, collections activity, and borrower updates with audit-ready visibility.',
  },
]

const textVariants: Variants = {
  enter: { opacity: 0, y: 24 },
  center: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' as const } },
  exit: { opacity: 0, y: -16, transition: { duration: 0.35 } },
}

// ──────────────────────────────────────────────
// Password utilities
// ──────────────────────────────────────────────
const PWD_CHECKS = [
  { id: 'len',    label: 'At least 8 characters',        test: (p: string) => p.length >= 8 },
  { id: 'upper',  label: 'One uppercase letter (A–Z)',    test: (p: string) => /[A-Z]/.test(p) },
  { id: 'lower',  label: 'One lowercase letter (a–z)',    test: (p: string) => /[a-z]/.test(p) },
  { id: 'num',    label: 'One number (0–9)',              test: (p: string) => /[0-9]/.test(p) },
  { id: 'sym',    label: 'One special character (!@#…)',  test: (p: string) => /[^A-Za-z0-9]/.test(p) },
]

type StrengthLevel = 'weak' | 'fair' | 'good' | 'strong'
interface PasswordStrength {
  score: number        // 0-5
  level: StrengthLevel
  label: string
  color: string
}

function analysePassword(pwd: string): PasswordStrength {
  const score = PWD_CHECKS.filter(c => c.test(pwd)).length
  if (score <= 1) return { score, level: 'weak',   label: 'Weak',   color: '#ef4444' }
  if (score === 2) return { score, level: 'fair',   label: 'Fair',   color: '#f97316' }
  if (score === 3) return { score, level: 'good',   label: 'Good',   color: '#eab308' }
  if (score === 4) return { score, level: 'good',   label: 'Good',   color: '#22c55e' }
  return                   { score, level: 'strong', label: 'Strong', color: '#16a34a' }
}

function generateStrongPassword(): string {
  const upper  = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower  = 'abcdefghjkmnpqrstuvwxyz'
  const nums   = '23456789'
  const syms   = '!@#$%^&*'
  const all    = upper + lower + nums + syms
  const rand   = (s: string) => s[Math.floor(Math.random() * s.length)]
  // Guarantee at least one of each category
  const core   = [rand(upper), rand(lower), rand(nums), rand(syms)]
  const rest   = Array.from({ length: 8 }, () => rand(all))
  return [...core, ...rest].sort(() => Math.random() - 0.5).join('')
}

// ──────────────────────────────────────────────
// Email format validator
// ──────────────────────────────────────────────
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())
}

// Detect the webmail URL for the "Open Email" shortcut
function getEmailProviderUrl(email: string): string {
  const domain = email.split('@')[1]?.toLowerCase() ?? ''
  if (domain.includes('gmail')) return 'https://mail.google.com'
  if (domain.includes('yahoo')) return 'https://mail.yahoo.com'
  if (domain.includes('outlook') || domain.includes('hotmail') || domain.includes('live'))
    return 'https://outlook.live.com'
  if (domain.includes('icloud') || domain.includes('me.com') || domain.includes('mac.com'))
    return 'https://www.icloud.com/mail'
  if (domain.includes('proton')) return 'https://mail.proton.me'
  return `https://${domain}`
}

// ──────────────────────────────────────────────
// Extracted Hero Panel (reused in confirm screen)
// ──────────────────────────────────────────────
function HeroPanel({ slide, setSlide }: { slide: number; setSlide: (i: number) => void }) {
  return (
    <div className="auth-hero-panel" style={{ position: 'relative', overflow: 'hidden' }}>
      <Image
        src="/hero-bg2.jpg"
        alt="SmartLend hero"
        fill
        priority
        style={{ objectFit: 'cover', objectPosition: 'center' }}
        sizes="50vw"
      />
      <div style={{ position: 'absolute', inset: 0, background: '', zIndex: 1 }} />

      {/* Logo pill */}
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

      {/* Bottom hero text + dots */}
      <div style={{ position: 'absolute', bottom: 44, left: 36, right: 36, zIndex: 10 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={slide}
            variants={textVariants}
            initial="enter"
            animate="center"
            exit="exit"
            style={{ marginBottom: 24 }}
          >
            <h1 style={{
              color: '#fff',
              fontSize: 'clamp(1.875rem, 3.5vw, 2.625rem)',
              fontWeight: 800,
              lineHeight: 1.15,
              marginBottom: 10,
              textShadow: '0 2px 16px rgba(0,0,0,0.4)',
              letterSpacing: '-0.02em',
              whiteSpace: 'pre-line',
            }}>
              {heroSlides[slide].heading}
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.78)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              {heroSlides[slide].sub}
            </p>
          </motion.div>
        </AnimatePresence>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {heroSlides.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              aria-label={`Slide ${i + 1}`}
              style={{
                height: 7,
                width: i === slide ? 42 : 10,
                borderRadius: 999,
                background: i === slide ? '#fff' : 'rgba(255,255,255,0.38)',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                transition: 'width 0.35s ease, background 0.35s ease',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────
// Shared styles
// ──────────────────────────────────────────────
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

import { useSearchParams } from 'next/navigation'

export default function LoginForm({ initialMode = 'login' }: { initialMode?: Mode }) {
  const searchParams = useSearchParams()
  const modeParam = searchParams.get('mode') as Mode
  const inviteParam = searchParams.get('invite') ?? ''
  
  const [mode, setMode] = useState<Mode>(modeParam || initialMode)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [slide, setSlide] = useState(0)
  const [isPending, startTransition] = useTransition()
  const [confirmedEmail, setConfirmedEmail] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordValue, setPasswordValue] = useState('')
  const [showSuggestion, setShowSuggestion] = useState(false)

  // Auto-advance carousel
  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % heroSlides.length), 4000)
    return () => clearInterval(t)
  }, [])

  const handleEmailBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const val = e.currentTarget.value
    if (val && !isValidEmail(val)) {
      setEmailError('Please enter a valid email address.')
    } else {
      setEmailError(null)
    }
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (emailError && isValidEmail(e.currentTarget.value)) {
      setEmailError(null)
    }
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)
    const email = (formData.get('email') as string) ?? ''
    if (inviteParam) formData.set('invite', inviteParam)

    // Client-side email validation gate
    if (!isValidEmail(email)) {
      setEmailError('Please enter a valid email address.')
      return
    }

    startTransition(async () => {
      if (mode === 'login') {
        const result = await login(formData)
        if (result?.error) setError(result.error)
      } else {
        const result = await signup(formData)
        if (result?.error) {
          setError(result.error)
        } else if (result && 'alreadyRegistered' in result && result.alreadyRegistered) {
          // Email is already taken — show the dedicated screen
          setConfirmedEmail(email)
          setMode('already-registered')
        } else {
          // New account — show email confirmation screen
          setConfirmedEmail(email)
          setMode('email-confirm')
        }
      }
    })
  }

  // ──────────────────────────────────────────────
  // ALREADY REGISTERED SCREEN
  // ──────────────────────────────────────────────
  if (mode === 'already-registered') {
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        minHeight: '100vh',
        background: '#fff',
      }}>
        <HeroPanel slide={slide} setSlide={setSlide} />

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 56px',
          background: '#fff',
        }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}
          >
            {/* Icon badge — amber */}
            <div style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #fef9c3 0%, #fde68a 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 28px',
              boxShadow: '0 8px 32px rgba(234,179,8,0.18)',
              fontSize: 36,
            }}>
              👤
            </div>

            <h2 style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              color: '#0f172a',
              letterSpacing: '-0.025em',
              marginBottom: 10,
            }}>
              Already registered
            </h2>
            <p style={{ fontSize: '0.9375rem', color: '#64748b', lineHeight: 1.65, marginBottom: 8 }}>
              An account already exists for
            </p>
            <p style={{
              fontSize: '0.9375rem',
              fontWeight: 700,
              color: '#0f172a',
              marginBottom: 28,
              wordBreak: 'break-all',
            }}>
              {confirmedEmail}
            </p>

            <p style={{ fontSize: '0.84rem', color: '#94a3b8', marginBottom: 32, lineHeight: 1.6 }}>
              If this is your SmartLend access, sign in with your password. If not, you can reset it below.
            </p>

            {/* Sign In CTA */}
            <button
              type="button"
              id="goto-signin-btn"
              onClick={() => {
                setMode('login')
                setError(null)
                setPasswordValue('')
                setShowSuggestion(false)
                setConfirmedEmail('')
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                width: '100%',
                padding: '15px',
                background: '#0f172a',
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                fontWeight: 700,
                fontSize: '1rem',
                cursor: 'pointer',
                letterSpacing: '0.01em',
                marginBottom: 12,
                transition: 'background 0.2s, transform 0.15s',
                boxSizing: 'border-box',
              }}
              onMouseOver={(e) => {
                ;(e.currentTarget as HTMLElement).style.background = '#1e293b'
                ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'
              }}
              onMouseOut={(e) => {
                ;(e.currentTarget as HTMLElement).style.background = '#0f172a'
                ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
              }}
            >
              <ArrowRight size={17} />
              Sign in to SmartLend
            </button>

            {/* Forgot password link */}
            <Link
              href="/forgot-password"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                width: '100%',
                padding: '13px',
                background: 'none',
                border: '1.5px solid #e2e8f0',
                borderRadius: 12,
                fontWeight: 600,
                fontSize: '0.9rem',
                color: '#64748b',
                textDecoration: 'none',
                transition: 'border-color 0.2s, color 0.2s',
                boxSizing: 'border-box',
              }}
              onMouseOver={(e) => {
                ;(e.currentTarget as HTMLElement).style.borderColor = '#0f172a'
                ;(e.currentTarget as HTMLElement).style.color = '#0f172a'
              }}
              onMouseOut={(e) => {
                ;(e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0'
                ;(e.currentTarget as HTMLElement).style.color = '#64748b'
              }}
            >
              Forgot your password?
            </Link>

            {/* Back to signup */}
            <p style={{ marginTop: 20, fontSize: '0.8125rem', color: '#94a3b8' }}>
              Not you?{' '}
              <button
                type="button"
                onClick={() => { setMode('signup'); setError(null); setConfirmedEmail(''); setPasswordValue(''); setShowSuggestion(false) }}
                style={{ background: 'none', border: 'none', color: '#0f172a', fontWeight: 700, fontSize: '0.8125rem', cursor: 'pointer', padding: 0 }}
              >
                Use a different email
              </button>
            </p>
          </motion.div>
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // ──────────────────────────────────────────────
  // EMAIL CONFIRMATION SCREEN
  // ──────────────────────────────────────────────
  if (mode === 'email-confirm') {
    const providerUrl = getEmailProviderUrl(confirmedEmail)

    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        minHeight: '100vh',
        background: '#fff',
      }}>
        <HeroPanel slide={slide} setSlide={setSlide} />

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 56px',
          background: '#fff',
        }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}
          >
            {/* Icon badge */}
            <div style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 28px',
              boxShadow: '0 8px 32px rgba(14,165,233,0.18)',
            }}>
              <Mail size={36} color="#0ea5e9" strokeWidth={1.75} />
            </div>

            <h2 style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              color: '#0f172a',
              letterSpacing: '-0.025em',
              marginBottom: 10,
            }}>
              Confirm your SmartLend email
            </h2>
            <p style={{ fontSize: '0.9375rem', color: '#64748b', lineHeight: 1.65, marginBottom: 8 }}>
              We&apos;ve sent a confirmation link to
            </p>
            <p style={{
              fontSize: '0.9375rem',
              fontWeight: 700,
              color: '#0f172a',
              marginBottom: 28,
              wordBreak: 'break-all',
            }}>
              {confirmedEmail}
            </p>

            <p style={{ fontSize: '0.84rem', color: '#94a3b8', marginBottom: 32, lineHeight: 1.6 }}>
              Click the link in the email to activate your SmartLend account. Check your spam folder if you don&apos;t see it.
            </p>

            {/* "Open email" CTA */}
            <a
              href={providerUrl}
              target="_blank"
              rel="noopener noreferrer"
              id="open-email-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                width: '100%',
                padding: '15px',
                background: '#0f172a',
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                fontWeight: 700,
                fontSize: '1rem',
                cursor: 'pointer',
                letterSpacing: '0.01em',
                textDecoration: 'none',
                marginBottom: 16,
                transition: 'background 0.2s, transform 0.15s',
                boxSizing: 'border-box',
              }}
              onMouseOver={(e) => {
                ;(e.currentTarget as HTMLElement).style.background = '#1e293b'
                ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'
              }}
              onMouseOut={(e) => {
                ;(e.currentTarget as HTMLElement).style.background = '#0f172a'
                ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
              }}
            >
              <Mail size={18} />
              Open email app
              <ArrowRight size={16} />
            </a>

            {/* Back to login */}
            <button
              type="button"
              id="back-to-login-btn"
              onClick={() => { setMode('login'); setError(null); setConfirmedEmail('') }}
              style={{
                background: 'none',
                border: '1.5px solid #e2e8f0',
                borderRadius: 12,
                width: '100%',
                padding: '13px',
                color: '#64748b',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'border-color 0.2s, color 0.2s',
              }}
              onMouseOver={(e) => {
                ;(e.currentTarget as HTMLElement).style.borderColor = '#0f172a'
                ;(e.currentTarget as HTMLElement).style.color = '#0f172a'
              }}
              onMouseOut={(e) => {
                ;(e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0'
                ;(e.currentTarget as HTMLElement).style.color = '#64748b'
              }}
            >
              Back to Sign In
            </button>

            {/* Checkmark note */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              justifyContent: 'center',
              marginTop: 28,
            }}>
              <CheckCircle2 size={15} color="#22c55e" />
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                SmartLend account created successfully
              </span>
            </div>
          </motion.div>
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // ──────────────────────────────────────────────
  // MAIN LOGIN / SIGNUP FORM
  // ──────────────────────────────────────────────
  return (
    <div className="auth-container" style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      minHeight: '100vh',
      background: '#fff',
    }}>
      <style>{`
        @media (max-width: 900px) {
          .auth-container { grid-template-columns: 1fr !important; }
          .auth-hero-panel { display: none !important; }
        }
      `}</style>

      <HeroPanel slide={slide} setSlide={setSlide} />

      {/* ─────────── RIGHT FORM PANEL ─────────── */}
      <div style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        background: '#fff',
        overflow: 'hidden',
      }}>
        {/* Toggle pill — top-right */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '24px 28px 0' }}>
          <button
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); setEmailError(null); setPasswordValue(''); setShowSuggestion(false) }}
            style={{
              background: '#0f172a',
              color: '#fff',
              border: 'none',
              borderRadius: 999,
              padding: '12px 28px',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              letterSpacing: '0.01em',
              transition: 'background 0.2s',
            }}
            onMouseOver={(e) => ((e.currentTarget as HTMLElement).style.background = '#1e293b')}
            onMouseOut={(e) => ((e.currentTarget as HTMLElement).style.background = '#0f172a')}
          >
            {mode === 'login' ? 'Sign Up' : 'Sign In'}
          </button>
        </div>

        {/* Form centered vertically */}
        <motion.div
          initial={{ opacity: 0, x: 32 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' as const }}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px 56px 48px',
          }}
        >
          <div style={{ width: '100%', maxWidth: 400 }}>

            <h2 style={{
              fontSize: 'clamp(1.5rem, 2.5vw, 1.875rem)',
              fontWeight: 800,
              color: '#0f172a',
              letterSpacing: '-0.025em',
              lineHeight: 1.2,
              marginBottom: 6,
            }}>
            {mode === 'login' ? 'Welcome back to SmartLend' : 'Create your SmartLend workspace'}
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: 28 }}>
              {mode === 'login'
                ? 'Sign in to manage loan origination, servicing, and borrower operations.'
                : 'Set up your account to start managing applications, underwriting, and loan servicing.'}
            </p>

            <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

              {/* First Name + Last Name — signup only */}
              <AnimatePresence>
                {mode === 'signup' && (
                  <motion.div
                    key="name-fields"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    style={{ display: 'flex', gap: 12 }}
                  >
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>First Name</label>
                      <input
                        name="first_name"
                        type="text"
                        placeholder="Ava"
                        autoComplete="given-name"
                        style={inputStyle}
                        required
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Last Name</label>
                      <input
                        name="last_name"
                        type="text"
                        placeholder="Sharma"
                        autoComplete="family-name"
                        style={inputStyle}
                        required
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Email */}
              <div>
                <label style={labelStyle}>Work Email</label>
                <input
                  name="email"
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  style={{
                    ...inputStyle,
                    borderColor: emailError ? '#f87171' : '#e2e8f0',
                    ...(emailError ? { boxShadow: '0 0 0 3px rgba(248,113,113,0.12)' } : {}),
                  }}
                  required
                  onBlur={handleEmailBlur}
                  onChange={handleEmailChange}
                />
                <AnimatePresence>
                  {emailError && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      style={{ fontSize: '0.78rem', color: '#dc2626', marginTop: 5, fontWeight: 500, margin: '5px 0 0' }}
                    >
                      {emailError}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Password */}
              <div>
                {/* Label row with "Suggest" button */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>Password</label>
                  {mode === 'signup' && (
                    <button
                      type="button"
                      id="suggest-password-btn"
                      onClick={() => {
                        const p = generateStrongPassword()
                        setPasswordValue(p)
                        setShowPassword(true)
                        setShowSuggestion(true)
                        // Sync the hidden input value via imperative DOM so FormData picks it up
                        const input = document.getElementById('password') as HTMLInputElement | null
                        if (input) { input.value = p; input.dispatchEvent(new Event('input', { bubbles: true })) }
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        background: 'none', border: 'none',
                        color: '#6366f1', fontWeight: 600,
                        fontSize: '0.78rem', cursor: 'pointer', padding: 0,
                        letterSpacing: '0.01em',
                      }}
                    >
                      <Wand2 size={13} />
                      Suggest secure password
                    </button>
                  )}
                </div>

                <div style={{ position: 'relative' }}>
                  <input
                    name="password"
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={mode === 'signup' ? 'Create a secure password' : 'Enter your password'}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    value={passwordValue}
                    onChange={(e) => { setPasswordValue(e.target.value); setShowSuggestion(false) }}
                    style={{ ...inputStyle, paddingRight: 44 }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    style={{
                      position: 'absolute',
                      right: 14,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      padding: 0,
                    }}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>

                {/* Strength meter — signup only */}
                <AnimatePresence>
                  {mode === 'signup' && passwordValue.length > 0 && (() => {
                    const strength = analysePassword(passwordValue)
                    return (
                      <motion.div
                        key="strength"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{ marginTop: 10, overflow: 'hidden' }}
                      >
                        {/* Bar row */}
                        <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                          {[1, 2, 3, 4, 5].map(i => (
                            <div
                              key={i}
                              style={{
                                flex: 1, height: 4, borderRadius: 999,
                                background: i <= strength.score ? strength.color : '#e2e8f0',
                                transition: 'background 0.3s',
                              }}
                            />
                          ))}
                        </div>
                        {/* Label */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                          <ShieldCheck size={13} color={strength.color} />
                          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: strength.color }}>
                            {strength.label} password
                          </span>
                        </div>
                        {/* Checklist */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {PWD_CHECKS.map(c => {
                            const ok = c.test(passwordValue)
                            return (
                              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <div style={{
                                  width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
                                  background: ok ? '#22c55e' : '#e2e8f0',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  transition: 'background 0.2s',
                                }}>
                                  {ok && <span style={{ color: '#fff', fontSize: 9, fontWeight: 800, lineHeight: 1 }}>✓</span>}
                                </div>
                                <span style={{ fontSize: '0.77rem', color: ok ? '#475569' : '#94a3b8', transition: 'color 0.2s' }}>
                                  {c.label}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                        {/* Suggested-password copy hint */}
                        <AnimatePresence>
                          {showSuggestion && (
                            <motion.div
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                              style={{
                                marginTop: 10,
                                padding: '8px 12px',
                                background: '#f0fdf4',
                                border: '1px solid #bbf7d0',
                                borderRadius: 8,
                                fontSize: '0.78rem',
                                color: '#15803d',
                                fontWeight: 500,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                              }}
                            >
                              <CheckCircle2 size={13} color="#22c55e" />
                              Secure password applied. Save it before you continue.
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )
                  })()}
                </AnimatePresence>
              </div>

              {/* Remember + Forgot */}
              {mode === 'login' && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8125rem', color: '#475569', cursor: 'pointer' }}>
                    <input type="checkbox" name="remember" style={{ accentColor: '#0f172a', width: 15, height: 15 }} />
                    Keep me signed in
                  </label>
                  <Link href="/forgot-password" style={{ fontSize: '0.8125rem', color: '#475569', textDecoration: 'none', fontWeight: 500 }}>
                    Reset password
                  </Link>
                </div>
              )}

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

              {/* Submit button */}
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
                    {mode === 'login' ? 'Signing in...' : 'Creating workspace...'}
                  </>
                ) : (
                  mode === 'login' ? 'Sign in to SmartLend' : 'Create SmartLend account'
                )}
              </button>
            </form>

            {/* Toggle */}
            <p style={{ textAlign: 'center', marginTop: 24, fontSize: '0.8125rem', color: '#94a3b8' }}>
              {mode === 'login' ? 'Need a SmartLend account? ' : 'Already using SmartLend? '}
              <button
                type="button"
                onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); setEmailError(null); setPasswordValue(''); setShowSuggestion(false) }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0f172a',
                  fontWeight: 700,
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                {mode === 'login' ? 'Create one' : 'Sign in'}
              </button>
            </p>
          </div>
        </motion.div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .login-grid { grid-template-columns: 1fr !important; }
        }
        input[type="email"]:focus,
        input[type="password"]:focus,
        input[type="text"]:focus {
          outline: none;
          border-color: #0f172a !important;
          box-shadow: 0 0 0 3px rgba(15,23,42,0.08) !important;
        }
      `}</style>
    </div>
  )
}
