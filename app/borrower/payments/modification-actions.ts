'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAuditEvent, createNotification } from '@/lib/events'

const ALLOWED_TYPES = new Set(['forbearance', 'payment_plan', 'term_extension'])

export async function requestLoanModification(formData: FormData) {
  const loanAccountId = String(formData.get('loan_account_id') || '')
  const modificationType = String(formData.get('modification_type') || '')
  const note = String(formData.get('note') || '').trim()
  if (!loanAccountId || !ALLOWED_TYPES.has(modificationType) || !note) return

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

  const accountRes = await supabase
    .from('loan_accounts')
    .select('id,org_id,borrower_id')
    .eq('id', loanAccountId)
    .eq('borrower_id', borrowerRes.data.id)
    .limit(1)
    .maybeSingle()
  if (!accountRes.data) return

  await supabase.from('loan_modifications').insert({
    org_id: accountRes.data.org_id,
    loan_account_id: loanAccountId,
    borrower_id: borrowerRes.data.id,
    modification_type: modificationType,
    status: 'proposed',
    effective_date: new Date().toISOString().slice(0, 10),
    previous_snapshot: {},
    new_terms: {},
    note,
  })

  const membersRes = await supabase
    .from('org_members')
    .select('user_id')
    .eq('org_id', accountRes.data.org_id)
    .eq('status', 'active')
    .limit(20)
  for (const member of membersRes.data || []) {
    if (!member.user_id) continue
    await createNotification({
      orgId: accountRes.data.org_id,
      userId: member.user_id as string,
      actorType: 'borrower',
      type: 'modification_requested',
      title: 'Borrower modification request',
      message: `${modificationType.replace('_', ' ')} requested on account ${loanAccountId.slice(0, 8)}.`,
    })
  }

  await createAuditEvent({
    orgId: accountRes.data.org_id,
    actorType: 'borrower',
    eventType: 'borrower.modification_requested',
    resourceType: 'loan_account',
    resourceId: loanAccountId,
    payload: { modification_type: modificationType },
  })

  revalidatePath('/borrower/payments')
  revalidatePath('/dashboard/servicing')
}
