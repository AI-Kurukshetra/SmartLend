import type { Metadata } from 'next'
import { Mail, ShieldCheck, User2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getCurrentMembership } from '@/lib/authz'
import { formatUiLabel } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Profile',
  description: 'Profile and workspace identity settings.',
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const membership = await getCurrentMembership()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const profileRes = user
    ? await supabase.from('profiles').select('first_name,last_name,last_actor').eq('id', user.id).limit(1).maybeSingle()
    : { data: null as any }

  const displayName =
    profileRes.data?.first_name || profileRes.data?.last_name
      ? [profileRes.data?.first_name, profileRes.data?.last_name].filter(Boolean).join(' ')
      : user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <section style={{ borderRadius: 28, padding: 24, background: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 52%, #0f766e 100%)', color: '#fff' }}>
        <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.78 }}>Account Profile</p>
        <h1 style={{ margin: '10px 0 0', fontSize: '2rem', lineHeight: 1.04, fontWeight: 950, letterSpacing: '-0.04em' }}>{displayName}</h1>
        <p style={{ margin: '12px 0 0', maxWidth: 620, color: 'rgba(255,255,255,0.82)', lineHeight: 1.7 }}>
          Review your current workspace identity, membership role, and preferred actor from one clean account screen.
        </p>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
        <InfoCard icon={User2} label="Display name" value={displayName} />
        <InfoCard icon={Mail} label="Email" value={user?.email || 'Not available'} />
        <InfoCard icon={ShieldCheck} label="Role" value={membership ? formatUiLabel(membership.role) : 'No active membership'} />
      </section>

      <section style={{ border: '1px solid #dbe4f0', borderRadius: 24, background: '#fff', padding: 18, boxShadow: '0 10px 28px rgba(15,23,42,0.04)' }}>
        <h2 style={{ margin: 0, color: '#0f172a', fontWeight: 950, fontSize: '1.08rem' }}>Workspace identity</h2>
        <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
          <Row label="Preferred actor" value={formatUiLabel(profileRes.data?.last_actor || 'lender')} />
          <Row label="Organization access" value={membership ? `Connected to ${membership.orgId}` : 'No connected organization'} />
          <Row label="Membership status" value={membership ? formatUiLabel(membership.status) : 'No active membership'} />
        </div>
      </section>

      <style>{`
        @media (max-width: 760px) {
          section[style*='grid-template-columns: repeat(3'] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>
  label: string
  value: string
}) {
  return (
    <div style={{ border: '1px solid #dbe4f0', borderRadius: 22, background: '#fff', padding: 16, boxShadow: '0 10px 28px rgba(15,23,42,0.04)' }}>
      <div style={{ width: 44, height: 44, borderRadius: 14, background: '#eff6ff', border: '1px solid #bfdbfe', display: 'grid', placeItems: 'center' }}>
        <Icon size={18} color="#1d4ed8" />
      </div>
      <p style={{ margin: '14px 0 0', color: '#64748b', fontWeight: 800, fontSize: '0.84rem' }}>{label}</p>
      <p style={{ margin: '6px 0 0', color: '#0f172a', fontWeight: 900, fontSize: '1rem', lineHeight: 1.45 }}>{value}</p>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: 14, background: '#f8fafc', padding: '12px 14px' }}>
      <span style={{ color: '#64748b', fontWeight: 800, fontSize: '0.82rem' }}>{label}</span>
      <span style={{ color: '#0f172a', fontWeight: 900, fontSize: '0.86rem', textAlign: 'right' }}>{value}</span>
    </div>
  )
}
