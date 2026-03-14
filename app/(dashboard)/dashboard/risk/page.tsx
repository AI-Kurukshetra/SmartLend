import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrgId } from '@/lib/authz'

export const metadata: Metadata = {
  title: 'Risk',
  description: 'Portfolio risk scoring and decision support.',
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

  return (
    <div>
      <h1 style={{ margin: 0, fontSize: '1.9rem', fontWeight: 900, color: '#0f172a' }}>Risk assessment</h1>
      <p style={{ marginTop: 8, color: '#64748b', lineHeight: 1.7 }}>
        Portfolio risk scoring combines credit, debt load, employment, and exposure so underwriting teams can prioritize review effort.
      </p>
      <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
        {assessments.length === 0 && (
          <div style={{ border: '1px dashed #cbd5e1', borderRadius: 14, background: '#fff', padding: 16, color: '#64748b' }}>
            No risk assessments yet. Submit or rerun underwriting on applications first.
          </div>
        )}
        {assessments.map((item: any) => {
          const borrower = borrowerMap.get(item.borrower_id)
          const app = appMap.get(item.application_id)
          const metrics = item.metrics || {}
          const factors = Array.isArray(item.factors) ? item.factors : []
          return (
            <div key={item.id} style={{ border: '1px solid #e2e8f0', borderRadius: 14, background: '#fff', padding: 14, display: 'grid', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <p style={{ margin: 0, color: '#0f172a', fontWeight: 900 }}>{borrower?.full_name || 'Borrower'}</p>
                  <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '0.84rem' }}>
                    App #{item.application_id.slice(0, 8)} | {app?.status || 'n/a'} | ${Number(app?.requested_amount || 0).toLocaleString()}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={scoreBadge(item.score)}>{item.score}/100</span>
                  <span style={bandBadge(item.band)}>{item.band}</span>
                  <span style={{ borderRadius: 999, background: '#eef2ff', color: '#3730a3', padding: '6px 10px', fontSize: '0.8rem', fontWeight: 800 }}>
                    {item.recommended_action}
                  </span>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
                <Metric label="Credit score" value={String(metrics.latest_credit_score ?? 'n/a')} />
                <Metric label="Debt to income" value={metrics.debt_to_income ? `${(Number(metrics.debt_to_income) * 100).toFixed(1)}%` : 'n/a'} />
                <Metric label="Income" value={metrics.annual_income ? `$${Number(metrics.annual_income).toLocaleString()}` : 'n/a'} />
                <Metric label="Reports" value={String(metrics.bureau_reports_count ?? 0)} />
              </div>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, background: '#f8fafc', padding: 12, color: '#475569', lineHeight: 1.6 }}>
                {item.summary}
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                {factors.slice(0, 4).map((factor: any) => (
                  <div key={factor.code} style={{ border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff', padding: 10 }}>
                    <p style={{ margin: 0, color: '#0f172a', fontWeight: 800 }}>{factor.code}</p>
                    <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.84rem' }}>{factor.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, background: '#f8fafc', padding: 10 }}>
      <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b', fontWeight: 700 }}>{label}</p>
      <p style={{ margin: '6px 0 0', fontSize: '0.92rem', color: '#0f172a', fontWeight: 900 }}>{value}</p>
    </div>
  )
}

function scoreBadge(score: number) {
  return {
    borderRadius: 999,
    background: '#dcfce7',
    color: '#166534',
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
