'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireOrgMembership } from '@/lib/authz'
import { createAuditEvent, createNotification } from '@/lib/events'
import { logCommunication } from '@/lib/communications'

const CASE_STATUS = new Set(['open', 'forbearance', 'payment_plan', 'resolved', 'charged_off'])

export async function createCollectionCase(formData: FormData) {
  const loanAccountId = String(formData.get('loan_account_id') || '')
  const daysPastDue = Number(formData.get('days_past_due') || 0)
  const note = String(formData.get('note') || '').trim()
  if (!loanAccountId) return

  const membership = await requireOrgMembership()
  const supabase = await createClient()

  const accountRes = await supabase
    .from('loan_accounts')
    .select('id')
    .eq('id', loanAccountId)
    .eq('org_id', membership.orgId)
    .limit(1)
    .maybeSingle()
  if (!accountRes.data) return

  const insertRes = await supabase
    .from('collection_cases')
    .insert({
      org_id: membership.orgId,
      loan_account_id: loanAccountId,
      days_past_due: Number.isFinite(daysPastDue) ? Math.max(0, Math.floor(daysPastDue)) : 0,
      note: note || null,
      status: 'open',
    })
    .select('id')
    .single()
  if (insertRes.error || !insertRes.data) return

  await createAuditEvent({
    orgId: membership.orgId,
    actorType: 'lender',
    eventType: 'collections.case_created',
    resourceType: 'collection_case',
    resourceId: insertRes.data.id,
    payload: { loan_account_id: loanAccountId },
  })

  revalidatePath('/dashboard/collections')
}

export async function updateCollectionCase(formData: FormData) {
  const caseId = String(formData.get('case_id') || '')
  const status = String(formData.get('status') || '')
  const note = String(formData.get('note') || '').trim()
  if (!caseId || !CASE_STATUS.has(status)) return

  const membership = await requireOrgMembership()
  const supabase = await createClient()

  const caseRes = await supabase
    .from('collection_cases')
    .select('id,loan_account_id')
    .eq('id', caseId)
    .eq('org_id', membership.orgId)
    .limit(1)
    .maybeSingle()
  if (!caseRes.data) return

  await supabase
    .from('collection_cases')
    .update({
      status,
      note: note || null,
    })
    .eq('id', caseId)
    .eq('org_id', membership.orgId)

  await supabase.from('collection_events').insert({
    org_id: membership.orgId,
    collection_case_id: caseId,
    loan_account_id: caseRes.data.loan_account_id,
    event_type: status === 'forbearance' ? 'forbearance_offer' : status === 'payment_plan' ? 'payment_plan_offer' : 'escalated',
    status: 'completed',
    scheduled_for: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    detail: note || `Collection case moved to ${status}.`,
  })

  const accountRes = await supabase
    .from('loan_accounts')
    .select('borrower_id')
    .eq('id', caseRes.data.loan_account_id)
    .limit(1)
    .maybeSingle()
  if (accountRes.data?.borrower_id) {
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
        type: 'collection_case_updated',
        title: 'Loan support status updated',
        message: note || `Your account support workflow is now ${status.replace('_', ' ')}.`,
      })
    }
    await logCommunication({
      orgId: membership.orgId,
      borrowerId: accountRes.data.borrower_id,
      loanAccountId: caseRes.data.loan_account_id,
      direction: 'outbound',
      channel: 'in_app',
      eventType: 'collection_case_updated',
      subject: 'Collections workflow update',
      message: note || `Your account support workflow is now ${status.replace('_', ' ')}.`,
      status: 'delivered',
    })
  }

  await createAuditEvent({
    orgId: membership.orgId,
    actorType: 'lender',
    eventType: 'collections.case_updated',
    resourceType: 'collection_case',
    resourceId: caseId,
    payload: { status, note },
  })

  revalidatePath('/dashboard/collections')
  revalidatePath('/borrower/payments')
}

export async function runDunningWorkflow() {
  const membership = await requireOrgMembership()
  const supabase = await createClient()

  const today = new Date()
  const accountsRes = await supabase
    .from('loan_accounts')
    .select('id,borrower_id,next_payment_due_date,status')
    .eq('org_id', membership.orgId)
    .in('status', ['active', 'delinquent', 'forbearance'])
    .limit(500)

  let processed = 0
  for (const account of accountsRes.data || []) {
    if (!account.next_payment_due_date) continue
    const dueDate = new Date(account.next_payment_due_date)
    const daysPastDue = Math.floor((today.getTime() - dueDate.getTime()) / 86400000)
    if (daysPastDue <= 0) continue

    const caseRes = await supabase
      .from('collection_cases')
      .select('id,status')
      .eq('org_id', membership.orgId)
      .eq('loan_account_id', account.id)
      .limit(1)
      .maybeSingle()

    let caseId = caseRes.data?.id as string | undefined
    if (!caseId) {
      const createRes = await supabase
        .from('collection_cases')
        .insert({
          org_id: membership.orgId,
          loan_account_id: account.id,
          status: 'open',
          days_past_due: daysPastDue,
          note: 'Auto-created by dunning workflow.',
        })
        .select('id')
        .single()
      caseId = createRes.data?.id as string | undefined
    } else {
      await supabase
        .from('collection_cases')
        .update({ days_past_due: daysPastDue })
        .eq('id', caseId)
    }

    const eventType =
      daysPastDue >= 15 ? 'call_task' :
      daysPastDue >= 5 ? 'reminder_sms' :
      'reminder_email'

    await supabase.from('collection_events').insert({
      org_id: membership.orgId,
      collection_case_id: caseId || null,
      loan_account_id: account.id,
      event_type: eventType,
      status: 'completed',
      scheduled_for: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      detail: `Automated ${eventType.replace('_', ' ')} triggered at ${daysPastDue} days past due.`,
    })

    await supabase.from('loan_accounts').update({ status: 'delinquent' }).eq('id', account.id)

    const borrowerRes = await supabase
      .from('borrower_profiles')
      .select('user_id')
      .eq('id', account.borrower_id)
      .limit(1)
      .maybeSingle()
    if (borrowerRes.data?.user_id) {
      await createNotification({
        orgId: membership.orgId,
        userId: borrowerRes.data.user_id as string,
        actorType: 'system',
        type: 'payment_due_soon',
        title: 'Past due payment',
        message: `Your loan payment is ${daysPastDue} days past due. Please review payment or hardship options.`,
      })
    }
    await logCommunication({
      orgId: membership.orgId,
      borrowerId: account.borrower_id,
      loanAccountId: account.id,
      direction: 'outbound',
      channel: eventType === 'call_task' ? 'phone' : eventType === 'reminder_sms' ? 'sms' : 'email',
      eventType,
      subject: 'Past due payment',
      message: `Automated ${eventType.replace('_', ' ')} triggered at ${daysPastDue} days past due.`,
      status: 'sent',
    })
    processed += 1
  }

  await createAuditEvent({
    orgId: membership.orgId,
    actorType: 'system',
    eventType: 'collections.dunning_ran',
    resourceType: 'collection_case',
    payload: { processed },
  })

  revalidatePath('/dashboard/collections')
  revalidatePath('/dashboard/analytics')
}
