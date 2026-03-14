import type { Metadata } from 'next'
import { Building2, Repeat, Settings2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getCurrentMembership } from '@/lib/authz'
import { setLastActorPreference, updateOrganizationName } from './actions'
import { formatUiLabel } from '@/lib/utils'

export const metadata: Metadata = { title: 'Settings' }

export default async function SettingsPage() {
  const supabase = await createClient()
  const membership = await getCurrentMembership()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const orgRes = membership
    ? await supabase.from('organizations').select('id,name').eq('id', membership.orgId).limit(1).maybeSingle()
    : { data: null as any }

  const profileRes = user
    ? await supabase.from('profiles').select('last_actor').eq('id', user.id).limit(1).maybeSingle()
    : { data: null as any }

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <section style={{ borderRadius: 28, padding: 24, background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 46%, #0f766e 100%)', color: '#fff' }}>
        <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.78 }}>Workspace Settings</p>
        <h1 style={{ margin: '10px 0 0', fontSize: '2rem', lineHeight: 1.04, fontWeight: 950, letterSpacing: '-0.04em' }}>Manage organization identity and default workspace behavior</h1>
        <p style={{ margin: '12px 0 0', maxWidth: 620, color: 'rgba(255,255,255,0.82)', lineHeight: 1.7 }}>
          Keep your organization profile accurate and set the default actor experience for accounts that move between lender and borrower workspaces.
        </p>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card
          icon={Building2}
          title="Organization"
          subtitle="Only admins can change the organization name."
        >
          <form action={updateOrganizationName} style={{ display: 'grid', gap: 12 }}>
            <input name="name" defaultValue={orgRes.data?.name || ''} style={inputStyle} placeholder="Organization name" />
            <button type="submit" disabled={membership?.role !== 'admin'} style={{ ...primaryButtonStyle, background: membership?.role === 'admin' ? 'linear-gradient(135deg, #0f766e 0%, #0ea5a4 100%)' : '#94a3b8', cursor: membership?.role === 'admin' ? 'pointer' : 'default' }}>
              Save organization name
            </button>
          </form>
        </Card>

        <Card
          icon={Repeat}
          title="Default actor"
          subtitle="Used when one account has access to both lender and borrower workspaces."
        >
          <form action={setLastActorPreference} style={{ display: 'grid', gap: 12 }}>
            <select name="actor" defaultValue={profileRes.data?.last_actor || 'lender'} style={inputStyle}>
              <option value="lender">Lender</option>
              <option value="borrower">Borrower</option>
            </select>
            <button type="submit" style={primaryButtonStyle}>
              Update actor preference
            </button>
          </form>
        </Card>
      </section>

      <section style={{ border: '1px solid var(--color-border)', borderRadius: 24, background: 'var(--color-surface)', padding: 18, boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 42, height: 42, borderRadius: 14, background: '#eff6ff', display: 'grid', placeItems: 'center', border: '1px solid #bfdbfe' }}>
            <Settings2 size={18} color="#1d4ed8" />
          </div>
          <div>
            <h2 style={{ margin: 0, color: 'var(--color-text-primary)', fontWeight: 950, fontSize: '1.05rem' }}>Current workspace state</h2>
            <p style={{ margin: '4px 0 0', color: 'var(--color-text-secondary)', fontSize: '0.84rem' }}>Quick reference for your active role and connected organization.</p>
          </div>
        </div>
        <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
          <Row label="Role" value={membership ? formatUiLabel(membership.role) : 'No active membership'} />
          <Row label="Membership status" value={membership ? formatUiLabel(membership.status) : 'Unavailable'} />
          <Row label="Organization ID" value={membership?.orgId || 'Unavailable'} />
          <Row label="Preferred actor" value={formatUiLabel(profileRes.data?.last_actor || 'lender')} />
        </div>
      </section>

      <style>{`
        @media (max-width: 900px) {
          section[style*='grid-template-columns: 1fr 1fr'] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

function Card({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: 24, background: 'var(--color-surface)', padding: 18, boxShadow: 'var(--shadow-lg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 42, height: 42, borderRadius: 14, background: '#ecfeff', display: 'grid', placeItems: 'center', border: '1px solid #bae6fd' }}>
          <Icon size={18} color="#0f766e" />
        </div>
        <div>
          <h2 style={{ margin: 0, color: 'var(--color-text-primary)', fontWeight: 950, fontSize: '1.05rem' }}>{title}</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--color-text-secondary)', fontSize: '0.84rem', lineHeight: 1.55 }}>{subtitle}</p>
        </div>
      </div>
      <div style={{ marginTop: 14 }}>{children}</div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', border: '1px solid var(--color-border)', borderRadius: 14, background: 'var(--gray-50)', padding: '12px 14px' }}>
      <span style={{ color: 'var(--color-text-secondary)', fontWeight: 800, fontSize: '0.82rem' }}>{label}</span>
      <span style={{ color: 'var(--color-text-primary)', fontWeight: 900, fontSize: '0.86rem', textAlign: 'right' }}>{value}</span>
    </div>
  )
}

const inputStyle = {
  width: '100%',
  borderRadius: 14,
  border: '1.5px solid var(--color-border)',
  padding: '12px 14px',
  fontSize: '0.9rem',
  background: 'var(--color-surface)',
  color: 'var(--color-text-primary)',
} satisfies React.CSSProperties

const primaryButtonStyle = {
  border: 'none',
  borderRadius: 14,
  background: 'linear-gradient(135deg, #0f766e 0%, #0ea5a4 100%)',
  color: '#fff',
  fontWeight: 900,
  padding: '12px 14px',
  cursor: 'pointer',
} satisfies React.CSSProperties
