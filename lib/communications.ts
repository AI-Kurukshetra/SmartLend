import { createClient } from '@/lib/supabase/server'

export async function logCommunication(input: {
  orgId: string
  borrowerId?: string | null
  applicationId?: string | null
  loanAccountId?: string | null
  direction: 'outbound' | 'inbound'
  channel: 'email' | 'sms' | 'phone' | 'in_app'
  eventType: string
  subject?: string | null
  message: string
  status?: 'queued' | 'sent' | 'delivered' | 'logged' | 'failed'
  externalReference?: string | null
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  await supabase.from('communication_events').insert({
    org_id: input.orgId,
    borrower_id: input.borrowerId ?? null,
    application_id: input.applicationId ?? null,
    loan_account_id: input.loanAccountId ?? null,
    direction: input.direction,
    channel: input.channel,
    event_type: input.eventType,
    subject: input.subject ?? null,
    message: input.message,
    status: input.status ?? 'logged',
    created_by: user?.id ?? null,
    external_reference: input.externalReference ?? null,
  })
}
