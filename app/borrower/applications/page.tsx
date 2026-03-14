import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { CSSProperties } from 'react'

export default async function BorrowerApplicationsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const borrowerRes = user
    ? await supabase
      .from('borrower_profiles')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()
    : { data: null as any }

  const borrowerId = borrowerRes.data?.id as string | undefined
  const apps = borrowerId
    ? await supabase
      .from('loan_applications')
      .select('id,requested_amount,requested_term_months,status,created_at,loan_purpose,submitted_at,decision_code,underwriting_recommendation,underwriting_summary')
      .eq('borrower_id', borrowerId)
      .order('created_at', { ascending: false })
      .limit(20)
    : { data: [] as any[] }

  return (
    <div>
      <h1 style={h1Style}>Loan applications</h1>
      <p style={pStyle}>Track your submissions and decision status.</p>
      <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
        <Link href="/borrower/applications/new" style={buttonStyle}>Start new application</Link>
      </div>
      <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
        {(apps.data || []).length === 0 && (
          <div style={emptyStyle}>No applications yet.</div>
        )}
        {(apps.data || []).map((app: any) => (
          <div key={app.id} style={rowStyle}>
            <div>
              <p style={{ margin: 0, color: '#0f172a', fontWeight: 800 }}>${Number(app.requested_amount).toLocaleString()} / {app.requested_term_months} months</p>
              <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                Application #{app.id.slice(0, 8)}{app.loan_purpose ? ` | ${app.loan_purpose}` : ''}{app.submitted_at ? ` | submitted ${new Date(app.submitted_at).toLocaleDateString()}` : ' | draft'}
              </p>
              {app.underwriting_summary && (
                <p style={{ margin: '6px 0 0', color: '#475569', fontSize: '0.82rem' }}>
                  {app.underwriting_summary}{app.decision_code ? ` | ${app.decision_code}` : ''}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={badgeStyle}>{app.status}</span>
              {app.underwriting_recommendation && <span style={recommendationStyle}>{app.underwriting_recommendation}</span>}
              <Link href={`/borrower/applications/${app.id}`} style={{ ...buttonStyle, background: '#fff', color: '#0f172a', border: '1px solid #cbd5e1' }}>
                Open
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const h1Style: CSSProperties = { margin: 0, fontSize: '1.8rem', fontWeight: 900, color: '#0f172a' }
const pStyle: CSSProperties = { marginTop: 8, color: '#64748b', lineHeight: 1.7 }
const rowStyle: CSSProperties = { border: '1px solid #e2e8f0', borderRadius: 14, background: '#fff', padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }
const badgeStyle: CSSProperties = { borderRadius: 999, padding: '6px 10px', background: '#eef2ff', color: '#3730a3', fontWeight: 800, fontSize: '0.8rem' }
const buttonStyle: CSSProperties = { textDecoration: 'none', borderRadius: 10, background: '#0f766e', color: '#fff', fontWeight: 800, padding: '10px 14px' }
const emptyStyle: CSSProperties = { border: '1px dashed #cbd5e1', borderRadius: 14, padding: 16, color: '#64748b', background: '#fff' }
const recommendationStyle: CSSProperties = { borderRadius: 999, padding: '6px 10px', background: '#ecfeff', color: '#155e75', fontWeight: 800, fontSize: '0.8rem' }
