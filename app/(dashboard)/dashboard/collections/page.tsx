import type { Metadata } from 'next'
import { BellRing, FileWarning, Handshake, Siren } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrgId, requirePermission } from '@/lib/authz'
import { formatUiLabel } from '@/lib/utils'
import { createCollectionCase, runDunningWorkflow, updateCollectionCase } from './actions'

export const metadata: Metadata = {
  title: 'Collections',
  description: 'Delinquency and collections case management.',
}

export default async function CollectionsPage() {
  await requirePermission('collections.manage')
  const supabase = await createClient()
  const orgId = await getCurrentOrgId()
  const accountsRes = await supabase
    .from('loan_accounts')
    .select('id,status')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(100)

  const casesRes = await supabase
    .from('collection_cases')
    .select('id,status,days_past_due,note,created_at,loan_account_id')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(50)

  const caseIds = (casesRes.data || []).map((item: any) => item.id as string)
  const eventsRes = caseIds.length > 0
    ? await supabase
      .from('collection_events')
      .select('id,collection_case_id,event_type,status,detail,created_at')
      .in('collection_case_id', caseIds)
      .order('created_at', { ascending: false })
      .limit(200)
    : { data: [] as any[] }

  const accounts = accountsRes.data || []
  const items = casesRes.data || []
  const eventMap = new Map<string, any[]>()
  for (const event of eventsRes.data || []) {
    const current = eventMap.get(event.collection_case_id) || []
    current.push(event)
    eventMap.set(event.collection_case_id, current)
  }

  const openCases = items.filter((item: any) => item.status === 'open').length
  const hardshipCases = items.filter((item: any) => item.status === 'forbearance' || item.status === 'payment_plan').length
  const severeCases = items.filter((item: any) => Number(item.days_past_due || 0) >= 30).length

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <section style={{ borderRadius: 28, padding: 24, background: 'linear-gradient(135deg, #111827 0%, #7c2d12 48%, #be123c 100%)', color: '#fff' }}>
        <p style={eyebrowStyle}>Collections</p>
        <h1 style={heroTitleStyle}>Run delinquency response, hardship handling, and recovery follow-up from one queue</h1>
        <p style={heroCopyStyle}>
          Track borrower arrears, start new cases, and move active files from open contact to payment plan or resolution with a cleaner case workflow.
        </p>
        <form action={runDunningWorkflow} style={{ marginTop: 16 }}>
          <button type="submit" style={heroButtonStyle}>Run automated dunning workflow</button>
        </form>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
        <StatCard icon={FileWarning} label="Active cases" value={String(items.length)} tone="rose" />
        <StatCard icon={BellRing} label="Open cases" value={String(openCases)} tone="amber" />
        <StatCard icon={Handshake} label="Hardship programs" value={String(hardshipCases)} tone="blue" />
        <StatCard icon={Siren} label="30+ days past due" value={String(severeCases)} tone="slate" />
      </section>

      <section style={panelStyle}>
        <div>
          <h2 style={sectionTitleStyle}>Open a collection case</h2>
          <p style={sectionSubtitleStyle}>Create a new recovery workflow for an account that needs borrower outreach or loss mitigation.</p>
        </div>
        <form action={createCollectionCase} style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.7fr 1fr auto', gap: 10, alignItems: 'end' }}>
          <div>
            <label style={fieldLabelStyle}>Loan account</label>
            <select name="loan_account_id" required style={inputStyle}>
              <option value="">Select loan account</option>
              {accounts.map((account: any) => (
                <option key={account.id} value={account.id}>
                  {account.id.slice(0, 8)} • {formatUiLabel(account.status)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={fieldLabelStyle}>Days past due</label>
            <input type="number" name="days_past_due" min={0} placeholder="0" style={inputStyle} />
          </div>
          <div>
            <label style={fieldLabelStyle}>Opening note</label>
            <input name="note" placeholder="Initial collections summary" style={inputStyle} />
          </div>
          <button type="submit" style={primaryButtonStyle}>Create case</button>
        </form>
      </section>

      <section style={{ display: 'grid', gap: 14 }}>
        {items.length === 0 && <EmptyState text="No collection cases yet." />}
        {items.map((item: any) => (
          <article key={item.id} style={panelStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div>
                <p style={{ margin: 0, color: 'var(--color-text-primary)', fontWeight: 950, fontSize: '1.05rem' }}>Case #{item.id.slice(0, 8)}</p>
                <p style={{ margin: '6px 0 0', color: 'var(--color-text-secondary)', fontSize: '0.86rem' }}>
                  Account #{String(item.loan_account_id || '').slice(0, 8)} • {item.days_past_due} days past due
                </p>
              </div>
              <Badge value={item.status} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '0.95fr 1.05fr', gap: 14 }}>
              <div style={sectionCardStyle}>
                <h2 style={sectionTitleStyle}>Case update</h2>
                <p style={sectionSubtitleStyle}>Move the file to the right resolution state and keep the working note current.</p>
                <form action={updateCollectionCase} style={{ marginTop: 14, display: 'grid', gap: 10 }}>
                  <input type="hidden" name="case_id" value={item.id} />
                  <select name="status" defaultValue={item.status} style={inputStyle}>
                    <option value="open">Open</option>
                    <option value="forbearance">Forbearance</option>
                    <option value="payment_plan">Payment plan</option>
                    <option value="resolved">Resolved</option>
                    <option value="charged_off">Charged off</option>
                  </select>
                  <textarea name="note" defaultValue={item.note || ''} rows={4} placeholder="Latest borrower contact or resolution note" style={{ ...inputStyle, resize: 'vertical' }} />
                  <button type="submit" style={primaryButtonStyle}>Save case</button>
                </form>
              </div>

              <div style={sectionCardStyle}>
                <h2 style={sectionTitleStyle}>Recent event stream</h2>
                <p style={sectionSubtitleStyle}>Most recent workflow events attached to this case.</p>
                <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
                  {(eventMap.get(item.id) || []).slice(0, 4).map((event: any) => (
                    <MiniCard
                      key={event.id}
                      title={formatUiLabel(event.event_type)}
                      caption={`${formatUiLabel(event.status)} • ${event.detail || 'No extra detail'}`}
                    />
                  ))}
                  {(eventMap.get(item.id) || []).length === 0 && (
                    <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.88rem' }}>No collections events recorded yet.</div>
                  )}
                </div>
              </div>
            </div>
          </article>
        ))}
      </section>

      <style>{responsiveStyles}</style>
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
  tone: 'rose' | 'amber' | 'blue' | 'slate'
}) {
  const palette = {
    rose: { bg: '#fff1f2', border: '#fecdd3', fg: '#be123c' },
    amber: { bg: '#fffbeb', border: '#fde68a', fg: '#b45309' },
    blue: { bg: '#eff6ff', border: '#bfdbfe', fg: '#1d4ed8' },
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

function Badge({ value }: { value: string }) {
  return (
    <span style={{ borderRadius: 999, padding: '7px 11px', background: '#fff1f2', color: '#be123c', fontSize: '0.78rem', fontWeight: 900 }}>
      {formatUiLabel(value)}
    </span>
  )
}

function MiniCard({ title, caption }: { title: string; caption: string }) {
  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: 14, background: 'var(--color-surface)', padding: 12 }}>
      <p style={{ margin: 0, color: 'var(--color-text-primary)', fontWeight: 900 }}>{title}</p>
      <p style={{ margin: '6px 0 0', color: 'var(--color-text-secondary)', fontSize: '0.82rem', lineHeight: 1.55 }}>{caption}</p>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div style={{ border: '1px dashed var(--color-border)', borderRadius: 18, background: 'var(--color-surface)', padding: 18, color: 'var(--color-text-secondary)' }}>
      {text}
    </div>
  )
}

const responsiveStyles = `
  @media (max-width: 1080px) {
    section[style*='grid-template-columns: repeat(4'] { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
    form[style*='grid-template-columns: 1.4fr 0.7fr 1fr auto'] { grid-template-columns: 1fr 1fr !important; }
    div[style*='grid-template-columns: 0.95fr 1.05fr'] { grid-template-columns: 1fr !important; }
  }
  @media (max-width: 760px) {
    section[style*='grid-template-columns: repeat(4'] { grid-template-columns: 1fr !important; }
    form[style*='grid-template-columns: 1.4fr 0.7fr 1fr auto'] { grid-template-columns: 1fr !important; }
  }
`

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
  maxWidth: 820,
} satisfies React.CSSProperties

