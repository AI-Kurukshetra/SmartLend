import type { Metadata } from 'next'
import type { CSSProperties } from 'react'
import { BarChart3, FileStack, Gauge, Wallet } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrgId, requirePermission } from '@/lib/authz'
import { generateMonthlyStatements } from '../compliance/actions'

export const metadata: Metadata = {
  title: 'Reports',
  description: 'Portfolio and operational KPI reporting.',
}

export default async function ReportsPage() {
  await requirePermission('reports.view')
  const supabase = await createClient()
  const orgId = await getCurrentOrgId()

  const [productsCount, applicationsCount, accountsCount, collectionsCount, paymentsRes, riskRes, statementsCount] = await Promise.all([
    supabase.from('loan_products').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
    supabase.from('loan_applications').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
    supabase.from('loan_accounts').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
    supabase.from('collection_cases').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
    supabase.from('loan_payments').select('amount,status').eq('org_id', orgId).limit(1000),
    supabase.from('risk_assessments').select('band,score').eq('org_id', orgId).limit(1000),
    supabase.from('loan_statements').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
  ])

  const payments = paymentsRes.data || []
  const postedVolume = payments.filter((row: any) => row.status === 'posted').reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0)
  const failedVolume = payments.filter((row: any) => row.status === 'failed').reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0)
  const risks = riskRes.data || []
  const lowRiskCount = risks.filter((row: any) => row.band === 'low').length
  const highRiskCount = risks.filter((row: any) => row.band === 'high').length
  const averageScore = risks.length === 0 ? 0 : risks.reduce((sum: number, row: any) => sum + Number(row.score || 0), 0) / risks.length

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <section style={{ borderRadius: 28, padding: 24, background: 'linear-gradient(135deg, #0f172a 0%, #155e75 46%, #0f766e 100%)', color: '#fff' }}>
        <p style={eyebrowStyle}>Reports</p>
        <h1 style={heroTitleStyle}>Portfolio and operating reports with cleaner KPI framing</h1>
        <p style={heroCopyStyle}>
          Keep a high-level view of volume, product distribution, risk posture, and statement output in one reporting screen instead of scattered counters.
        </p>
        <form action={generateMonthlyStatements} style={{ marginTop: 16 }}>
          <button type="submit" style={heroButtonStyle}>Refresh monthly statements</button>
        </form>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
        <StatCard icon={FileStack} label="Loan products" value={String(productsCount.count ?? 0)} tone="blue" />
        <StatCard icon={BarChart3} label="Applications" value={String(applicationsCount.count ?? 0)} tone="teal" />
        <StatCard icon={Wallet} label="Posted volume" value={`$${Math.round(postedVolume).toLocaleString()}`} tone="amber" />
        <StatCard icon={Gauge} label="Average risk score" value={averageScore.toFixed(1)} tone="slate" />
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 14 }}>
        <div style={panelStyle}>
          <h2 style={sectionTitleStyle}>Portfolio snapshot</h2>
          <p style={sectionSubtitleStyle}>Operational totals across origination, servicing, and collections.</p>
          <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
            <Row label="Loan accounts" value={String(accountsCount.count ?? 0)} />
            <Row label="Collection cases" value={String(collectionsCount.count ?? 0)} />
            <Row label="Statements generated" value={String(statementsCount.count ?? 0)} />
            <Row label="Failed payment volume" value={`$${Math.round(failedVolume).toLocaleString()}`} />
          </div>
        </div>

        <div style={panelStyle}>
          <h2 style={sectionTitleStyle}>Risk mix</h2>
          <p style={sectionSubtitleStyle}>Distribution of low and high risk assessments in the reporting window.</p>
          <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
            <Row label="Low risk assessments" value={String(lowRiskCount)} />
            <Row label="High risk assessments" value={String(highRiskCount)} />
            <Row label="Coverage" value={String(risks.length)} />
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 980px) {
          section[style*='grid-template-columns: repeat(4'] { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          section[style*='grid-template-columns: 1.1fr 0.9fr'] { grid-template-columns: 1fr !important; }
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
  tone: 'blue' | 'teal' | 'amber' | 'slate'
}) {
  const palette = {
    blue: { bg: '#eff6ff', border: '#bfdbfe', fg: '#1d4ed8' },
    teal: { bg: '#ecfeff', border: '#a5f3fc', fg: '#0f766e' },
    amber: { bg: '#fffbeb', border: '#fde68a', fg: '#b45309' },
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', border: '1px solid var(--color-border)', borderRadius: 14, background: 'var(--color-surface-soft)', padding: '12px 14px' }}>
      <span style={{ color: 'var(--color-text-muted)', fontWeight: 800, fontSize: '0.82rem' }}>{label}</span>
      <span style={{ color: 'var(--color-text-primary)', fontWeight: 900, fontSize: '0.86rem', textAlign: 'right' }}>{value}</span>
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

const heroTitleStyle: CSSProperties = {
  margin: '10px 0 0',
  fontSize: '2rem',
  lineHeight: 1.04,
  fontWeight: 950,
  letterSpacing: '-0.04em',
  maxWidth: 760,
}

const heroCopyStyle: CSSProperties = {
  margin: '12px 0 0',
  maxWidth: 660,
  color: 'rgba(255,255,255,0.82)',
  lineHeight: 1.7,
}

const heroButtonStyle: CSSProperties = {
  border: '1px solid rgba(255,255,255,0.18)',
  borderRadius: 14,
  background: 'rgba(255,255,255,0.12)',
  color: '#fff',
  fontWeight: 900,
  padding: '12px 14px',
  cursor: 'pointer',
  backdropFilter: 'blur(14px)',
}

const statCardStyle: CSSProperties = {
  border: '1px solid var(--color-border-strong)',
  borderRadius: 22,
  background: 'var(--color-surface)',
  padding: 16,
  boxShadow: 'var(--color-shadow-soft)',
}

const panelStyle: CSSProperties = {
  border: '1px solid var(--color-border-strong)',
  borderRadius: 24,
  background: 'var(--color-surface)',
  padding: 18,
  boxShadow: 'var(--color-shadow-soft)',
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
  color: 'var(--color-text-muted)',
  fontSize: '0.82rem',
  lineHeight: 1.55,
}

const metricLabelStyle: CSSProperties = {
  margin: '12px 0 0',
  color: 'var(--color-text-muted)',
  fontWeight: 800,
  fontSize: '0.82rem',
}

const statValueStyle: CSSProperties = {
  margin: '8px 0 0',
  color: 'var(--color-text-primary)',
  fontWeight: 950,
  fontSize: '1.7rem',
}
