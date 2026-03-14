import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrgId, requirePermission } from '@/lib/authz'
import { updateSupportTicket } from './actions'

export const metadata: Metadata = {
  title: 'Support Inbox',
  description: 'Borrower support requests managed by lender team.',
}

export default async function LenderSupportPage() {
  await requirePermission('communications.manage')
  const supabase = await createClient()
  const orgId = await getCurrentOrgId()
  const ticketsRes = await supabase
    .from('support_tickets')
    .select('id,subject,status,created_at,borrower_id')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(80)

  const tickets = ticketsRes.data || []

  return (
    <div>
      <h1 style={{ margin: 0, fontSize: '1.9rem', fontWeight: 900, color: '#0f172a' }}>Support inbox</h1>
      <p style={{ marginTop: 8, color: '#64748b', lineHeight: 1.7 }}>
        Review and resolve borrower tickets with status-driven workflow.
      </p>
      <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
        {tickets.length === 0 && (
          <div style={{ border: '1px dashed #cbd5e1', borderRadius: 14, background: '#fff', padding: 16, color: '#64748b' }}>
            No support tickets yet.
          </div>
        )}
        {tickets.map((ticket: any) => (
          <div key={ticket.id} style={{ border: '1px solid #e2e8f0', borderRadius: 14, background: '#fff', padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: 0, color: '#0f172a', fontWeight: 800 }}>{ticket.subject}</p>
              <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '0.84rem' }}>
                Ticket #{ticket.id.slice(0, 8)} | Borrower #{ticket.borrower_id.slice(0, 8)}
              </p>
            </div>
            <form action={updateSupportTicket} style={{ display: 'flex', gap: 6 }}>
              <input type="hidden" name="ticket_id" value={ticket.id} />
              <select name="status" defaultValue={ticket.status} style={{ borderRadius: 8, border: '1px solid #cbd5e1', padding: '6px 8px', fontSize: '0.8rem' }}>
                <option value="open">open</option>
                <option value="in_progress">in_progress</option>
                <option value="resolved">resolved</option>
                <option value="closed">closed</option>
              </select>
              <button type="submit" style={{ border: 'none', borderRadius: 8, background: '#0f766e', color: '#fff', padding: '6px 10px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}>
                Update
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  )
}
