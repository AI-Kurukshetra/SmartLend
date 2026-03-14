'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAuditEvent, createNotification } from '@/lib/events'
import { logCommunication } from '@/lib/communications'

export async function createSupportTicket(formData: FormData) {
  const orgId = String(formData.get('org_id') || '')
  const subject = String(formData.get('subject') || '').trim()
  const message = String(formData.get('message') || '').trim()
  if (!orgId || !subject || !message) return

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const borrowerRes = await supabase
    .from('borrower_profiles')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()
  if (!borrowerRes.data?.id) return

  const insertRes = await supabase
    .from('support_tickets')
    .insert({
      org_id: orgId,
      borrower_id: borrowerRes.data.id,
      subject,
      message,
      status: 'open',
    })
    .select('id')
    .single()
  if (insertRes.error || !insertRes.data) return

  await createAuditEvent({
    orgId,
    actorType: 'borrower',
    eventType: 'support.ticket_created',
    resourceType: 'support_ticket',
    resourceId: insertRes.data.id,
    payload: { subject },
  })
  await createNotification({
    orgId,
    userId: user.id,
    actorType: 'borrower',
    type: 'support_ticket_created',
    title: 'Support ticket created',
    message: 'Your support request has been submitted to lender operations.',
  })
  await logCommunication({
    orgId,
    borrowerId: borrowerRes.data.id,
    direction: 'inbound',
    channel: 'in_app',
    eventType: 'support_ticket_created',
    subject,
    message,
    status: 'logged',
  })

  revalidatePath('/borrower/support')
  revalidatePath('/dashboard/support')
}
