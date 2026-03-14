import { createClient } from '@/lib/supabase/server'
import { createSupportTicket } from './actions'

export default async function BorrowerSupportPage() {
  return (
    <div>
      <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900, color: '#0f172a' }}>Support</h1>
      <p style={{ marginTop: 8, color: '#64748b', lineHeight: 1.7 }}>
        Borrower support channels and communication preferences.
      </p>
      <BorrowerSupportContent />
    </div>
  )
}

async function BorrowerSupportContent() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const borrowerRes = await supabase
    .from('borrower_profiles')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()
  const borrowerId = borrowerRes.data?.id as string | undefined

  const invitesRes = await supabase
    .from('org_invites')
    .select('org_id')
    .eq('role', 'borrower')
    .eq('accepted_by', user.id)
    .not('accepted_at', 'is', null)
    .limit(100)
  const orgIds = Array.from(new Set((invitesRes.data || []).map((x: any) => x.org_id as string)))

  let orgs: Array<{ id: string; name: string }> = []
  if (orgIds.length > 0) {
    const orgsRes = await supabase
      .from('organizations')
      .select('id,name')
      .in('id', orgIds)
      .limit(100)
    orgs = (orgsRes.data || []).map((o: any) => ({ id: o.id as string, name: o.name as string }))
  }

  const ticketsRes = borrowerId
    ? await supabase
      .from('support_tickets')
      .select('id,subject,status,created_at')
      .eq('borrower_id', borrowerId)
      .order('created_at', { ascending: false })
      .limit(50)
    : { data: [] as any[] }

  const communicationsRes = borrowerId
    ? await supabase
      .from('communication_events')
      .select('id,channel,event_type,subject,message,status,created_at')
      .eq('borrower_id', borrowerId)
      .order('created_at', { ascending: false })
      .limit(30)
    : { data: [] as any[] }

  return (
    <>
      <form action={createSupportTicket} style={{ marginTop: 16, border: '1px solid #e2e8f0', borderRadius: 14, background: '#fff', padding: 16, display: 'grid', gap: 8, maxWidth: 660 }}>
        <p style={{ margin: 0, color: '#0f172a', fontWeight: 800 }}>Open support ticket</p>
        {orgs.length > 1 ? (
          <select required name="org_id" style={{ borderRadius: 10, border: '1.5px solid #e2e8f0', padding: '10px 12px' }}>
            <option value="">Select lender organization</option>
            {orgs.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}
          </select>
        ) : (
          <>
            <input type="hidden" name="org_id" value={orgs[0]?.id || ''} />
            <div style={{ borderRadius: 10, border: '1.5px solid #e2e8f0', padding: '10px 12px', background: '#f8fafc', color: '#0f172a' }}>
              {orgs[0]?.name || 'No lender organization available'}
            </div>
          </>
        )}
        <input required name="subject" placeholder="Subject" style={{ borderRadius: 10, border: '1.5px solid #e2e8f0', padding: '10px 12px' }} />
        <textarea required name="message" placeholder="Describe your issue" style={{ borderRadius: 10, border: '1.5px solid #e2e8f0', padding: '10px 12px', minHeight: 110 }} />
        <button type="submit" style={{ border: 'none', borderRadius: 10, background: '#0f766e', color: '#fff', fontWeight: 800, padding: '10px 12px', cursor: 'pointer' }}>Submit ticket</button>
      </form>
      <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
        {(ticketsRes.data || []).length === 0 && (
          <div style={{ border: '1px dashed #cbd5e1', borderRadius: 14, background: '#fff', padding: 16, color: '#64748b' }}>
            No support tickets yet.
          </div>
        )}
        {(ticketsRes.data || []).map((ticket: any) => (
          <div key={ticket.id} style={{ border: '1px solid #e2e8f0', borderRadius: 14, background: '#fff', padding: 14, display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <p style={{ margin: 0, color: '#0f172a', fontWeight: 800 }}>{ticket.subject}</p>
              <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '0.84rem' }}>Ticket #{ticket.id.slice(0, 8)}</p>
            </div>
            <span style={{ borderRadius: 999, padding: '6px 10px', background: '#eef2ff', color: '#3730a3', fontWeight: 800, fontSize: '0.8rem' }}>{ticket.status}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>Communication history</h2>
        {(communicationsRes.data || []).length === 0 && (
          <div style={{ border: '1px dashed #cbd5e1', borderRadius: 14, background: '#fff', padding: 16, color: '#64748b' }}>
            No communications yet.
          </div>
        )}
        {(communicationsRes.data || []).map((item: any) => (
          <div key={item.id} style={{ border: '1px solid #e2e8f0', borderRadius: 14, background: '#fff', padding: 14 }}>
            <p style={{ margin: 0, color: '#0f172a', fontWeight: 800 }}>{item.subject || item.event_type}</p>
            <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '0.84rem' }}>{item.channel} | {item.status}</p>
            <p style={{ margin: '8px 0 0', color: '#334155', lineHeight: 1.6 }}>{item.message}</p>
          </div>
        ))}
      </div>
    </>
  )
}
