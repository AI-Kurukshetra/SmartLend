'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, LockKeyhole, Mail, ShieldCheck } from 'lucide-react'
import { signupBorrowerFromInvite } from '@/app/borrower/accept/actions'

export default function BorrowerInviteSetup({
  invite,
  inviteEmail,
  orgName,
  expiresAt,
}: {
  invite: string
  inviteEmail: string
  orgName: string
  expiresAt: string
}) {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmedEmail, setConfirmedEmail] = useState('')
  const [alreadyRegistered, setAlreadyRegistered] = useState(false)
  const [done, setDone] = useState(false)
  const [isPending, startTransition] = useTransition()

  if (done) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', background: '#fff' }}>
        <section style={{ padding: 40, background: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 44%, #0f766e 100%)', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <p style={eyebrowStyle}>Borrower Access</p>
          <h1 style={heroTitleStyle}>Your account setup is almost complete</h1>
          <p style={heroCopyStyle}>
            Confirm your email and SmartLend will finish linking your borrower account to {orgName}.
          </p>
        </section>
        <section style={panelShellStyle}>
          <div style={{ maxWidth: 420, width: '100%' }}>
            <div style={{ width: 78, height: 78, borderRadius: '50%', background: 'linear-gradient(135deg, #dcfce7 0%, #86efac 100%)', display: 'grid', placeItems: 'center', marginBottom: 24 }}>
              <CheckCircle2 size={34} color="#166534" />
            </div>
            <h2 style={panelTitleStyle}>Check your email</h2>
            <p style={panelCopyStyle}>
              We sent a confirmation link to <strong style={{ color: 'var(--color-text-primary)' }}>{confirmedEmail}</strong>. After verification, you will land back in SmartLend and continue as a borrower.
            </p>
          </div>
        </section>
      </div>
    )
  }

  if (alreadyRegistered) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--color-bg)', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 520, border: '1px solid var(--color-border)', background: 'var(--color-surface)', borderRadius: 24, padding: 24 }}>
          <h1 style={{ margin: 0, color: 'var(--color-text-primary)', fontSize: '1.7rem', fontWeight: 900 }}>Account already exists</h1>
          <p style={{ margin: '12px 0 0', color: 'var(--color-text-muted)', lineHeight: 1.7 }}>
            {confirmedEmail || inviteEmail} is already registered. Sign in with your password and we will attach this borrower invite to your account.
          </p>
          <div style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link href={`/login?invite=${encodeURIComponent(invite)}`} style={primaryLinkStyle}>
              Sign in
            </Link>
            <Link href="/forgot-password" style={secondaryLinkStyle}>
              Reset password
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', background: '#fff' }}>
      <section style={{ padding: 40, background: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 44%, #0f766e 100%)', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <p style={eyebrowStyle}>Borrower Invite</p>
        <h1 style={heroTitleStyle}>Create your borrower account and continue with {orgName}</h1>
        <p style={heroCopyStyle}>
          This account is for borrower actions only: apply for loans, upload documents, track progress, receive notifications, and repay through the platform.
        </p>
        <div style={{ marginTop: 18, display: 'grid', gap: 10 }}>
          <Feature icon={Mail} text={`Invited email: ${inviteEmail}`} />
          <Feature icon={ShieldCheck} text={`Lender organization: ${orgName}`} />
          <Feature icon={LockKeyhole} text={`Invite expires: ${new Date(expiresAt).toLocaleString()}`} />
        </div>
      </section>

      <section style={panelShellStyle}>
        <div style={{ width: '100%', maxWidth: 440 }}>
          <h2 style={panelTitleStyle}>Set up your borrower account</h2>
          <p style={panelCopyStyle}>
            You do not create an organization here. This account will be linked directly to your lender invitation.
          </p>

          <div style={{ marginTop: 18, display: 'grid', gap: 12 }}>
            <Field label="Email">
              <input value={inviteEmail} disabled style={{ ...inputStyle, background: 'var(--color-surface-soft)', color: 'var(--color-text-secondary)' }} />
            </Field>
            <Field label="Full name">
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Marcus Reed" style={inputStyle} />
            </Field>
            <Field label="Phone">
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 123 4567" style={inputStyle} />
            </Field>
            <Field label="Password">
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Create a password" style={inputStyle} />
            </Field>
            <Field label="Confirm password">
              <input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type="password" placeholder="Repeat your password" style={inputStyle} />
            </Field>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, color: 'var(--color-text-secondary)', fontWeight: 600, lineHeight: 1.6 }}>
              <input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} />
              I accept SmartLend borrower terms and understand this account is limited to borrower workflows.
            </label>
          </div>

          <button
            type="button"
            onClick={() => {
              setError(null)
              startTransition(async () => {
                const formData = new FormData()
                formData.set('invite', invite)
                formData.set('full_name', fullName)
                formData.set('phone', phone)
                formData.set('password', password)
                formData.set('confirm_password', confirmPassword)
                formData.set('accepted_terms', acceptedTerms ? 'true' : 'false')
                const result = await signupBorrowerFromInvite(formData)
                if (!result) return
                if ('error' in result && result.error) setError(result.error)
                else if ('alreadyRegistered' in result && result.alreadyRegistered) {
                  setAlreadyRegistered(true)
                  setConfirmedEmail(result.email)
                } else if ('success' in result && result.success) {
                  setDone(true)
                  setConfirmedEmail(result.email)
                }
              })
            }}
            disabled={isPending}
            style={{ ...primaryButtonStyle, marginTop: 18, opacity: isPending ? 0.75 : 1, cursor: isPending ? 'not-allowed' : 'pointer' }}
          >
            {isPending ? 'Creating account...' : 'Create borrower account'}
            {!isPending && <ArrowRight size={16} />}
          </button>

          {error && <p style={{ marginTop: 12, color: '#dc2626', fontWeight: 700 }}>{error}</p>}
        </div>
      </section>

      <style>{`
        @media (max-width: 900px) {
          div[style*='grid-template-columns: 1.05fr 0.95fr'] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'grid', gap: 8 }}>
      <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.84rem', fontWeight: 700 }}>{label}</span>
      {children}
    </label>
  )
}

function Feature({ icon: Icon, text }: { icon: React.ComponentType<{ size?: number; color?: string }>; text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderRadius: 16, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.14)', padding: '12px 14px', backdropFilter: 'blur(12px)' }}>
      <Icon size={16} color="#ffffff" />
      <span style={{ color: '#fff', fontWeight: 700 }}>{text}</span>
    </div>
  )
}

const eyebrowStyle = {
  margin: 0,
  fontSize: '0.78rem',
  fontWeight: 900,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  opacity: 0.78,
} satisfies React.CSSProperties

const heroTitleStyle = {
  margin: '10px 0 0',
  fontSize: '2.2rem',
  lineHeight: 1.02,
  fontWeight: 950,
  letterSpacing: '-0.04em',
  maxWidth: 680,
} satisfies React.CSSProperties

const heroCopyStyle = {
  margin: '12px 0 0',
  maxWidth: 640,
  color: 'rgba(255,255,255,0.82)',
  lineHeight: 1.7,
} satisfies React.CSSProperties

const panelShellStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '40px 28px',
  background: 'var(--color-surface)',
} satisfies React.CSSProperties

const panelTitleStyle = {
  margin: 0,
  color: 'var(--color-text-primary)',
  fontSize: '1.8rem',
  fontWeight: 950,
  letterSpacing: '-0.03em',
} satisfies React.CSSProperties

const panelCopyStyle = {
  margin: '10px 0 0',
  color: 'var(--color-text-muted)',
  lineHeight: 1.7,
} satisfies React.CSSProperties

const inputStyle = {
  width: '100%',
  padding: '12px 14px',
  border: '1.5px solid var(--color-border)',
  borderRadius: 14,
  background: 'var(--color-surface)',
  color: 'var(--color-text-primary)',
  outline: 'none',
} satisfies React.CSSProperties

const primaryButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  width: '100%',
  padding: '13px 16px',
  border: 'none',
  borderRadius: 14,
  background: 'linear-gradient(135deg, #0f766e 0%, #0ea5a4 100%)',
  color: '#fff',
  fontWeight: 900,
} satisfies React.CSSProperties

const primaryLinkStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '12px 14px',
  borderRadius: 14,
  background: '#0f172a',
  color: '#fff',
  textDecoration: 'none',
  fontWeight: 800,
} satisfies React.CSSProperties

const secondaryLinkStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '12px 14px',
  borderRadius: 14,
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface)',
  color: 'var(--color-text-primary)',
  textDecoration: 'none',
  fontWeight: 800,
} satisfies React.CSSProperties
