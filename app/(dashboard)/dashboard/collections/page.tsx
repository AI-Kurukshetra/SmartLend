import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrgId, requirePermission } from '@/lib/authz'
import { createCollectionCase, runDunningWorkflow, updateCollectionCase } from './actions'

export const metadata: Metadata = {
  title: 'Collections',
  description: 'Delinquency and collections case management.',
}

export default async function CollectionsPage() {
  await requirePermission('collections.manage')
  const supabase = await createClient()
  const orgId = await getCurrentOrgId()
  const accountsRes = await supabase
    .from('loan_accounts')
    .select('id,status')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(100)

  const casesRes = await supabase
    .from('collection_cases')
    .select('id,status,days_past_due,note,created_at,loan_account_id')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(50)

  const caseIds = (casesRes.data || []).map((item: any) => item.id as string)
  const eventsRes = caseIds.length > 0
    ? await supabase
      .from('collection_events')
      .select('id,collection_case_id,event_type,status,detail,created_at')
      .in('collection_case_id', caseIds)
      .order('created_at', { ascending: false })
      .limit(200)
    : { data: [] as any[] }

  const accounts = accountsRes.data || []
  const items = casesRes.data || []
  const eventMap = new Map<string, any[]>()
  for (const event of eventsRes.data || []) {
    const current = eventMap.get(event.collection_case_id) || []
    current.push(event)
    eventMap.set(event.collection_case_id, current)
  }

  return (
    <div>
      <h1 style={{ margin: 0, fontSize: '1.9rem', fontWeight: 900, color: '#0f172a' }}>Collections</h1>
      <p style={{ marginTop: 8, color: '#64748b', lineHeight: 1.7 }}>
        Delinquency tracking and borrower hardship resolution workflow.
      </p>
      <form action={runDunningWorkflow} style={{ marginTop: 14 }}>
        <button type="submit" style={{ border: 'none', borderRadius: 10, background: '#0f172a', color: '#fff', fontWeight: 800, padding: '10px 14px', cursor: 'pointer' }}>
          Run automated dunning workflow
        </button>
      </form>
      <form action={createCollectionCase} style={{ marginTop: 14, border: '1px solid #e2e8f0', borderRadius: 14, background: '#fff', padding: 14, display: 'grid', gap: 8 }}>
        <p style={{ margin: 0, color: '#0f172a', fontWeight: 800 }}>Open new collection case</p>
        <select name="loan_account_id" required style={{ borderRadius: 10, border: '1.5px solid #e2e8f0', padding: '10px 12px' }}>
          <option value="">Select loan account</option>
          {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.id.slice(0, 8)} ({a.status})</option>)}
        </select>
        <input type="number" name="days_past_due" min={0} placeholder="Days past due" style={{ borderRadius: 10, border: '1.5px solid #e2e8f0', padding: '10px 12px' }} />
        <input name="note" placeholder="Initial notes" style={{ borderRadius: 10, border: '1.5px solid #e2e8f0', padding: '10px 12px' }} />
        <button type="submit" style={{ border: 'none', borderRadius: 10, background: '#0f766e', color: '#fff', fontWeight: 800, padding: '10px 12px', cursor: 'pointer' }}>Create case</button>
      </form>

      <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
        {items.length === 0 && (
          <div style={{ border: '1px dashed #cbd5e1', borderRadius: 14, background: '#fff', padding: 16, color: '#64748b' }}>
            No collection cases yet.
          </div>
        )}
        {items.map((item: any) => (
          <div key={item.id} style={{ border: '1px solid #e2e8f0', borderRadius: 14, background: '#fff', padding: 14, display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: 0, color: '#0f172a', fontWeight: 800 }}>Case #{item.id.slice(0, 8)}</p>
              <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '0.84rem' }}>
                {item.days_past_due} days past due | Account #{item.loan_account_id.slice(0, 8)}
              </p>
            </div>
            <form action={updateCollectionCase} style={{ display: 'flex', gap: 6 }}>
              <input type="hidden" name="case_id" value={item.id} />
              <select name="status" defaultValue={item.status} style={{ borderRadius: 8, border: '1px solid #cbd5e1', padding: '6px 8px', fontSize: '0.8rem' }}>
                <option value="open">open</option>
                <option value="forbearance">forbearance</option>
                <option value="payment_plan">payment_plan</option>
                <option value="resolved">resolved</option>
                <option value="charged_off">charged_off</option>
              </select>
              <input name="note" defaultValue={item.note || ''} placeholder="Note" style={{ borderRadius: 8, border: '1px solid #cbd5e1', padding: '6px 8px', fontSize: '0.8rem' }} />
              <button type="submit" style={{ border: 'none', borderRadius: 8, background: '#0f766e', color: '#fff', padding: '6px 10px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}>
                Save
              </button>
            </form>
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {(eventMap.get(item.id) || []).slice(0, 3).map((event: any) => (
                <div key={event.id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, background: '#f8fafc', padding: 10 }}>
                  <p style={{ margin: 0, color: '#0f172a', fontWeight: 800 }}>{event.event_type}</p>
                  <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.84rem' }}>{event.detail || event.status}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
