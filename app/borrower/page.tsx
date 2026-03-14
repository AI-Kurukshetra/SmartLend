import { createClient } from '@/lib/supabase/server'
import type { CSSProperties } from 'react'

export default async function BorrowerHomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const borrowerRes = user
    ? await supabase
      .from('borrower_profiles')
      .select('id,full_name')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()
    : { data: null as any }

  const borrowerId = borrowerRes.data?.id as string | undefined
  const appsCount = borrowerId
    ? await supabase
      .from('loan_applications')
      .select('id', { count: 'exact', head: true })
      .eq('borrower_id', borrowerId)
    : null

  const accountsCount = borrowerId
    ? await supabase
      .from('loan_accounts')
      .select('id', { count: 'exact', head: true })
      .eq('borrower_id', borrowerId)
    : null

  const [accountsRes, notificationsRes, statementsRes, modificationsRes] = borrowerId
    ? await Promise.all([
      supabase
        .from('loan_accounts')
        .select('id,principal_balance,status,next_payment_due_date,scheduled_payment_amount')
        .eq('borrower_id', borrowerId)
        .limit(10),
      user
        ? supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('read_at', null)
        : Promise.resolve({ count: 0 } as any),
      supabase
        .from('loan_statements')
        .select('id', { count: 'exact', head: true })
        .eq('borrower_id', borrowerId),
      supabase
        .from('loan_modifications')
        .select('id,status,modification_type')
        .eq('borrower_id', borrowerId)
        .order('created_at', { ascending: false })
        .limit(10),
    ])
    : [null, null, null, null]

  const accounts = accountsRes?.data || []
  const openModificationRequests = (modificationsRes?.data || []).filter((item: any) => ['proposed', 'active'].includes(item.status))

  return (
    <div>
      <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 900, color: '#0f172a' }}>
        Welcome{borrowerRes.data?.full_name ? `, ${borrowerRes.data.full_name}` : ''}
      </h1>
      <p style={{ marginTop: 8, color: '#64748b', lineHeight: 1.7 }}>
        Manage your applications, loan documents, and payments from one place.
      </p>
      <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(220px, 1fr))', gap: 12 }}>
        <div style={cardStyle}>
          <p style={labelStyle}>Applications</p>
          <p style={valueStyle}>{appsCount?.count ?? 0}</p>
        </div>
        <div style={cardStyle}>
          <p style={labelStyle}>Active loan accounts</p>
          <p style={valueStyle}>{accountsCount?.count ?? 0}</p>
        </div>
        <div style={cardStyle}>
          <p style={labelStyle}>Unread notifications</p>
          <p style={valueStyle}>{notificationsRes?.count ?? 0}</p>
        </div>
        <div style={cardStyle}>
          <p style={labelStyle}>Statements available</p>
          <p style={valueStyle}>{statementsRes?.count ?? 0}</p>
        </div>
      </div>
      <div style={{ marginTop: 18, display: 'grid', gap: 12 }}>
        {accounts.map((account: any) => (
          <div key={account.id} style={cardStyle}>
            <p style={{ margin: 0, color: '#0f172a', fontWeight: 900 }}>Account #{account.id.slice(0, 8)}</p>
            <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '0.9rem' }}>
              Balance ${Number(account.principal_balance).toLocaleString()} | {account.status} | next due {account.next_payment_due_date || 'n/a'} | scheduled ${Number(account.scheduled_payment_amount || 0).toLocaleString()}
            </p>
          </div>
        ))}
        {openModificationRequests.length > 0 && (
          <div style={cardStyle}>
            <p style={{ margin: 0, color: '#0f172a', fontWeight: 900 }}>Open modification requests</p>
            {(modificationsRes?.data || []).slice(0, 3).map((item: any) => (
              <p key={item.id} style={{ margin: '8px 0 0', color: '#64748b', fontSize: '0.9rem' }}>
                {item.modification_type} | {item.status}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const cardStyle: CSSProperties = {
  border: '1px solid #e2e8f0',
  borderRadius: 16,
  background: '#fff',
  padding: 16,
}

const labelStyle: CSSProperties = {
  margin: 0,
  color: '#64748b',
  fontWeight: 700,
  fontSize: '0.85rem',
}

const valueStyle: CSSProperties = {
  margin: '10px 0 0',
  color: '#0f172a',
  fontWeight: 900,
  fontSize: '1.8rem',
}
