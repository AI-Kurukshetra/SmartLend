import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrgId } from '@/lib/authz'
import { updateApplicationStatus } from './actions'

export const metadata: Metadata = {
  title: 'Applications Queue',
  description: 'Lender application queue with status and decision readiness.',
}

export default async function LenderApplicationsPage() {
  const supabase = await createClient()
  const orgId = await getCurrentOrgId()
  const applicationsRes = await supabase
    .from('loan_applications')
    .select('id,requested_amount,requested_term_months,status,decision_code,created_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(50)

  const items = applicationsRes.data || []

  return (
    <div>
      <h1 style={{ margin: 0, fontSize: '1.9rem', fontWeight: 900, color: '#0f172a' }}>Applications queue</h1>
      <p style={{ marginTop: 8, color: '#64748b', lineHeight: 1.7 }}>
        Incoming borrower applications ready for review and decisioning.
      </p>
      <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
        {items.length === 0 && (
          <div style={{ border: '1px dashed #cbd5e1', borderRadius: 14, background: '#fff', padding: 16, color: '#64748b' }}>
            No applications submitted yet.
          </div>
        )}
        {items.map((item: any) => (
          <div key={item.id} style={{ border: '1px solid #e2e8f0', borderRadius: 14, background: '#fff', padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: 0, color: '#0f172a', fontWeight: 800 }}>${Number(item.requested_amount).toLocaleString()} / {item.requested_term_months} months</p>
              <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '0.84rem' }}>
                #{item.id.slice(0, 8)} {item.decision_code ? `| ${item.decision_code}` : ''}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ borderRadius: 999, background: '#f8fafc', color: '#334155', padding: '6px 10px', fontSize: '0.8rem', fontWeight: 800 }}>{item.status}</span>
              <form action={updateApplicationStatus} style={{ display: 'flex', gap: 6 }}>
                <input type="hidden" name="application_id" value={item.id} />
                <select name="status" defaultValue={item.status} style={{ borderRadius: 8, border: '1px solid #cbd5e1', padding: '6px 8px', fontSize: '0.8rem' }}>
                  <option value="under_review">under_review</option>
                  <option value="approved">approved</option>
                  <option value="declined">declined</option>
                  <option value="funded">funded</option>
                </select>
                <input name="decision_code" placeholder="Code" style={{ width: 80, borderRadius: 8, border: '1px solid #cbd5e1', padding: '6px 8px', fontSize: '0.8rem' }} />
                <button type="submit" style={{ border: 'none', borderRadius: 8, background: '#0f766e', color: '#fff', padding: '6px 10px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}>
                  Update
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
