import type { Metadata } from 'next'
import type { CSSProperties } from 'react'
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
  const risks = riskRes.data || []
  const lowRiskCount = risks.filter((row: any) => row.band === 'low').length
  const highRiskCount = risks.filter((row: any) => row.band === 'high').length

  return (
    <div>
      <h1 style={{ margin: 0, fontSize: '1.9rem', fontWeight: 900, color: '#0f172a' }}>Reports and analytics</h1>
      <p style={{ marginTop: 8, color: '#64748b', lineHeight: 1.7 }}>
        Core KPI blocks for portfolio growth, risk tracking, and operating throughput.
      </p>
      <form action={generateMonthlyStatements} style={{ marginTop: 14 }}>
        <button type="submit" style={{ border: 'none', borderRadius: 10, background: '#0f766e', color: '#fff', fontWeight: 800, padding: '10px 14px', cursor: 'pointer' }}>
          Refresh monthly statements
        </button>
      </form>
      <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(4, minmax(180px, 1fr))', gap: 10 }}>
        <div style={cardStyle}><p style={labelStyle}>Loan products</p><p style={valueStyle}>{productsCount.count ?? 0}</p></div>
        <div style={cardStyle}><p style={labelStyle}>Applications</p><p style={valueStyle}>{applicationsCount.count ?? 0}</p></div>
        <div style={cardStyle}><p style={labelStyle}>Loan accounts</p><p style={valueStyle}>{accountsCount.count ?? 0}</p></div>
        <div style={cardStyle}><p style={labelStyle}>Collections cases</p><p style={valueStyle}>{collectionsCount.count ?? 0}</p></div>
        <div style={cardStyle}><p style={labelStyle}>Posted payment volume</p><p style={valueStyle}>${postedVolume.toLocaleString()}</p></div>
        <div style={cardStyle}><p style={labelStyle}>Low-risk assessments</p><p style={valueStyle}>{lowRiskCount}</p></div>
        <div style={cardStyle}><p style={labelStyle}>High-risk assessments</p><p style={valueStyle}>{highRiskCount}</p></div>
        <div style={cardStyle}><p style={labelStyle}>Statements generated</p><p style={valueStyle}>{statementsCount.count ?? 0}</p></div>
      </div>
      <style>{`
        @media (max-width: 980px) {
          div[style*='grid-template-columns: repeat(4'] { grid-template-columns: repeat(2, minmax(180px, 1fr)) !important; }
        }
        @media (max-width: 620px) {
          div[style*='grid-template-columns: repeat(4'] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

const cardStyle: CSSProperties = { border: '1px solid #e2e8f0', borderRadius: 14, background: '#fff', padding: 14 }
const labelStyle: CSSProperties = { margin: 0, color: '#64748b', fontWeight: 700, fontSize: '0.85rem' }
const valueStyle: CSSProperties = { margin: '8px 0 0', color: '#0f172a', fontWeight: 900, fontSize: '1.7rem' }
