import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrgId, requirePermission } from '@/lib/authz'

export const metadata: Metadata = { title: 'Analytics' }

export default async function AnalyticsPage() {
  await requirePermission('reports.view')
  const supabase = await createClient()
  const orgId = await getCurrentOrgId()

  const [appsRes, accountsRes, paymentsRes, collectionsRes, riskRes, complianceRes] = await Promise.all([
    supabase.from('loan_applications').select('status').eq('org_id', orgId).limit(1000),
    supabase.from('loan_accounts').select('status,principal_balance').eq('org_id', orgId).limit(1000),
    supabase.from('loan_payments').select('status,amount').eq('org_id', orgId).limit(1000),
    supabase.from('collection_cases').select('status').eq('org_id', orgId).limit(1000),
    supabase.from('risk_assessments').select('band,score,recommended_action').eq('org_id', orgId).limit(1000),
    supabase.from('compliance_events').select('status,regulation').eq('org_id', orgId).limit(1000),
  ])

  const apps = appsRes.data || []
  const accounts = accountsRes.data || []
  const payments = paymentsRes.data || []
  const collections = collectionsRes.data || []
  const risks = riskRes.data || []
  const compliance = complianceRes.data || []

  const approvedCount = apps.filter((a: any) => a.status === 'approved').length
  const declinedCount = apps.filter((a: any) => a.status === 'declined').length
  const postedPayments = payments.filter((p: any) => p.status === 'posted')
  const postedVolume = postedPayments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0)
  const outstanding = accounts.reduce((s: number, a: any) => s + Number(a.principal_balance || 0), 0)
  const delinquentAccounts = accounts.filter((a: any) => a.status === 'delinquent').length
  const avgRiskScore = risks.length ? (risks.reduce((sum: number, item: any) => sum + Number(item.score || 0), 0) / risks.length).toFixed(1) : '0.0'
  const highRiskCount = risks.filter((item: any) => item.band === 'high').length
  const complianceFailures = compliance.filter((item: any) => item.status === 'failed').length

  const approvalRate = apps.length ? ((approvedCount / apps.length) * 100).toFixed(1) : '0.0'
  const declineRate = apps.length ? ((declinedCount / apps.length) * 100).toFixed(1) : '0.0'

  return (
    <div>
      <h1 style={{ margin: 0, fontSize: '1.9rem', fontWeight: 900, color: '#0f172a' }}>Analytics</h1>
      <p style={{ marginTop: 8, color: '#64748b' }}>Operational KPIs generated from live SmartLend data.</p>
      <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(220px, 1fr))', gap: 10 }}>
        <KpiCard label="Approval rate" value={`${approvalRate}%`} />
        <KpiCard label="Decline rate" value={`${declineRate}%`} />
        <KpiCard label="Posted payment volume" value={`$${postedVolume.toLocaleString()}`} />
        <KpiCard label="Outstanding principal" value={`$${outstanding.toLocaleString()}`} />
        <KpiCard label="Delinquent accounts" value={String(delinquentAccounts)} />
        <KpiCard label="Open collection cases" value={String(collections.filter((c: any) => c.status !== 'resolved').length)} />
        <KpiCard label="Average risk score" value={avgRiskScore} />
        <KpiCard label="High-risk applications" value={String(highRiskCount)} />
        <KpiCard label="Compliance failures" value={String(complianceFailures)} />
      </div>
      <style>{`
        @media (max-width: 980px) {
          div[style*='grid-template-columns: repeat(3'] { grid-template-columns: repeat(2, minmax(220px, 1fr)) !important; }
        }
        @media (max-width: 620px) {
          div[style*='grid-template-columns: repeat(3'] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 14, background: '#fff', padding: 14 }}>
      <p style={{ margin: 0, color: '#64748b', fontWeight: 700, fontSize: '0.86rem' }}>{label}</p>
      <p style={{ margin: '8px 0 0', color: '#0f172a', fontWeight: 900, fontSize: '1.6rem' }}>{value}</p>
    </div>
  )
}