const heroCopyStyle = {
  margin: '12px 0 0',
  maxWidth: 700,
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

const panelStyle = {
  border: '1px solid var(--color-border)',
  borderRadius: 24,
  background: 'var(--color-surface)',
  padding: 18,
  display: 'grid',
  gap: 14,
  boxShadow: 'var(--shadow-lg)',
} satisfies React.CSSProperties

const statCardStyle = {
  border: '1px solid var(--color-border)',
  borderRadius: 22,
  background: 'var(--color-surface)',
  padding: 16,
  boxShadow: 'var(--shadow-lg)',
} satisfies React.CSSProperties

const sectionCardStyle = {
  border: '1px solid var(--color-border)',
  borderRadius: 22,
  background: 'var(--color-surface)',
  padding: 16,
  boxShadow: 'var(--shadow-lg)',
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
  color: 'var(--color-text-secondary)',
  fontSize: '0.82rem',
  lineHeight: 1.55,
} satisfies React.CSSProperties

const metricLabelStyle = {
  margin: 0,
  color: 'var(--color-text-secondary)',
  fontWeight: 800,
  fontSize: '0.82rem',
} satisfies React.CSSProperties

const statValueStyle = {
  margin: '8px 0 0',
  color: 'var(--color-text-primary)',
  fontWeight: 950,
  fontSize: '1.7rem',
} satisfies React.CSSProperties

const fieldLabelStyle = {
  display: 'block',
  marginBottom: 8,
  color: 'var(--color-text-secondary)',
  fontSize: '0.82rem',
  fontWeight: 800,
} satisfies React.CSSProperties

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
  background: 'linear-gradient(135deg, #be123c 0%, #e11d48 100%)',
  color: '#fff',
  fontWeight: 900,
  padding: '12px 14px',
  cursor: 'pointer',
  height: 48,
} satisfies React.CSSProperties
