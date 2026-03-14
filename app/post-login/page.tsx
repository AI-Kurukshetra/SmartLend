import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { CSSProperties } from 'react'
import { ArrowRightLeft, Building2, Landmark } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { chooseActor } from './actions'

export default async function PostLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ switch?: string }>
}) {
  const forceSwitch = (await searchParams).switch === '1'
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [membershipRes, borrowerRes, profileRes] = await Promise.all([
    supabase.from('org_members').select('id').eq('user_id', user.id).eq('status', 'active').limit(1).maybeSingle(),
    supabase.from('borrower_profiles').select('id').eq('user_id', user.id).eq('status', 'active').limit(1).maybeSingle(),
    supabase.from('profiles').select('last_actor').eq('id', user.id).limit(1).maybeSingle(),
  ])

  const hasLender = Boolean(membershipRes.data?.id)
  const hasBorrower = Boolean(borrowerRes.data?.id)
  const lastActor = profileRes.data?.last_actor as 'lender' | 'borrower' | undefined
  const inviteToken = (user.user_metadata as { invite_token?: string } | null)?.invite_token ?? ''

  let hasPendingBorrowerInvite = false
  if (!hasLender && !hasBorrower && inviteToken) {
    const inviteRes = await supabase
      .from('org_invites')
      .select('role')
      .eq('token', inviteToken)
      .limit(1)
      .maybeSingle()
    hasPendingBorrowerInvite = inviteRes.data?.role === 'borrower'
  }
  const cameFromBorrowerInvite = hasPendingBorrowerInvite || (inviteToken ? !hasLender || lastActor === 'borrower' : false)

  if (hasLender && hasBorrower && !forceSwitch && cameFromBorrowerInvite) {
    redirect('/borrower')
  }
  if (hasLender && hasBorrower && !forceSwitch) {
    if (lastActor === 'borrower') redirect('/borrower')
    redirect('/dashboard')
  }
  if (hasLender && !hasBorrower) redirect('/dashboard')
  if (!hasLender && hasBorrower) redirect('/borrower')
  if (!hasLender && !hasBorrower && hasPendingBorrowerInvite) redirect('/borrower/onboarding')
  if (!hasLender && !hasBorrower && lastActor === 'borrower') redirect('/borrower/onboarding')
  if (!hasLender && !hasBorrower) redirect('/onboarding')

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'linear-gradient(180deg, var(--color-bg) 0%, var(--color-surface-soft) 100%)', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 920, display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', gap: 18 }}>
        <section style={{ borderRadius: 30, padding: 28, background: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 48%, #0f766e 100%)', color: '#fff' }}>
          <p style={eyebrowStyle}>Switch Actor</p>
          <h1 style={{ margin: '10px 0 0', fontSize: '2.2rem', lineHeight: 1.02, fontWeight: 950, letterSpacing: '-0.05em' }}>
            Choose the workspace you want to enter right now
          </h1>
          <p style={{ margin: '14px 0 0', color: 'rgba(255,255,255,0.82)', lineHeight: 1.7 }}>
            This account can operate in both lender and borrower experiences. Pick the workspace that matches the task you want to do next.
          </p>
          <div style={{ marginTop: 18, display: 'grid', gap: 10 }}>
            <Feature text="Lender workspace for operations, underwriting, funding, and servicing" />
            <Feature text="Borrower workspace for applications, documents, payments, and support" />
          </div>
        </section>

        <section style={{ border: '1px solid var(--color-border-strong)', borderRadius: 28, background: 'var(--color-surface)', padding: 22, boxShadow: 'var(--color-shadow-panel)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: '#eff6ff', border: '1px solid #bfdbfe', display: 'grid', placeItems: 'center' }}>
              <ArrowRightLeft size={18} color="#1d4ed8" />
            </div>
            <div>
              <h2 style={{ margin: 0, color: 'var(--color-text-primary)', fontWeight: 950, fontSize: '1.1rem' }}>Available workspaces</h2>
              <p style={{ margin: '4px 0 0', color: 'var(--color-text-muted)', fontSize: '0.84rem' }}>You can switch again later from the account flow.</p>
            </div>
          </div>

          <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
            <form action={chooseActor.bind(null, 'lender')} style={choiceCardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 42, height: 42, borderRadius: 14, background: '#ecfeff', border: '1px solid #a5f3fc', display: 'grid', placeItems: 'center' }}>
                  <Building2 size={18} color="#0f766e" />
                </div>
                <div>
                  <p style={{ margin: 0, color: 'var(--color-text-primary)', fontWeight: 950 }}>Continue as lender</p>
                  <p style={{ margin: '4px 0 0', color: 'var(--color-text-muted)', fontSize: '0.84rem' }}>Use the operational dashboard and manage the portfolio.</p>
                </div>
              </div>
              <button style={primaryButtonStyle} type="submit">Open lender workspace</button>
            </form>

            <form action={chooseActor.bind(null, 'borrower')} style={choiceCardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 42, height: 42, borderRadius: 14, background: '#fffbeb', border: '1px solid #fde68a', display: 'grid', placeItems: 'center' }}>
                  <Landmark size={18} color="#b45309" />
                </div>
                <div>
                  <p style={{ margin: 0, color: 'var(--color-text-primary)', fontWeight: 950 }}>Continue as borrower</p>
                  <p style={{ margin: '4px 0 0', color: 'var(--color-text-muted)', fontSize: '0.84rem' }}>View applications, documents, payments, and support.</p>
                </div>
              </div>
              <button style={secondaryButtonStyle} type="submit">Open borrower workspace</button>
            </form>
          </div>

          <p style={{ margin: '16px 0 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            You can return here any time from <Link href="/post-login?switch=1" style={{ color: '#1d4ed8', fontWeight: 800, textDecoration: 'none' }}>Switch Actor</Link>.
          </p>
        </section>
      </div>

      <style>{`
        @media (max-width: 900px) {
          div[style*='grid-template-columns: 1.05fr 0.95fr'] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

function Feature({ text }: { text: string }) {
  return (
    <div style={{ borderRadius: 16, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.12)', padding: '12px 14px', color: '#fff', fontWeight: 700, backdropFilter: 'blur(12px)' }}>
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
  opacity: 0.78,
}

const choiceCardStyle: CSSProperties = {
  border: '1px solid #dbe4f0',
  borderRadius: 20,
  background: 'var(--color-surface-soft)',
  padding: 16,
  display: 'grid',
  gap: 14,
}

const primaryButtonStyle: CSSProperties = {
  width: '100%',
  border: 'none',
  background: 'linear-gradient(135deg, #0f766e 0%, #0ea5a4 100%)',
  color: '#fff',
  borderRadius: 14,
  padding: '12px 14px',
  fontWeight: 900,
  cursor: 'pointer',
}

const secondaryButtonStyle: CSSProperties = {
  width: '100%',
  border: '1px solid #cbd5e1',
  background: 'var(--color-surface)',
  color: 'var(--color-text-primary)',
  borderRadius: 14,
  padding: '12px 14px',
  fontWeight: 900,
  cursor: 'pointer',
}
