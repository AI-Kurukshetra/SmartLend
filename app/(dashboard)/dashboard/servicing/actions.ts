'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireOrgMembership } from '@/lib/authz'
import { createAuditEvent, createNotification } from '@/lib/events'

const ACCOUNT_STATUS = new Set(['active', 'delinquent', 'forbearance', 'paid_off', 'charged_off'])
const MODIFICATION_TYPES = new Set(['forbearance', 'payment_plan', 'term_extension', 'apr_change', 'manual_adjustment'])

export async function updateLoanAccountStatus(formData: FormData) {
  const accountId = String(formData.get('loan_account_id') || '')
  const status = String(formData.get('status') || '')
  if (!accountId || !ACCOUNT_STATUS.has(status)) return

  const membership = await requireOrgMembership()
  const supabase = await createClient()
  const accountRes = await supabase
    .from('loan_accounts')
    .select('id,borrower_id,status')
    .eq('id', accountId)
    .eq('org_id', membership.orgId)
    .limit(1)
    .maybeSingle()
  if (!accountRes.data) return

  await supabase
    .from('loan_accounts')
    .update({ status })
    .eq('id', accountId)

  const borrowerUserRes = await supabase
    .from('borrower_profiles')
    .select('user_id')
    .eq('id', accountRes.data.borrower_id)
    .limit(1)
    .maybeSingle()

  if (borrowerUserRes.data?.user_id) {
    await createNotification({
      orgId: membership.orgId,
      userId: borrowerUserRes.data.user_id as string,
      actorType: 'system',
      type: 'account_status_updated',
      title: 'Loan account status updated',
      message: `Your loan account is now ${status.replace('_', ' ')}.`,
    })
  }

  await createAuditEvent({
    orgId: membership.orgId,
    actorType: 'lender',
    eventType: 'servicing.account_status_updated',
    resourceType: 'loan_account',
    resourceId: accountId,
    payload: { from: accountRes.data.status, to: status },
  })

  revalidatePath('/dashboard/servicing')
  revalidatePath('/borrower/payments')
}

export async function addServicingNote(formData: FormData) {
  const accountId = String(formData.get('loan_account_id') || '')
  const note = String(formData.get('note') || '').trim()
  const visibility = String(formData.get('visibility') || 'internal')
  if (!accountId || !note || !['internal', 'borrower'].includes(visibility)) return

  const membership = await requireOrgMembership()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const accountRes = await supabase
    .from('loan_accounts')
    .select('id,borrower_id')
    .eq('id', accountId)
    .eq('org_id', membership.orgId)
    .limit(1)
    .maybeSingle()
  if (!accountRes.data) return

  await supabase.from('servicing_notes').insert({
    org_id: membership.orgId,
    loan_account_id: accountId,
    created_by: user?.id ?? null,
    visibility,
    note,
  })

  if (visibility === 'borrower') {
    const borrowerRes = await supabase
      .from('borrower_profiles')
      .select('user_id')
      .eq('id', accountRes.data.borrower_id)
      .limit(1)
      .maybeSingle()
    if (borrowerRes.data?.user_id) {
      await createNotification({
        orgId: membership.orgId,
        userId: borrowerRes.data.user_id as string,
        actorType: 'lender',
        type: 'servicing_note_posted',
        title: 'Loan account update',
        message: note,
      })
    }
  }

  await createAuditEvent({
    orgId: membership.orgId,
    actorType: 'lender',
    eventType: 'servicing.note_added',
    resourceType: 'loan_account',
    resourceId: accountId,
    payload: { visibility },
  })

  revalidatePath('/dashboard/servicing')
  revalidatePath('/borrower/payments')
}

