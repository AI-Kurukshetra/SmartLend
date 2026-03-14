import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrgId } from '@/lib/authz'
import { fundApplication } from './actions'

export const metadata: Metadata = {
  title: 'Funding',
  description: 'Funding and disbursal workflow scaffolding.',
}

export default async function FundingPage() {
  const supabase = await createClient()
  const orgId = await getCurrentOrgId()
  const approvedRes = await supabase
    .from('loan_applications')
    .select('id,requested_amount,requested_term_months,status,created_at')
    .eq('org_id', orgId)
    .in('status', ['approved', 'funded'])
    .order('created_at', { ascending: false })
    .limit(50)
  const items = approvedRes.data || []

  return (
    <div>
      <h1 style={{ margin: 0, fontSize: '1.9rem', fontWeight: 900, color: '#0f172a' }}>Funding and disbursal</h1>
      <p style={{ marginTop: 8, color: '#64748b', lineHeight: 1.7 }}>
        Manage accepted offers, funding approvals, and account activation.
      </p>
      <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
        {items.length === 0 && (
          <div style={{ border: '1px dashed #cbd5e1', borderRadius: 14, background: '#fff', padding: 16, color: '#64748b' }}>
            No approved applications ready for funding.
          </div>
        )}
        {items.map((item: any) => (
          <div key={item.id} style={{ border: '1px solid #e2e8f0', borderRadius: 14, background: '#fff', padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: 0, color: '#0f172a', fontWeight: 800 }}>
                ${Number(item.requested_amount).toLocaleString()} / {item.requested_term_months} months
              </p>
              <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '0.84rem' }}>Application #{item.id.slice(0, 8)}</p>
            </div>
            <form action={fundApplication}>
              <input type="hidden" name="application_id" value={item.id} />
              <button type="submit" disabled={item.status === 'funded'} style={{ border: 'none', borderRadius: 10, background: item.status === 'funded' ? '#94a3b8' : '#0f766e', color: '#fff', fontWeight: 800, padding: '9px 12px', cursor: item.status === 'funded' ? 'default' : 'pointer' }}>
                {item.status === 'funded' ? 'Already funded' : 'Fund now'}
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  )
}
