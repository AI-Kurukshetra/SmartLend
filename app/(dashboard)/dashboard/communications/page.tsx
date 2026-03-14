import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrgId, requirePermission } from '@/lib/authz'

export const metadata: Metadata = {
  title: 'Communications',
  description: 'Borrower communication log across in-app, email, SMS, and phone events.',
}

export default async function CommunicationsPage() {
  await requirePermission('communications.manage')
  const supabase = await createClient()
  const orgId = await getCurrentOrgId()

  const eventsRes = await supabase
    .from('communication_events')
    .select('id,borrower_id,application_id,loan_account_id,direction,channel,event_type,subject,message,status,created_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(120)

  const borrowerIds = Array.from(new Set((eventsRes.data || []).map((item: any) => item.borrower_id).filter(Boolean)))
  const borrowersRes = borrowerIds.length > 0
    ? await supabase.from('borrower_profiles').select('id,full_name').in('id', borrowerIds)
    : { data: [] as any[] }
  const borrowerMap = new Map((borrowersRes.data || []).map((row: any) => [row.id, row]))

  return (
    <div>
      <h1 style={{ margin: 0, fontSize: '1.9rem', fontWeight: 900, color: '#0f172a' }}>Communication center</h1>
      <p style={{ marginTop: 8, color: '#64748b', lineHeight: 1.7 }}>
        Central log of borrower communications across support, collections, payment reminders, and operational updates.
      </p>
      <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
        {(eventsRes.data || []).length === 0 && (
          <div style={{ border: '1px dashed #cbd5e1', borderRadius: 14, background: '#fff', padding: 16, color: '#64748b' }}>
            No communications logged yet.
          </div>
        )}
        {(eventsRes.data || []).map((item: any) => (
          <div key={item.id} style={{ border: '1px solid #e2e8f0', borderRadius: 14, background: '#fff', padding: 14, display: 'grid', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <p style={{ margin: 0, fontWeight: 900, color: '#0f172a' }}>{item.subject || item.event_type}</p>
                <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '0.84rem' }}>
                  {borrowerMap.get(item.borrower_id)?.full_name || 'Borrower'} | {item.channel} | {item.direction}
                </p>
              </div>
              <span style={{ color: '#334155', fontWeight: 800 }}>{item.status}</span>
            </div>
            <p style={{ margin: 0, color: '#334155', lineHeight: 1.6 }}>{item.message}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