export async function applyLoanModification(formData: FormData) {
  const accountId = String(formData.get('loan_account_id') || '')
  const modificationType = String(formData.get('modification_type') || '')
  const note = String(formData.get('note') || '').trim()
  const nextDueDate = String(formData.get('next_payment_due_date') || '')
  const scheduledPaymentAmount = Number(formData.get('scheduled_payment_amount') || 0)
  const apr = Number(formData.get('apr') || 0)
  const termMonths = Number(formData.get('term_months') || 0)
  if (!accountId || !MODIFICATION_TYPES.has(modificationType)) return

  const membership = await requireOrgMembership()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const accountRes = await supabase
    .from('loan_accounts')
    .select('id,borrower_id,status,scheduled_payment_amount,apr,term_months,next_payment_due_date')
    .eq('id', accountId)
    .eq('org_id', membership.orgId)
    .limit(1)
    .maybeSingle()
  if (!accountRes.data) return

  const patch: Record<string, unknown> = {}
  if (scheduledPaymentAmount > 0) patch.scheduled_payment_amount = scheduledPaymentAmount
  if (apr > 0) patch.apr = apr
  if (termMonths > 0) patch.term_months = termMonths
  if (nextDueDate) patch.next_payment_due_date = nextDueDate
  if (modificationType === 'forbearance') patch.status = 'forbearance'
  if (modificationType === 'payment_plan' || modificationType === 'term_extension' || modificationType === 'manual_adjustment') {
    patch.status = 'active'
  }

  if (Object.keys(patch).length > 0) {
    await supabase.from('loan_accounts').update(patch).eq('id', accountId)
  }

  const effectiveDate = nextDueDate || accountRes.data.next_payment_due_date || new Date().toISOString().slice(0, 10)
  const futurePaymentsRes = await supabase
    .from('loan_payments')
    .select('id,due_date')
    .eq('loan_account_id', accountId)
    .eq('status', 'scheduled')
    .gte('due_date', effectiveDate)
    .order('due_date', { ascending: true })
    .limit(120)

  if ((scheduledPaymentAmount > 0 || nextDueDate) && (futurePaymentsRes.data || []).length > 0) {
    const dueSeed = nextDueDate ? new Date(nextDueDate) : new Date(futurePaymentsRes.data?.[0]?.due_date || effectiveDate)
    const updates = (futurePaymentsRes.data || []).map((payment: any, index: number) => {
      const due = new Date(dueSeed)
      due.setMonth(due.getMonth() + index)
      return {
        id: payment.id,
        amount: scheduledPaymentAmount > 0 ? scheduledPaymentAmount : undefined,
        due_date: due.toISOString().slice(0, 10),
      }
    })
    for (const update of updates) {
      await supabase.from('loan_payments').update(update).eq('id', update.id)
    }
  }

  await supabase.from('loan_modifications').insert({
    org_id: membership.orgId,
    loan_account_id: accountId,
    created_by: user?.id ?? null,
    modification_type: modificationType,
    status: 'active',
    effective_date: effectiveDate,
    previous_snapshot: {
      status: accountRes.data.status,
      scheduled_payment_amount: accountRes.data.scheduled_payment_amount,
      apr: accountRes.data.apr,
      term_months: accountRes.data.term_months,
      next_payment_due_date: accountRes.data.next_payment_due_date,
    },
    new_terms: {
      ...patch,
      effective_date: effectiveDate,
    },
    note: note || null,
  })

  const borrowerRes = await supabase
    .from('borrower_profiles')
    .select('user_id')
    .eq('id', accountRes.data.borrower_id)
    .limit(1)
    .maybeSingle()
  if (borrowerRes.data?.user_id) {
    await createNotification({
      orgId: membership.orgId,
      userId: borrowerRes.data.user_id as string,
      actorType: 'lender',
      type: 'loan_modified',
      title: 'Loan servicing terms updated',
      message: `${modificationType.replace('_', ' ')} applied to your loan account.`,
    })
  }

  await createAuditEvent({
    orgId: membership.orgId,
    actorType: 'lender',
    eventType: 'servicing.modification_applied',
    resourceType: 'loan_account',
    resourceId: accountId,
    payload: { modification_type: modificationType, note: note || null, patch },
  })

  revalidatePath('/dashboard/servicing')
  revalidatePath('/borrower/payments')
}
