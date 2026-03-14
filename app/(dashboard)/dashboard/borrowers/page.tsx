import type { Metadata } from 'next'
import type { CSSProperties } from 'react'
import Link from 'next/link'
import { MailPlus, ShieldCheck, UserRoundPlus, UserRoundSearch } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { requireOrgMembership } from '@/lib/authz'
import { inviteBorrower, resendBorrowerInvite } from './actions'
import { getSiteUrl } from '@/lib/siteUrl'

export const metadata: Metadata = {
  title: 'Borrower Management',
  description: 'Create and invite borrowers to SmartLend with secure magic-link onboarding.',
}

export default async function BorrowersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>
}) {
  const supabase = await createClient()
  const membership = await requireOrgMembership()
  const { error, success } = await searchParams

  const invitesRes = await supabase
    .from('org_invites')
    .select('id,email,token,accepted_at,expires_at,created_at')
    .eq('org_id', membership.orgId)
    .eq('role', 'borrower')
    .order('created_at', { ascending: false })
    .limit(50)

  const invites = invitesRes.data ?? []
  const pending = invites.filter((invite: any) => !invite.accepted_at).length
  const accepted = invites.filter((invite: any) => invite.accepted_at).length

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <section style={{ borderRadius: 28, padding: 24, background: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 44%, #0f766e 100%)', color: '#fff' }}>
        <p style={eyebrowStyle}>Borrowers</p>
        <h1 style={heroTitleStyle}>Invite borrowers into your lender workspace with a clearer onboarding queue</h1>
        <p style={heroCopyStyle}>
          Keep borrower access controlled through secure invite links, direct borrower account setup, and a live invite ledger that shows who is still pending.
        </p>
      </section>

      {error && <Notice tone="error" text={error} />}
      {success && <Notice tone="success" text={success} />}

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
        <StatCard icon={UserRoundPlus} label="Borrower invites" value={String(invites.length)} tone="blue" />
        <StatCard icon={MailPlus} label="Pending invites" value={String(pending)} tone="amber" />
        <StatCard icon={ShieldCheck} label="Accepted invites" value={String(accepted)} tone="teal" />
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.1fr', gap: 14 }}>
        <div style={panelStyle}>
          <div>
            <h2 style={sectionTitleStyle}>Invite borrower</h2>
            <p style={sectionSubtitleStyle}>Create a secure borrower account invite tied to your organization.</p>
          </div>
          <form action={inviteBorrower} style={{ display: 'grid', gap: 10 }}>
            <input type="email" name="email" placeholder="borrower@company.com" required style={inputStyle} />
            <button type="submit" style={primaryButtonStyle}>Generate borrower invite</button>
          </form>
        </div>

        <div style={panelStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={iconWrapStyle('#eff6ff')}>
              <UserRoundSearch size={18} color="#1d4ed8" />
            </div>
            <div>
              <h2 style={sectionTitleStyle}>Invite status</h2>
              <p style={sectionSubtitleStyle}>Track pending, accepted, and expiring invites without raw system wording.</p>
            </div>
          </div>
          <div style={{ marginTop: 6, display: 'grid', gap: 10 }}>
            {invites.length === 0 && <EmptyState text="No borrower invites yet." />}
            {invites.map((invite: any) => (
              <div key={invite.id} style={{ border: '1px solid var(--color-border)', borderRadius: 16, background: 'var(--gray-50)', padding: 14, display: 'grid', gap: 12 }}>
                <div>
                  <p style={{ margin: 0, color: 'var(--color-text-primary)', fontWeight: 900 }}>{invite.email}</p>
                  <p style={{ margin: '6px 0 0', color: 'var(--color-text-secondary)', fontSize: '0.84rem' }}>
                    {invite.accepted_at ? 'Accepted' : 'Pending'} • Expires {new Date(invite.expires_at).toLocaleString()}
                  </p>
                </div>
                {!invite.accepted_at ? (
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                    <code style={{ flex: '1 1 320px', padding: '10px 12px', borderRadius: 12, background: '#0b1220', color: '#e2e8f0', overflowX: 'auto', fontSize: '0.8rem' }}>
                      {`${getSiteUrl()}/borrower/accept?invite=${encodeURIComponent(invite.token)}`}
                    </code>
                    <Link
                      href={`${getSiteUrl()}/borrower/accept?invite=${encodeURIComponent(invite.token)}`}
                      target="_blank"
                      style={{ ...secondaryButtonStyle, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      Open link
                    </Link>
                    <form action={resendBorrowerInvite}>
                      <input type="hidden" name="invite_id" value={invite.id} />
                      <button type="submit" style={secondaryButtonStyle}>Refresh link</button>
                    </form>
                  </div>
                ) : (
                  <span style={acceptedPillStyle}>Accepted</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 960px) {
          section[style*='grid-template-columns: repeat(3'] { grid-template-columns: 1fr !important; }
          section[style*='grid-template-columns: 0.9fr 1.1fr'] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>
  label: string
  value: string
  tone: 'blue' | 'amber' | 'teal'
}) {
  const palette = {
    blue: { bg: '#eff6ff', border: '#bfdbfe', fg: '#1d4ed8' },
    amber: { bg: '#fffbeb', border: '#fde68a', fg: '#b45309' },
    teal: { bg: '#ecfeff', border: '#a5f3fc', fg: '#0f766e' },
  }[tone]

  return (
    <div style={statCardStyle}>
      <div style={{ ...iconWrapStyle(palette.bg), border: `1px solid ${palette.border}` }}>
        <Icon size={18} color={palette.fg} />
      </div>
      <p style={metricLabelStyle}>{label}</p>
      <p style={statValueStyle}>{value}</p>
    </div>
  )
}

function Notice({ tone, text }: { tone: 'error' | 'success'; text: string }) {
  const palette = tone === 'error'
    ? { border: '#fecaca', background: '#fef2f2', color: '#b91c1c' }
    : { border: '#bbf7d0', background: '#f0fdf4', color: '#166534' }

  return (
    <div style={{ border: `1px solid ${palette.border}`, background: palette.background, color: palette.color, borderRadius: 14, padding: '12px 14px', fontWeight: 800 }}>
      {text}
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div style={{ border: '1px dashed var(--color-border)', borderRadius: 16, background: 'var(--color-surface)', padding: 16, color: 'var(--color-text-secondary)' }}>
      {text}
    </div>
  )
}

const eyebrowStyle: CSSProperties = {
  margin: 0,
  fontSize: '0.78rem',
  fontWeight: 900,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.74)',
  opacity: 0.78,
}

const heroTitleStyle: CSSProperties = {
  margin: '10px 0 0',
  fontSize: '2rem',
  lineHeight: 1.04,
  fontWeight: 950,
  letterSpacing: '-0.04em',
  maxWidth: 760,
  color: '#fff',
}

const heroCopyStyle: CSSProperties = {
  margin: '12px 0 0',
  maxWidth: 680,
  color: 'rgba(255,255,255,0.82)',
  lineHeight: 1.7,
}

const statCardStyle: CSSProperties = {
  border: '1px solid var(--color-border)',
  borderRadius: 22,
  background: 'var(--color-surface)',
  padding: 16,
  boxShadow: 'var(--shadow-lg)',
}

const panelStyle: CSSProperties = {
  border: '1px solid var(--color-border)',
  borderRadius: 24,
  background: 'var(--color-surface)',
  padding: 18,
  display: 'grid',
  gap: 14,
  boxShadow: 'var(--shadow-lg)',
}

const iconWrapStyle = (background: string): CSSProperties => ({
  width: 44,
  height: 44,
  borderRadius: 14,
  background,
  display: 'grid',
  placeItems: 'center',
})

const sectionTitleStyle: CSSProperties = {
  margin: 0,
  color: 'var(--color-text-primary)',
  fontWeight: 950,
  fontSize: '1rem',
}

const sectionSubtitleStyle: CSSProperties = {
  margin: '4px 0 0',
  color: 'var(--color-text-secondary)',
  fontSize: '0.82rem',
  lineHeight: 1.55,
}

const metricLabelStyle: CSSProperties = {
  margin: '12px 0 0',
  color: 'var(--color-text-secondary)',
  fontWeight: 800,
  fontSize: '0.82rem',
}

const statValueStyle: CSSProperties = {
  margin: '8px 0 0',
  color: 'var(--color-text-primary)',
  fontWeight: 950,
  fontSize: '1.7rem',
}

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  border: '1.5px solid var(--color-border)',
  borderRadius: 14,
  fontSize: '0.95rem',
  outline: 'none',
  background: 'var(--color-surface)',
  color: 'var(--color-text-primary)',
}

const primaryButtonStyle: CSSProperties = {
  border: 'none',
  borderRadius: 14,
  background: 'linear-gradient(135deg, #0f766e 0%, #0ea5a4 100%)',
  color: '#fff',
  fontWeight: 900,
  padding: '12px 14px',
  cursor: 'pointer',
}

const secondaryButtonStyle: CSSProperties = {
  border: '1px solid var(--color-border)',
  borderRadius: 14,
  background: 'var(--color-surface)',
  color: 'var(--color-text-primary)',
  fontWeight: 900,
  padding: '10px 12px',
  cursor: 'pointer',
}

const acceptedPillStyle: CSSProperties = {
  borderRadius: 999,
  padding: '7px 11px',
  background: '#dcfce7',
  color: '#166534',
  fontSize: '0.78rem',
  fontWeight: 900,
}
