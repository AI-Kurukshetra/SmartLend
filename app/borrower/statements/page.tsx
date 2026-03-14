import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function BorrowerStatementsPage() {
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

  const statementsRes = borrowerRes.data?.id
    ? await supabase
      .from('loan_statements')
      .select('id,loan_account_id,statement_period_start,statement_period_end,due_date,opening_balance,closing_balance,amount_due,status,statement_data')
      .eq('borrower_id', borrowerRes.data.id)
      .order('created_at', { ascending: false })
      .limit(50)
    : { data: [] as any[] }

  const statements = statementsRes.data || []

  return (
    <div>
      <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900, color: '#0f172a' }}>Statements</h1>
      <p style={{ marginTop: 8, color: '#64748b', lineHeight: 1.7 }}>
        Download monthly account statements, due amounts, and payment activity snapshots.
      </p>
      <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
        {statements.length === 0 && (
          <div style={{ border: '1px dashed #cbd5e1', borderRadius: 14, background: '#fff', padding: 16, color: '#64748b' }}>
            No statements generated yet.
          </div>
        )}
        {statements.map((statement: any) => (
          <div key={statement.id} style={{ border: '1px solid #e2e8f0', borderRadius: 14, background: '#fff', padding: 14, display: 'grid', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <p style={{ margin: 0, color: '#0f172a', fontWeight: 900 }}>Account #{statement.loan_account_id.slice(0, 8)}</p>
                <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '0.84rem' }}>
                  {statement.statement_period_start} to {statement.statement_period_end}
                </p>
              </div>
              <span style={{ color: '#334155', fontWeight: 800 }}>{statement.status}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
              <Metric label="Opening balance" value={`$${Number(statement.opening_balance).toLocaleString()}`} />
              <Metric label="Closing balance" value={`$${Number(statement.closing_balance).toLocaleString()}`} />
              <Metric label="Amount due" value={`$${Number(statement.amount_due).toLocaleString()}`} />
            </div>
            <details>
              <summary style={{ cursor: 'pointer', fontWeight: 800, color: '#0f766e' }}>View statement detail</summary>
              <pre style={{ marginTop: 10, whiteSpace: 'pre-wrap', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, fontSize: '0.82rem', color: '#334155' }}>
                {JSON.stringify(statement.statement_data, null, 2)}
              </pre>
            </details>
          </div>
        ))}
      </div>
      <p style={{ marginTop: 16 }}>
        <Link href="/borrower/payments" style={{ color: '#0f766e', textDecoration: 'none', fontWeight: 800 }}>
          Go to payments
        </Link>
      </p>
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
