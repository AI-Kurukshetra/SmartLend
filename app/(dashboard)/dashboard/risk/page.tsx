import type { Metadata } from 'next'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  FileSearch,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrgId } from '@/lib/authz'
import { formatUiLabel } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Risk',
  description: 'Portfolio risk scoring and decision support.',
}

function money(value: number) {
  return `$${Math.round(value).toLocaleString()}`
}

function avg(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
}

export default async function RiskPage() {
  const supabase = await createClient()
  const orgId = await getCurrentOrgId()

  const riskRes = await supabase
    .from('risk_assessments')
    .select('id,application_id,borrower_id,score,band,summary,recommended_action,factors,metrics,updated_at')
    .eq('org_id', orgId)
    .order('updated_at', { ascending: false })
    .limit(100)

  const assessments = riskRes.data || []
  const borrowerIds = Array.from(new Set(assessments.map((item: any) => item.borrower_id as string)))
  const appIds = Array.from(new Set(assessments.map((item: any) => item.application_id as string)))
  const [borrowersRes, appsRes] = await Promise.all([
    borrowerIds.length > 0
      ? supabase.from('borrower_profiles').select('id,full_name').in('id', borrowerIds)
      : Promise.resolve({ data: [] as any[] }),
    appIds.length > 0
      ? supabase.from('loan_applications').select('id,status,requested_amount').in('id', appIds)
      : Promise.resolve({ data: [] as any[] }),
  ])

  const borrowerMap = new Map((borrowersRes.data || []).map((row: any) => [row.id, row]))
  const appMap = new Map((appsRes.data || []).map((row: any) => [row.id, row]))

  const highRisk = assessments.filter((item: any) => item.band === 'high').length
  const elevatedRisk = assessments.filter((item: any) => item.band === 'elevated').length
  const reviewActions = assessments.filter((item: any) => item.recommended_action === 'review').length
  const declineActions = assessments.filter((item: any) => item.recommended_action === 'decline').length
  const averageScore = avg(assessments.map((item: any) => Number(item.score || 0)))
  const totalExposure = assessments.reduce((sum: number, item: any) => sum + Number(appMap.get(item.application_id)?.requested_amount || 0), 0)

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <section
        style={{
          borderRadius: 28,
          padding: 24,
          background: 'linear-gradient(135deg, #111827 0%, #7c2d12 44%, #991b1b 100%)',
          color: '#fff',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', inset: 'auto -8% -45% auto', width: 320, height: 320, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', filter: 'blur(10px)' }} />
        <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: 18 }}>
          <div>
            <p style={heroKickerStyle}>Risk Desk</p>
            <h1 style={heroTitleStyle}>Prioritize exposure, review pressure, and adverse credit signals from one queue</h1>
            <p style={heroBodyStyle}>
              Use live risk scores, exposure totals, and recommendation mix to focus underwriting effort where it matters most.
            </p>
            <div style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <HeroChip icon={ShieldAlert} label={`${highRisk} high risk files`} />
              <HeroChip icon={Activity} label={`${averageScore.toFixed(1)} average score`} />
              <HeroChip icon={TrendingUp} label={`${money(totalExposure)} reviewed exposure`} />
            </div>
          </div>

          <div style={heroPanelStyle}>
            <p style={heroKickerStyle}>Risk Mix</p>
            <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
              <MixRow label="High risk" value={String(highRisk)} tone="red" />
              <MixRow label="Elevated risk" value={String(elevatedRisk)} tone="amber" />
              <MixRow label="Manual review" value={String(reviewActions)} tone="blue" />
              <MixRow label="Decline recommended" value={String(declineActions)} tone="red" />
            </div>
          </div>
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
        <MetricCard icon={ShieldAlert} label="High risk" value={String(highRisk)} hint="Applications currently in the highest risk band" tone="red" />
        <MetricCard icon={AlertTriangle} label="Elevated risk" value={String(elevatedRisk)} hint="Files that may need pricing or policy adjustments" tone="amber" />
        <MetricCard icon={FileSearch} label="Manual review" value={String(reviewActions)} hint="Assessments calling for underwriter intervention" tone="blue" />
        <MetricCard icon={CheckCircle2} label="Average score" value={averageScore.toFixed(1)} hint={`${assessments.length} total assessments in scope`} tone="green" />
      </section>

      <section style={{ display: 'grid', gap: 12 }}>
        {assessments.length === 0 && (
          <div style={{ border: '1px dashed var(--color-border)', borderRadius: 18, background: 'var(--color-surface)', padding: 16, color: 'var(--color-text-secondary)' }}>
            No risk assessments yet. Submit or rerun underwriting on applications first.
          </div>
        )}
        {assessments.map((item: any) => {
          const borrower = borrowerMap.get(item.borrower_id)
          const app = appMap.get(item.application_id)
          const metrics = item.metrics || {}
          const factors = Array.isArray(item.factors) ? item.factors : []
          return (
            <div
              key={item.id}
              style={{
                border: '1px solid var(--color-border)',
                borderRadius: 22,
                background: 'var(--color-surface)',
                padding: 18,
                boxShadow: 'var(--shadow-lg)',
                display: 'grid',
                gap: 14,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ margin: 0, color: 'var(--color-text-primary)', fontWeight: 950, fontSize: '1rem' }}>{borrower?.full_name || 'Borrower'}</p>
                  <p style={{ margin: '6px 0 0', color: 'var(--color-text-secondary)', fontSize: '0.84rem' }}>
                    App #{item.application_id.slice(0, 8)} • {formatUiLabel(app?.status || 'n/a')} • {money(Number(app?.requested_amount || 0))}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={scoreBadge(Number(item.score || 0))}>{item.score}/100</span>
                  <span style={bandBadge(String(item.band || ''))}>{formatUiLabel(item.band)}</span>
                  <span style={actionBadgeStyle(String(item.recommended_action || 'review'))}>{formatUiLabel(item.recommended_action)}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
                <Metric label="Credit score" value={String(metrics.latest_credit_score ?? 'N/A')} />
                <Metric label="Debt to income" value={metrics.debt_to_income ? `${(Number(metrics.debt_to_income) * 100).toFixed(1)}%` : 'N/A'} />
                <Metric label="Annual income" value={metrics.annual_income ? money(Number(metrics.annual_income)) : 'N/A'} />
                <Metric label="Credit reports" value={String(metrics.bureau_reports_count ?? 0)} />
              </div>

              <div style={{ border: '1px solid var(--color-border)', borderRadius: 16, background: 'var(--gray-50)', padding: 14, color: 'var(--color-text-secondary)', lineHeight: 1.65 }}>
                {item.summary}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
                {factors.slice(0, 4).map((factor: any) => (
                  <div key={factor.code} style={{ border: '1px solid var(--color-border)', borderRadius: 14, background: 'var(--color-surface)', padding: 12 }}>
                    <p style={{ margin: 0, color: 'var(--color-text-primary)', fontWeight: 900 }}>{formatUiLabel(factor.code)}</p>
                    <p style={{ margin: '5px 0 0', color: 'var(--color-text-secondary)', fontSize: '0.84rem', lineHeight: 1.55 }}>{factor.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </section>

      <style>{`
        @media (max-width: 1180px) {
          section[style*='grid-template-columns: 1.15fr 0.85fr'],
          section[style*='grid-template-columns: repeat(4'] {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 760px) {
          section[style*='grid-template-columns: repeat(4'] {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
          div[style*='grid-template-columns: repeat(2'] {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 520px) {
          section[style*='grid-template-columns: repeat(4'] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: 14, background: 'var(--gray-50)', padding: 12 }}>
      <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--color-text-secondary)', fontWeight: 800 }}>{label}</p>
      <p style={{ margin: '7px 0 0', fontSize: '0.94rem', color: 'var(--color-text-primary)', fontWeight: 900 }}>{value}</p>
    </div>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>
  label: string
  value: string
  hint: string
  tone: 'red' | 'amber' | 'blue' | 'green'
}) {
  const palette = {
    red: { bg: '#fef2f2', fg: '#991b1b', ring: '#fecaca' },
    amber: { bg: '#fffbeb', fg: '#92400e', ring: '#fde68a' },
    blue: { bg: '#eff6ff', fg: '#1d4ed8', ring: '#bfdbfe' },
    green: { bg: '#f0fdf4', fg: '#166534', ring: '#bbf7d0' },
  }[tone]

  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: 22, background: 'var(--color-surface)', padding: 16, boxShadow: 'var(--shadow-lg)' }}>
      <div style={{ width: 44, height: 44, borderRadius: 14, background: palette.bg, border: `1px solid ${palette.ring}`, display: 'grid', placeItems: 'center' }}>
        <Icon size={18} color={palette.fg} />
      </div>
      <p style={{ margin: '14px 0 0', color: 'var(--color-text-secondary)', fontWeight: 800, fontSize: '0.84rem' }}>{label}</p>
      <p style={{ margin: '6px 0 0', color: 'var(--color-text-primary)', fontWeight: 950, fontSize: '1.7rem', letterSpacing: '-0.03em' }}>{value}</p>
      <p style={{ margin: '8px 0 0', color: 'var(--color-text-secondary)', fontSize: '0.8rem', lineHeight: 1.55 }}>{hint}</p>
    </div>
  )
}

function HeroChip({ icon: Icon, label }: { icon: React.ComponentType<{ size?: number; color?: string }>; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 999, background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.12)', fontWeight: 800, fontSize: '0.82rem' }}>
      <Icon size={14} color="#fff" />
      {label}
    </span>
  )
}

function MixRow({ label, value, tone }: { label: string; value: string; tone: 'red' | 'amber' | 'blue' }) {
  const palette = {
    red: { dot: '#f87171', bg: 'rgba(248,113,113,0.16)' },
    amber: { dot: '#f59e0b', bg: 'rgba(245,158,11,0.16)' },
    blue: { dot: '#60a5fa', bg: 'rgba(96,165,250,0.16)' },
  }[tone]

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 12px', borderRadius: 14, background: 'rgba(255,255,255,0.08)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: palette.dot, boxShadow: `0 0 0 6px ${palette.bg}` }} />
        <span style={{ fontWeight: 700 }}>{label}</span>
      </div>
      <span style={{ fontWeight: 900 }}>{value}</span>
    </div>
  )
}

const heroKickerStyle = { margin: 0, fontSize: '0.78rem', fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase' as const, opacity: 0.78 }
const heroTitleStyle = { margin: '10px 0 0', fontSize: '2rem', lineHeight: 1.03, fontWeight: 950, letterSpacing: '-0.04em' }
const heroBodyStyle = { margin: '12px 0 0', maxWidth: 620, color: 'rgba(255,255,255,0.82)', lineHeight: 1.7 }
const heroPanelStyle = { borderRadius: 22, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', padding: 18, backdropFilter: 'blur(10px)' }

function scoreBadge(score: number) {
  const color = score >= 80 ? { bg: '#fee2e2', fg: '#991b1b' } : score >= 60 ? { bg: '#fef3c7', fg: '#92400e' } : { bg: '#dcfce7', fg: '#166534' }
  return {
    borderRadius: 999,
    background: color.bg,
    color: color.fg,
    padding: '6px 10px',
    fontSize: '0.8rem',
    fontWeight: 800,
  } as const
}

function bandBadge(band: string) {
  const palette: Record<string, { bg: string; text: string }> = {
    low: { bg: '#dcfce7', text: '#166534' },
    moderate: { bg: '#dbeafe', text: '#1d4ed8' },
    elevated: { bg: '#fef3c7', text: '#92400e' },
    high: { bg: '#fee2e2', text: '#991b1b' },
  }
  const colors = palette[band] || { bg: '#e2e8f0', text: '#334155' }
  return {
    borderRadius: 999,
    background: colors.bg,
    color: colors.text,
    padding: '6px 10px',
    fontSize: '0.8rem',
    fontWeight: 800,
  } as const
}

function actionBadgeStyle(action: string) {
  const palette: Record<string, { bg: string; text: string }> = {
    approve: { bg: '#dcfce7', text: '#166534' },
    review: { bg: '#dbeafe', text: '#1d4ed8' },
    decline: { bg: '#fee2e2', text: '#991b1b' },
  }
  const colors = palette[action] || { bg: '#e2e8f0', text: '#334155' }
  return {
    borderRadius: 999,
    background: colors.bg,
    color: colors.text,
    padding: '6px 10px',
    fontSize: '0.8rem',
    fontWeight: 800,
  } as const
}
