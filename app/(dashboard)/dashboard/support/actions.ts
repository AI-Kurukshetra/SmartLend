'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireOrgMembership } from '@/lib/authz'
import { createAuditEvent, createNotification } from '@/lib/events'
import { logCommunication } from '@/lib/communications'

const STATUS = new Set(['open', 'in_progress', 'resolved', 'closed'])

export async function updateSupportTicket(formData: FormData) {
  const ticketId = String(formData.get('ticket_id') || '')
  const status = String(formData.get('status') || '')
  if (!ticketId || !STATUS.has(status)) return

  const membership = await requireOrgMembership()
  const supabase = await createClient()

  const ticketRes = await supabase
    .from('support_tickets')
    .select('id,borrower_id,status')
    .eq('id', ticketId)
    .eq('org_id', membership.orgId)
    .limit(1)
    .maybeSingle()
  if (!ticketRes.data) return

  await supabase
    .from('support_tickets')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', ticketId)

  const borrowerUserRes = await supabase
    .from('borrower_profiles')
    .select('user_id')
    .eq('id', ticketRes.data.borrower_id)
    .limit(1)
    .maybeSingle()
  if (borrowerUserRes.data?.user_id) {
    await createNotification({
      orgId: membership.orgId,
      userId: borrowerUserRes.data.user_id as string,
      actorType: 'system',
      type: 'support_ticket_updated',
      title: 'Support ticket updated',
      message: `Ticket status changed to ${status.replace('_', ' ')}.`,
    })
  }
  await logCommunication({
    orgId: membership.orgId,
    borrowerId: ticketRes.data.borrower_id,
    direction: 'outbound',
    channel: 'in_app',
    eventType: 'support_ticket_updated',
    subject: 'Support ticket update',
    message: `Ticket status changed to ${status.replace('_', ' ')}.`,
    status: 'delivered',
  })

  await createAuditEvent({
    orgId: membership.orgId,
    actorType: 'lender',
    eventType: 'support.ticket_updated',
    resourceType: 'support_ticket',
    resourceId: ticketId,
    payload: { from: ticketRes.data.status, to: status },
  })

  revalidatePath('/dashboard/support')
  revalidatePath('/borrower/support')
}
