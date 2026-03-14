import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrgId } from '@/lib/authz'
import { addServicingNote, applyLoanModification, updateLoanAccountStatus } from './actions'
import { processAchCollections } from './actions-ach'

export const metadata: Metadata = {
  title: 'Servicing',
  description: 'Loan account servicing and status management.',
}

export default async function ServicingPage() {
  const supabase = await createClient()
  const orgId = await getCurrentOrgId()
  const accountsRes = await supabase
    .from('loan_accounts')
    .select('id,application_id,borrower_id,principal_balance,status,created_at,autopay_enabled,scheduled_payment_amount,next_payment_due_date,apr,term_months')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(50)

  const items = accountsRes.data || []

  const borrowerIds = Array.from(new Set(items.map((item: any) => item.borrower_id as string)))
  const accountIds = items.map((item: any) => item.id as string)
  const appIds = items.map((item: any) => item.application_id as string)

  const [borrowersRes, appsRes, paymentsRes, notesRes, modificationsRes] = await Promise.all([
    borrowerIds.length > 0
      ? supabase.from('borrower_profiles').select('id,full_name').in('id', borrowerIds)
      : Promise.resolve({ data: [] as any[] }),
    appIds.length > 0
      ? supabase.from('loan_applications').select('id,requested_amount,status').in('id', appIds)
      : Promise.resolve({ data: [] as any[] }),
    accountIds.length > 0
      ? supabase.from('loan_payments').select('loan_account_id,status,amount,due_date').in('loan_account_id', accountIds).limit(500)
      : Promise.resolve({ data: [] as any[] }),
    accountIds.length > 0
      ? supabase.from('servicing_notes').select('id,loan_account_id,note,visibility,created_at').in('loan_account_id', accountIds).order('created_at', { ascending: false }).limit(200)
      : Promise.resolve({ data: [] as any[] }),
    accountIds.length > 0
      ? supabase.from('loan_modifications').select('id,loan_account_id,modification_type,status,effective_date,note,created_at').in('loan_account_id', accountIds).order('created_at', { ascending: false }).limit(200)
      : Promise.resolve({ data: [] as any[] }),
  ])

  const borrowerMap = new Map((borrowersRes.data || []).map((row: any) => [row.id, row]))
  const appMap = new Map((appsRes.data || []).map((row: any) => [row.id, row]))
  const paymentMap = new Map<string, any[]>()
  const noteMap = new Map<string, any[]>()
  const modificationMap = new Map<string, any[]>()

  for (const payment of paymentsRes.data || []) {
    const current = paymentMap.get(payment.loan_account_id) || []
    current.push(payment)
    paymentMap.set(payment.loan_account_id, current)
  }
  for (const note of notesRes.data || []) {
    const current = noteMap.get(note.loan_account_id) || []
    current.push(note)
    noteMap.set(note.loan_account_id, current)
  }
  for (const modification of modificationsRes.data || []) {
    const current = modificationMap.get(modification.loan_account_id) || []
    current.push(modification)
    modificationMap.set(modification.loan_account_id, current)
  }

  return (
    <div>
      <h1 style={{ margin: 0, fontSize: '1.9rem', fontWeight: 900, color: '#0f172a' }}>Servicing</h1>
      <p style={{ marginTop: 8, color: '#64748b', lineHeight: 1.7 }}>
        Active loan account status, balances, and servicing workflow states.
      </p>
      <form action={processAchCollections} style={{ marginTop: 14 }}>
        <button type="submit" style={{ border: 'none', borderRadius: 10, background: '#0f766e', color: '#fff', fontWeight: 800, padding: '10px 14px', cursor: 'pointer' }}>
          Process due ACH collections
        </button>
      </form>
      <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
        {items.length === 0 && (
          <div style={{ border: '1px dashed #cbd5e1', borderRadius: 14, background: '#fff', padding: 16, color: '#64748b' }}>
            No loan accounts yet.
          </div>
        )}
        {items.map((item: any) => (
          <div key={item.id} style={{ border: '1px solid #e2e8f0', borderRadius: 14, background: '#fff', padding: 14, display: 'grid', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <p style={{ margin: 0, color: '#0f172a', fontWeight: 800 }}>Account #{item.id.slice(0, 8)}</p>
                <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '0.84rem' }}>
                  {borrowerMap.get(item.borrower_id)?.full_name || 'Borrower'} | App #{item.application_id.slice(0, 8)}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ borderRadius: 999, background: '#eef2ff', color: '#3730a3', padding: '6px 10px', fontSize: '0.8rem', fontWeight: 800 }}>{item.status}</span>
                <form action={updateLoanAccountStatus} style={{ display: 'flex', gap: 6 }}>
                  <input type="hidden" name="loan_account_id" value={item.id} />
                  <select name="status" defaultValue={item.status} style={{ borderRadius: 8, border: '1px solid #cbd5e1', padding: '6px 8px', fontSize: '0.8rem' }}>
                    <option value="active">active</option>
                    <option value="delinquent">delinquent</option>
                    <option value="forbearance">forbearance</option>
                    <option value="paid_off">paid_off</option>
                    <option value="charged_off">charged_off</option>
                  </select>
                  <button type="submit" style={{ border: 'none', borderRadius: 8, background: '#0f766e', color: '#fff', padding: '6px 10px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}>
                    Save
                  </button>
                </form>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
              <Metric label="Balance" value={`$${Number(item.principal_balance).toLocaleString()}`} />
              <Metric label="APR / Term" value={`${Number(item.apr || 0).toFixed(2)}% / ${item.term_months || 'n/a'} mo`} />
              <Metric label="Next due" value={item.next_payment_due_date || 'n/a'} />
              <Metric
                label="Payments"
                value={`${(paymentMap.get(item.id) || []).filter((x: any) => x.status === 'posted').length} posted / ${(paymentMap.get(item.id) || []).filter((x: any) => x.status === 'scheduled').length} scheduled`}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 10 }}>
              <form action={applyLoanModification} style={{ border: '1px solid #e2e8f0', borderRadius: 12, background: '#f8fafc', padding: 12, display: 'grid', gap: 8 }}>
                <input type="hidden" name="loan_account_id" value={item.id} />
                <p style={{ margin: 0, color: '#0f172a', fontWeight: 800 }}>Apply modification</p>
                <select name="modification_type" defaultValue="payment_plan" style={{ borderRadius: 8, border: '1px solid #cbd5e1', padding: '8px 10px' }}>
                  <option value="payment_plan">payment_plan</option>
                  <option value="forbearance">forbearance</option>
                  <option value="term_extension">term_extension</option>
                  <option value="apr_change">apr_change</option>
                  <option value="manual_adjustment">manual_adjustment</option>
                </select>
                <input type="date" name="next_payment_due_date" defaultValue={item.next_payment_due_date || ''} style={{ borderRadius: 8, border: '1px solid #cbd5e1', padding: '8px 10px' }} />
                <input type="number" step="0.01" min="0" name="scheduled_payment_amount" defaultValue={item.scheduled_payment_amount || ''} placeholder="Scheduled payment" style={{ borderRadius: 8, border: '1px solid #cbd5e1', padding: '8px 10px' }} />
                <input type="number" step="0.01" min="0" name="apr" defaultValue={item.apr || ''} placeholder="APR" style={{ borderRadius: 8, border: '1px solid #cbd5e1', padding: '8px 10px' }} />
                <input type="number" min="1" name="term_months" defaultValue={item.term_months || ''} placeholder="Term months" style={{ borderRadius: 8, border: '1px solid #cbd5e1', padding: '8px 10px' }} />
                <input name="note" placeholder="Modification note" style={{ borderRadius: 8, border: '1px solid #cbd5e1', padding: '8px 10px' }} />
                <button type="submit" style={{ border: 'none', borderRadius: 8, background: '#0f766e', color: '#fff', padding: '8px 12px', fontWeight: 800, cursor: 'pointer' }}>
                  Apply
                </button>
              </form>
              <form action={addServicingNote} style={{ border: '1px solid #e2e8f0', borderRadius: 12, background: '#f8fafc', padding: 12, display: 'grid', gap: 8 }}>
                <input type="hidden" name="loan_account_id" value={item.id} />
                <p style={{ margin: 0, color: '#0f172a', fontWeight: 800 }}>Add servicing note</p>
                <select name="visibility" defaultValue="internal" style={{ borderRadius: 8, border: '1px solid #cbd5e1', padding: '8px 10px' }}>
                  <option value="internal">internal</option>
                  <option value="borrower">borrower visible</option>
                </select>
                <textarea name="note" placeholder="Account note or borrower update" rows={4} style={{ borderRadius: 8, border: '1px solid #cbd5e1', padding: '8px 10px', resize: 'vertical' }} />
                <button type="submit" style={{ border: 'none', borderRadius: 8, background: '#0f172a', color: '#fff', padding: '8px 12px', fontWeight: 800, cursor: 'pointer' }}>
                  Save note
                </button>
              </form>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, background: '#f8fafc', padding: 12, display: 'grid', gap: 8 }}>
                <p style={{ margin: 0, color: '#0f172a', fontWeight: 800 }}>Recent account activity</p>
                {(modificationMap.get(item.id) || []).slice(0, 2).map((mod: any) => (
                  <div key={mod.id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff', padding: 10 }}>
                    <p style={{ margin: 0, fontWeight: 800, color: '#0f172a' }}>{mod.modification_type}</p>
                    <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.82rem' }}>{mod.effective_date} | {mod.status}</p>
                  </div>
                ))}
                {(noteMap.get(item.id) || []).slice(0, 2).map((note: any) => (
                  <div key={note.id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff', padding: 10 }}>
                    <p style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>{note.note}</p>
                    <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.82rem' }}>{note.visibility} | {new Date(note.created_at).toLocaleDateString()}</p>
                  </div>
                ))}
                {(modificationMap.get(item.id) || []).length === 0 && (noteMap.get(item.id) || []).length === 0 && (
                  <div style={{ color: '#64748b', fontSize: '0.84rem' }}>No servicing activity yet.</div>
                )}
              </div>
            </div>
          </div>
        ))}
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
