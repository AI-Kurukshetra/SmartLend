import type { Metadata } from 'next'
import {
  BadgeCheck,
  FileSearch,
  Gauge,
  Gavel,
  RefreshCcw,
  ShieldCheck,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrgId } from '@/lib/authz'
import { rerunApplicationUnderwriting, updateApplicationStatus } from '../applications/actions'
import { pullBureauCredit } from './actions'
import { formatUiLabel } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Underwriting',
  description: 'Rules engine and decision queue scaffolding.',
}

function money(value: number) {
  return `$${Math.round(value).toLocaleString()}`
}

function timeAgo(value: string) {
  const diff = Date.now() - new Date(value).getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

export default async function UnderwritingPage() {
  const supabase = await createClient()
  const orgId = await getCurrentOrgId()

  const appsRes = await supabase
    .from('loan_applications')
    .select('id,requested_amount,requested_term_months,status,decision_code,created_at,credit_score,annual_income,monthly_debt_obligations,employment_status,underwriting_recommendation,underwriting_summary')
    .eq('org_id', orgId)
    .in('status', ['submitted', 'under_review'])
    .order('created_at', { ascending: true })
    .limit(100)
  const items = appsRes.data || []

  const decisionsRes = await supabase
    .from('underwriting_decisions')
    .select('application_id,recommendation,reason_codes,metrics,decision_source,reviewed_at')
    .eq('org_id', orgId)
    .limit(200)
  const decisionMap = new Map((decisionsRes.data || []).map((row: any) => [row.application_id, row]))

  const reportsRes = await supabase
    .from('credit_reports')
    .select('application_id,bureau,pull_type,score,monitoring_enabled,created_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(300)
  const reportMap = new Map<string, any[]>()
  for (const report of reportsRes.data || []) {
    const current = reportMap.get(report.application_id) || []
    current.push(report)
    reportMap.set(report.application_id, current)
  }

  const riskRes = await supabase
    .from('risk_assessments')
    .select('application_id,score,band,recommended_action,summary')
    .eq('org_id', orgId)
    .limit(200)
  const riskMap = new Map((riskRes.data || []).map((row: any) => [row.application_id, row]))

  const submitted = items.filter((item: any) => item.status === 'submitted').length
  const underReview = items.filter((item: any) => item.status === 'under_review').length
  const engineApprove = items.filter((item: any) => item.underwriting_recommendation === 'approve').length
  const engineReview = items.filter((item: any) => item.underwriting_recommendation === 'review').length

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <section
        style={{
          borderRadius: 28,
          padding: 24,
          background: 'linear-gradient(135deg, #111827 0%, #1d4ed8 44%, #0f766e 100%)',
          color: '#fff',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', inset: 'auto -8% -45% auto', width: 320, height: 320, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', filter: 'blur(10px)' }} />
        <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: 18 }}>
          <div>
            <p style={heroKickerStyle}>Decision Desk</p>
            <h1 style={heroTitleStyle}>Review submitted files, compare engine signals, and publish lender decisions</h1>
            <p style={heroBodyStyle}>
              Keep the underwriting queue moving with a cleaner view of borrower strength, credit pulls, risk context, and manual overrides.
            </p>
            <div style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <HeroChip icon={FileSearch} label={`${items.length} files in queue`} />
              <HeroChip icon={ShieldCheck} label={`${engineApprove} engine approve`} />
              <HeroChip icon={Gavel} label={`${engineReview} engine review`} />
            </div>
          </div>

          <div style={heroPanelStyle}>
            <p style={heroKickerStyle}>Queue Snapshot</p>
            <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
              <MixRow label="Submitted" value={String(submitted)} tone="blue" />
              <MixRow label="Under review" value={String(underReview)} tone="amber" />
              <MixRow label="Engine approve" value={String(engineApprove)} tone="green" />
              <MixRow label="Engine review" value={String(engineReview)} tone="blue" />
            </div>
          </div>
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
        <MetricCard icon={FileSearch} label="Submitted" value={String(submitted)} hint="New applications awaiting underwriter triage" tone="blue" />
        <MetricCard icon={Gavel} label="Under review" value={String(underReview)} hint="Files currently in manual review" tone="amber" />
        <MetricCard icon={BadgeCheck} label="Engine approve" value={String(engineApprove)} hint="Applications the engine would move forward" tone="green" />
        <MetricCard icon={Gauge} label="Engine review" value={String(engineReview)} hint="Applications requiring closer analyst attention" tone="blue" />
      </section>

      <section style={{ display: 'grid', gap: 12 }}>
        {items.length === 0 && (
          <div style={{ border: '1px dashed #cbd5e1', borderRadius: 18, background: '#fff', padding: 16, color: '#64748b' }}>
            No applications pending underwriting.
          </div>
        )}

        {items.map((item: any) => {
          const decision = decisionMap.get(item.id)
          const risk = riskMap.get(item.id)
          const reports = (reportMap.get(item.id) || []).slice(0, 3)

          return (
            <div
              key={item.id}
              style={{
                border: '1px solid #dbe4f0',
                borderRadius: 22,
                background: '#fff',
                padding: 18,
                boxShadow: '0 10px 30px rgba(15,23,42,0.04)',
                display: 'grid',
                gridTemplateColumns: '1.1fr 0.9fr',
                gap: 18,
                alignItems: 'start',
              }}
            >
              <div style={{ display: 'grid', gap: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div>
                    <p style={{ margin: 0, color: '#0f172a', fontWeight: 950, fontSize: '1.08rem' }}>
                      {money(Number(item.requested_amount || 0))} request
                    </p>
                    <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '0.84rem' }}>
                      Application #{item.id.slice(0, 8)} • {item.requested_term_months} months • Created {timeAgo(item.created_at)}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={statusBadgeStyle(String(item.status || 'submitted'))}>{formatUiLabel(item.status)}</span>
                    <span style={recommendationBadgeStyle(String(item.underwriting_recommendation || 'review'))}>
                      Engine {formatUiLabel(item.underwriting_recommendation || 'review')}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
                  <Metric label="Credit score" value={item.credit_score || 'N/A'} />
                  <Metric label="Annual income" value={item.annual_income ? money(Number(item.annual_income)) : 'N/A'} />
                  <Metric label="Monthly debt" value={item.monthly_debt_obligations ? money(Number(item.monthly_debt_obligations)) : 'N/A'} />
                  <Metric label="Employment" value={formatUiLabel(item.employment_status || 'n/a')} />
                </div>

                <div style={{ border: '1px solid #e2e8f0', borderRadius: 16, background: '#f8fafc', padding: 14, color: '#475569', lineHeight: 1.65 }}>
                  {item.underwriting_summary || 'No underwriting summary yet.'}
                  {decision?.reason_codes?.length ? ` Reasons: ${decision.reason_codes.map((code: string) => formatUiLabel(code)).join(', ')}` : ''}
                </div>

                {risk && (
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 16, background: '#fff', padding: 14, color: '#475569', lineHeight: 1.65 }}>
                    Risk band: <strong>{formatUiLabel(risk.band)}</strong> ({risk.score}/100) • Recommended {formatUiLabel(risk.recommended_action)}
                    <br />
                    {risk.summary}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  {reports.map((report: any) => (
                    <span key={`${report.bureau}-${report.created_at}`} style={reportChipStyle}>
                      {formatUiLabel(report.bureau)} • {formatUiLabel(report.pull_type)} • {report.score ?? 'N/A'}{report.monitoring_enabled ? ' • Monitoring' : ''}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ border: '1px solid #e2e8f0', borderRadius: 18, background: '#f8fafc', padding: 14, display: 'grid', gap: 14 }}>
                <div>
                  <p style={{ margin: 0, color: '#0f172a', fontWeight: 900 }}>Credit bureau tools</p>
                  <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '0.82rem', lineHeight: 1.55 }}>
                    Pull an updated report or switch the report type before final lender decisioning.
                  </p>
                </div>

                <form action={pullBureauCredit} style={{ display: 'grid', gap: 8 }}>
                  <input type="hidden" name="application_id" value={item.id} />
                  <select name="bureau" defaultValue="experian" style={selectStyle}>
                    <option value="experian">Experian</option>
                    <option value="equifax">Equifax</option>
                    <option value="transunion">TransUnion</option>
                  </select>
                  <select name="pull_type" defaultValue="soft" style={selectStyle}>
                    <option value="soft">Soft pull</option>
                    <option value="hard">Hard pull</option>
                    <option value="monitoring">Monitoring</option>
                  </select>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: '#475569', fontWeight: 800 }}>
                    <input type="checkbox" name="monitoring_enabled" value="true" />
                    Enable monitoring
                  </label>
                  <button type="submit" style={secondaryButtonStyle}>
                    Pull credit report
                  </button>
                </form>

                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 14 }}>
                  <p style={{ margin: 0, color: '#0f172a', fontWeight: 900 }}>Manual decision</p>
                  <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '0.82rem', lineHeight: 1.55 }}>
                    Override status, attach a lender decision code, or rerun the engine after new data arrives.
                  </p>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                    <form action={rerunApplicationUnderwriting}>
                      <input type="hidden" name="application_id" value={item.id} />
                      <button type="submit" style={ghostButtonStyle}>
                        <RefreshCcw size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                        Re-run engine
                      </button>
                    </form>
                  </div>

                  <form action={updateApplicationStatus} style={{ display: 'grid', gap: 8, marginTop: 12 }}>
                    <input type="hidden" name="application_id" value={item.id} />
                    <select name="status" defaultValue={item.status} style={selectStyle}>
                      <option value="under_review">Under review</option>
                      <option value="approved">Approved</option>
                      <option value="declined">Declined</option>
                    </select>
                    <input name="decision_code" defaultValue={item.decision_code || ''} placeholder="Decision code" style={inputStyle} />
                    <button type="submit" style={primaryButtonStyle}>
                      Save lender decision
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )
        })}
      </section>

      <style>{`
        @media (max-width: 1180px) {
          section[style*='grid-template-columns: 1.15fr 0.85fr'],
          section[style*='grid-template-columns: repeat(4'],
          div[style*='grid-template-columns: 1.1fr 0.9fr'] {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 760px) {
          section[style*='grid-template-columns: repeat(4'] {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
          div[style*='grid-template-columns: repeat(4'] {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }
        @media (max-width: 520px) {
          section[style*='grid-template-columns: repeat(4'],
          div[style*='grid-template-columns: repeat(4'] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 14, background: '#fff', padding: 12 }}>
      <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b', fontWeight: 800 }}>{label}</p>
      <p style={{ margin: '7px 0 0', fontSize: '0.94rem', color: '#0f172a', fontWeight: 900 }}>{value}</p>
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
  tone: 'blue' | 'amber' | 'green'
}) {
  const palette = {
    blue: { bg: '#eff6ff', fg: '#1d4ed8', ring: '#bfdbfe' },
    amber: { bg: '#fffbeb', fg: '#92400e', ring: '#fde68a' },
    green: { bg: '#f0fdf4', fg: '#166534', ring: '#bbf7d0' },
  }[tone]

  return (
    <div style={{ border: '1px solid #dbe4f0', borderRadius: 22, background: '#fff', padding: 16, boxShadow: '0 10px 28px rgba(15,23,42,0.04)' }}>
      <div style={{ width: 44, height: 44, borderRadius: 14, background: palette.bg, border: `1px solid ${palette.ring}`, display: 'grid', placeItems: 'center' }}>
        <Icon size={18} color={palette.fg} />
      </div>
      <p style={{ margin: '14px 0 0', color: '#64748b', fontWeight: 800, fontSize: '0.84rem' }}>{label}</p>
      <p style={{ margin: '6px 0 0', color: '#0f172a', fontWeight: 950, fontSize: '1.7rem', letterSpacing: '-0.03em' }}>{value}</p>
      <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: '0.8rem', lineHeight: 1.55 }}>{hint}</p>
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

function MixRow({ label, value, tone }: { label: string; value: string; tone: 'blue' | 'amber' | 'green' }) {
  const palette = {
    blue: { dot: '#60a5fa', bg: 'rgba(96,165,250,0.16)' },
    amber: { dot: '#f59e0b', bg: 'rgba(245,158,11,0.16)' },
    green: { dot: '#22c55e', bg: 'rgba(34,197,94,0.16)' },
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
const reportChipStyle = { borderRadius: 999, padding: '7px 11px', background: '#ecfeff', color: '#155e75', fontWeight: 800, fontSize: '0.78rem', border: '1px solid #bae6fd' }
const selectStyle = { borderRadius: 12, border: '1.5px solid #cbd5e1', padding: '10px 12px', fontSize: '0.82rem', background: '#fff', color: '#0f172a' } satisfies React.CSSProperties
const inputStyle = { borderRadius: 12, border: '1.5px solid #cbd5e1', padding: '10px 12px', fontSize: '0.82rem', background: '#fff', color: '#0f172a' } satisfies React.CSSProperties
const secondaryButtonStyle = { border: '1px solid #cbd5e1', borderRadius: 12, background: '#fff', color: '#0f172a', padding: '10px 12px', fontSize: '0.82rem', fontWeight: 900, cursor: 'pointer' } satisfies React.CSSProperties
const ghostButtonStyle = { border: '1px solid #cbd5e1', borderRadius: 12, background: '#fff', color: '#0f172a', padding: '10px 12px', fontSize: '0.82rem', fontWeight: 900, cursor: 'pointer' } satisfies React.CSSProperties
const primaryButtonStyle = { border: 'none', borderRadius: 12, background: 'linear-gradient(135deg, #0f766e 0%, #0ea5a4 100%)', color: '#fff', padding: '10px 14px', fontSize: '0.82rem', fontWeight: 900, cursor: 'pointer' } satisfies React.CSSProperties

function statusBadgeStyle(status: string) {
  const palette: Record<string, { bg: string; fg: string }> = {
    submitted: { bg: '#dbeafe', fg: '#1d4ed8' },
    under_review: { bg: '#fffbeb', fg: '#92400e' },
  }
  const colors = palette[status] || { bg: '#f1f5f9', fg: '#334155' }
  return {
    borderRadius: 999,
    padding: '7px 11px',
    background: colors.bg,
    color: colors.fg,
    fontSize: '0.78rem',
    fontWeight: 900,
  } as const
}

function recommendationBadgeStyle(value: string) {
  const palette: Record<string, { bg: string; fg: string }> = {
    approve: { bg: '#dcfce7', fg: '#166534' },
    review: { bg: '#dbeafe', fg: '#1d4ed8' },
    decline: { bg: '#fee2e2', fg: '#991b1b' },
    pending: { bg: '#e2e8f0', fg: '#334155' },
  }
  const colors = palette[value] || { bg: '#e2e8f0', fg: '#334155' }
  return {
    borderRadius: 999,
    padding: '7px 11px',
    background: colors.bg,
    color: colors.fg,
    fontSize: '0.78rem',
    fontWeight: 900,
  } as const
}
