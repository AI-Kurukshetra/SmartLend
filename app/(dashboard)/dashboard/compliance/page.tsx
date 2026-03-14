import type { Metadata } from 'next'
import { ClipboardCheck, ScanSearch, ShieldCheck, Siren } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrgId, requirePermission } from '@/lib/authz'
import { formatUiLabel } from '@/lib/utils'
import { generateMonthlyStatements, runApplicationComplianceScan } from './actions'

export const metadata: Metadata = {
  title: 'Compliance & Audit',
  description: 'Audit event stream and compliance controls.',
}

export default async function CompliancePage() {
  await requirePermission('compliance.manage')
  const supabase = await createClient()
  const orgId = await getCurrentOrgId()
  const eventsRes = await supabase
    .from('audit_events')
    .select('id,event_type,resource_type,created_at,actor_type')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(60)
  const [applicationsRes, complianceRes] = await Promise.all([
    supabase.from('loan_applications').select('id,status,loan_purpose,underwriting_recommendation').eq('org_id', orgId).order('created_at', { ascending: false }).limit(20),
    supabase.from('compliance_events').select('id,application_id,regulation,check_type,status,detail,created_at').eq('org_id', orgId).order('created_at', { ascending: false }).limit(100),
  ])

  const events = eventsRes.data || []
  const applications = applicationsRes.data || []
  const complianceEvents = complianceRes.data || []
  const byApp = new Map<string, any[]>()
  for (const item of complianceEvents) {
    const current = byApp.get(item.application_id) || []
    current.push(item)
    byApp.set(item.application_id, current)
  }

  const passedChecks = complianceEvents.filter((item: any) => item.status === 'passed').length
  const flaggedChecks = complianceEvents.filter((item: any) => item.status !== 'passed').length

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <section style={{ borderRadius: 28, padding: 24, background: 'linear-gradient(135deg, #0f172a 0%, #374151 42%, #0f766e 100%)', color: '#fff' }}>
        <p style={eyebrowStyle}>Compliance</p>
        <h1 style={heroTitleStyle}>Keep applications audit-ready with clearer controls and readable check results</h1>
        <p style={heroCopyStyle}>
          Review compliance scans, generate monthly statements, and inspect audit history from one screen designed for governance instead of raw event text.
        </p>
        <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <form action={generateMonthlyStatements}>
            <button type="submit" style={heroButtonStyle}>Generate monthly statements</button>
          </form>
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
        <StatCard icon={ClipboardCheck} label="Applications tracked" value={String(applications.length)} tone="teal" />
        <StatCard icon={ShieldCheck} label="Checks passed" value={String(passedChecks)} tone="teal" />
        <StatCard icon={Siren} label="Checks flagged" value={String(flaggedChecks)} tone="rose" />
        <StatCard icon={ScanSearch} label="Audit events" value={String(events.length)} tone="slate" />
      </section>

      <section style={{ display: 'grid', gap: 14 }}>
        {applications.map((application: any) => {
          const checks = byApp.get(application.id) || []
          return (
            <article key={application.id} style={panelStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ margin: 0, color: 'var(--color-text-primary)', fontWeight: 950, fontSize: '1.05rem' }}>Application #{application.id.slice(0, 8)}</p>
                  <p style={{ margin: '6px 0 0', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                    {formatUiLabel(application.status)} • {formatUiLabel(application.loan_purpose || 'loan')} • {formatUiLabel(application.underwriting_recommendation || 'review')}
                  </p>
                </div>
                <form action={runApplicationComplianceScan}>
                  <input type="hidden" name="application_id" value={application.id} />
                  <button type="submit" style={secondaryButtonStyle}>Run compliance scan</button>
                </form>
              </div>
              <div style={{ display: 'grid', gap: 10 }}>
                {checks.length === 0 && <div style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>No compliance checks recorded yet.</div>}
                {checks.map((check: any) => (
                  <div key={check.id} style={{ border: '1px solid var(--color-border)', borderRadius: 16, background: 'var(--color-surface-soft)', padding: 14, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ margin: 0, color: 'var(--color-text-primary)', fontWeight: 900 }}>
                        {String(check.regulation || '').toUpperCase()} • {formatUiLabel(check.check_type)}
                      </p>
                      <p style={{ margin: '6px 0 0', color: 'var(--color-text-muted)', fontSize: '0.84rem', lineHeight: 1.6 }}>
                        {check.detail || 'No additional detail'}
                      </p>
                    </div>
                    <StatusPill value={check.status} />
                  </div>
                ))}
              </div>
            </article>
          )
        })}
      </section>

      <section style={panelStyle}>
        <h2 style={sectionTitleStyle}>Audit stream</h2>
        <p style={sectionSubtitleStyle}>Recent platform events recorded for compliance and internal review.</p>
        <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
          {events.length === 0 && <div style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>No audit events recorded yet.</div>}
          {events.map((event: any) => (
            <div key={event.id} style={{ border: '1px solid var(--color-border)', borderRadius: 16, background: 'var(--color-surface-soft)', padding: 14, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <p style={{ margin: 0, color: 'var(--color-text-primary)', fontWeight: 900 }}>{formatUiLabel(event.event_type)}</p>
                <p style={{ margin: '6px 0 0', color: 'var(--color-text-muted)', fontSize: '0.84rem' }}>
                  {formatUiLabel(event.resource_type)} • {formatUiLabel(event.actor_type)}
                </p>
              </div>
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>{new Date(event.created_at).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </section>

      <style>{`
        @media (max-width: 980px) {
          section[style*='grid-template-columns: repeat(4'] { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        }
        @media (max-width: 620px) {
          section[style*='grid-template-columns: repeat(4'] { grid-template-columns: 1fr !important; }
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
  tone: 'blue' | 'teal' | 'rose' | 'slate'
}) {
  const palette = {
    blue: { bg: '#eff6ff', border: '#bfdbfe', fg: '#1d4ed8' },
    teal: { bg: '#ecfeff', border: '#a5f3fc', fg: '#0f766e' },
    rose: { bg: '#fff1f2', border: '#fecdd3', fg: '#be123c' },
    slate: { bg: '#f1f5f9', border: '#cbd5e1', fg: '#334155' },
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

function StatusPill({ value }: { value: string }) {
  const tone = value === 'passed'
    ? { bg: '#dcfce7', fg: '#166534' }
    : { bg: '#fff1f2', fg: '#be123c' }

  return (
    <span style={{ borderRadius: 999, padding: '7px 11px', background: tone.bg, color: tone.fg, fontSize: '0.78rem', fontWeight: 900 }}>
      {formatUiLabel(value)}
    </span>
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
  fontSize: '2rem',
  lineHeight: 1.04,
  fontWeight: 950,
  letterSpacing: '-0.04em',
  maxWidth: 780,
} satisfies React.CSSProperties

const heroCopyStyle = {
  margin: '12px 0 0',
  maxWidth: 680,
  color: 'rgba(255,255,255,0.82)',
  lineHeight: 1.7,
} satisfies React.CSSProperties

const heroButtonStyle = {
  border: '1px solid rgba(255,255,255,0.18)',
  borderRadius: 14,
  background: 'rgba(255,255,255,0.12)',
  color: '#fff',
  fontWeight: 900,
  padding: '12px 14px',
  cursor: 'pointer',
  backdropFilter: 'blur(14px)',
} satisfies React.CSSProperties

const statCardStyle = {
  border: '1px solid var(--color-border-strong)',
  borderRadius: 22,
  background: 'var(--color-surface)',
  padding: 16,
  boxShadow: 'var(--color-shadow-soft)',
} satisfies React.CSSProperties

const panelStyle = {
  border: '1px solid var(--color-border-strong)',
  borderRadius: 24,
  background: 'var(--color-surface)',
  padding: 18,
  display: 'grid',
  gap: 14,
  boxShadow: 'var(--color-shadow-soft)',
} satisfies React.CSSProperties

const iconWrapStyle = (background: string) => ({
  width: 44,
  height: 44,
  borderRadius: 14,
  background,
  display: 'grid',
  placeItems: 'center',
})

const sectionTitleStyle = {
  margin: 0,
  color: 'var(--color-text-primary)',
  fontWeight: 950,
  fontSize: '1rem',
} satisfies React.CSSProperties

const sectionSubtitleStyle = {
  margin: '4px 0 0',
  color: 'var(--color-text-muted)',
  fontSize: '0.82rem',
  lineHeight: 1.55,
} satisfies React.CSSProperties

const metricLabelStyle = {
  margin: '12px 0 0',
  color: 'var(--color-text-muted)',
  fontWeight: 800,
  fontSize: '0.82rem',
} satisfies React.CSSProperties

const statValueStyle = {
  margin: '8px 0 0',
  color: 'var(--color-text-primary)',
  fontWeight: 950,
  fontSize: '1.7rem',
} satisfies React.CSSProperties

const secondaryButtonStyle = {
  border: '1px solid #cbd5e1',
  borderRadius: 14,
  background: 'var(--color-surface)',
  color: 'var(--color-text-primary)',
  fontWeight: 900,
  padding: '10px 12px',
  cursor: 'pointer',
} satisfies React.CSSProperties
