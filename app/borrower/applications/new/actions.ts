'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { createAuditEvent, createNotification } from '@/lib/events'

export async function submitBorrowerApplication(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' as const }

  const amount = Number(formData.get('amount') || 0)
  const term = Number(formData.get('term_months') || 0)
  const orgId = (formData.get('org_id') as string) || ''
  const productId = (formData.get('loan_product_id') as string) || ''

  if (!orgId) return { error: 'No lender organization selected.' as const }
  if (!Number.isFinite(amount) || amount <= 0) return { error: 'Enter a valid amount.' as const }
  if (!Number.isFinite(term) || term <= 0) return { error: 'Enter a valid term.' as const }

  const borrowerRes = await supabase
    .from('borrower_profiles')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()
  if (!borrowerRes.data?.id) return { error: 'Borrower profile not found.' as const }

  const inviteAccess = await supabase
    .from('org_invites')
    .select('id')
    .eq('org_id', orgId)
    .eq('role', 'borrower')
    .eq('accepted_by', user.id)
    .limit(1)
    .maybeSingle()
  if (!inviteAccess.data?.id) {
    return { error: 'You do not have borrower access for this lender organization.' as const }
  }

  const insertRes = await supabase.from('loan_applications').insert({
    org_id: orgId,
    borrower_id: borrowerRes.data.id,
    loan_product_id: productId || null,
    requested_amount: amount,
    requested_term_months: term,
    status: 'draft',
    current_stage: 'application_submitted',
    workflow_history: [{
      from: null,
      to: 'application_submitted',
      changed_at: new Date().toISOString(),
      actor: 'borrower',
    }],
  }).select('id').single()
  if (insertRes.error) return { error: insertRes.error.message }

  await createAuditEvent({
    orgId,
    actorType: 'borrower',
    eventType: 'application.created',
    resourceType: 'loan_application',
    resourceId: insertRes.data.id,
    payload: { requested_amount: amount, requested_term_months: term, loan_product_id: productId || null },
  })
  await createNotification({
    orgId,
    userId: user.id,
    actorType: 'borrower',
    type: 'application_created',
    title: 'Application draft created',
    message: 'Your application draft is ready. Complete borrower details, upload documents, and sign the agreement.',
  })

  redirect(`/borrower/applications/${insertRes.data.id}`)
}
