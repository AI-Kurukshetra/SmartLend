import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrgId } from '@/lib/authz'
import { rerunApplicationUnderwriting, updateApplicationStatus } from '../applications/actions'
import { pullBureauCredit } from './actions'

export const metadata: Metadata = {
  title: 'Underwriting',
  description: 'Rules engine and decision queue scaffolding.',
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

  return (
    <div>
      <h1 style={{ margin: 0, fontSize: '1.9rem', fontWeight: 900, color: '#0f172a' }}>Underwriting and decisioning</h1>
      <p style={{ marginTop: 8, color: '#64748b', lineHeight: 1.7 }}>
        Review submitted applications and publish approval/decline decisions.
      </p>
      <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
        {items.length === 0 && (
          <div style={{ border: '1px dashed #cbd5e1', borderRadius: 14, background: '#fff', padding: 16, color: '#64748b' }}>
            No applications pending underwriting.
          </div>
        )}
        {items.map((item: any) => (
          <div key={item.id} style={{ border: '1px solid #e2e8f0', borderRadius: 14, background: '#fff', padding: 14, display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div>
              <p style={{ margin: 0, color: '#0f172a', fontWeight: 800 }}>
                ${Number(item.requested_amount).toLocaleString()} / {item.requested_term_months} months
              </p>
              <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '0.84rem' }}>Application #{item.id.slice(0, 8)}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ borderRadius: 999, padding: '6px 10px', background: '#f1f5f9', color: '#334155', fontWeight: 800, fontSize: '0.8rem' }}>{item.status}</span>
                <span style={{ borderRadius: 999, padding: '6px 10px', background: '#eef2ff', color: '#3730a3', fontWeight: 800, fontSize: '0.8rem' }}>
                  engine: {item.underwriting_recommendation || 'pending'}
                </span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
              <Metric label="Credit score" value={item.credit_score || 'n/a'} />
              <Metric label="Annual income" value={item.annual_income ? `$${Number(item.annual_income).toLocaleString()}` : 'n/a'} />
              <Metric label="Monthly debt" value={item.monthly_debt_obligations ? `$${Number(item.monthly_debt_obligations).toLocaleString()}` : 'n/a'} />
              <Metric label="Employment" value={item.employment_status || 'n/a'} />
            </div>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, background: '#f8fafc', padding: 12, color: '#475569', lineHeight: 1.6 }}>
              {item.underwriting_summary || 'No underwriting summary yet.'}
              {decisionMap.get(item.id)?.reason_codes?.length ? ` Reasons: ${decisionMap.get(item.id).reason_codes.join(', ')}` : ''}
            </div>
            {riskMap.get(item.id) && (
              <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, background: '#fff', padding: 12, color: '#475569', lineHeight: 1.6 }}>
                Risk: <strong>{riskMap.get(item.id)?.band}</strong> ({riskMap.get(item.id)?.score}/100) | recommended {riskMap.get(item.id)?.recommended_action}
                <br />
                {riskMap.get(item.id)?.summary}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {(reportMap.get(item.id) || []).slice(0, 3).map((report) => (
                <span key={`${report.bureau}-${report.created_at}`} style={{ borderRadius: 999, padding: '6px 10px', background: '#ecfeff', color: '#155e75', fontWeight: 800, fontSize: '0.8rem' }}>
                  {report.bureau} {report.pull_type} {report.score ?? 'n/a'}{report.monitoring_enabled ? ' monitor' : ''}
                </span>
              ))}
              <form action={pullBureauCredit} style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <input type="hidden" name="application_id" value={item.id} />
                <select name="bureau" defaultValue="experian" style={{ borderRadius: 8, border: '1px solid #cbd5e1', padding: '6px 8px', fontSize: '0.8rem' }}>
                  <option value="experian">Experian</option>
                  <option value="equifax">Equifax</option>
                  <option value="transunion">TransUnion</option>
                </select>
                <select name="pull_type" defaultValue="soft" style={{ borderRadius: 8, border: '1px solid #cbd5e1', padding: '6px 8px', fontSize: '0.8rem' }}>
                  <option value="soft">soft pull</option>
                  <option value="hard">hard pull</option>
                  <option value="monitoring">monitoring</option>
                </select>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#475569', fontWeight: 700 }}>
                  <input type="checkbox" name="monitoring_enabled" value="true" />
                  monitor
                </label>
                <button type="submit" style={{ border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff', color: '#0f172a', padding: '6px 10px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}>
                  Pull credit
                </button>
              </form>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <form action={rerunApplicationUnderwriting}>
                <input type="hidden" name="application_id" value={item.id} />
                <button type="submit" style={{ border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff', color: '#0f172a', padding: '6px 10px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}>
                  Re-run engine
                </button>
              </form>
              <form action={updateApplicationStatus} style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <input type="hidden" name="application_id" value={item.id} />
                <select name="status" defaultValue={item.status} style={{ borderRadius: 8, border: '1px solid #cbd5e1', padding: '6px 8px', fontSize: '0.8rem' }}>
                  <option value="under_review">under_review</option>
                  <option value="approved">approved</option>
                  <option value="declined">declined</option>
                </select>
                <input name="decision_code" defaultValue={item.decision_code || ''} placeholder="Decision code" style={{ borderRadius: 8, border: '1px solid #cbd5e1', padding: '6px 8px', fontSize: '0.8rem', width: 140 }} />
                <button type="submit" style={{ border: 'none', borderRadius: 8, background: '#0f766e', color: '#fff', padding: '6px 10px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}>
                  Manual override
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff', padding: 10 }}>
      <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b', fontWeight: 700 }}>{label}</p>
      <p style={{ margin: '6px 0 0', fontSize: '0.92rem', color: '#0f172a', fontWeight: 900 }}>{value}</p>
    </div>
  )
}
