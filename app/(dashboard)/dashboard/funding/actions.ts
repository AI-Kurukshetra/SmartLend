'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireOrgMembership } from '@/lib/authz'
import { createAuditEvent, createNotification } from '@/lib/events'
import { addMonths, calculateMonthlyPayment } from '@/lib/payments'
import { calculateOfferPricing } from '@/lib/pricing'
import { advanceApplicationStage } from '@/lib/workflows'

export async function fundApplication(formData: FormData) {
  const applicationId = String(formData.get('application_id') || '')
  if (!applicationId) return

  const membership = await requireOrgMembership()
  const supabase = await createClient()

  const appRes = await supabase
    .from('loan_applications')
    .select('id,org_id,borrower_id,requested_amount,requested_term_months,status,loan_product_id')
    .eq('id', applicationId)
    .eq('org_id', membership.orgId)
    .limit(1)
    .maybeSingle()
  if (!appRes.data) return
  if (!['approved', 'funded'].includes(appRes.data.status)) return

  if (appRes.data.status !== 'funded') {
    await supabase
      .from('loan_applications')
      .update({ status: 'funded', updated_at: new Date().toISOString() })
      .eq('id', appRes.data.id)
  }

  const accountRes = await supabase
    .from('loan_accounts')
    .select('id')
    .eq('application_id', appRes.data.id)
    .limit(1)
    .maybeSingle()

  let loanAccountId = accountRes.data?.id as string | undefined
  if (!loanAccountId) {
    let apr = 0
    const pricing = await calculateOfferPricing(appRes.data.id)
    if (!('error' in pricing)) apr = pricing.apr
    const monthlyPayment = calculateMonthlyPayment(
      Number(appRes.data.requested_amount),
      apr,
      Number(appRes.data.requested_term_months),
    )
    const firstDueDate = addMonths(new Date(), 1)
    const createAccountRes = await supabase
      .from('loan_accounts')
      .insert({
        org_id: membership.orgId,
        application_id: appRes.data.id,
        borrower_id: appRes.data.borrower_id,
        principal_balance: Number(appRes.data.requested_amount),
        status: 'active',
        funded_at: new Date().toISOString(),
        scheduled_payment_amount: Number(monthlyPayment.toFixed(2)),
        apr,
        term_months: Number(appRes.data.requested_term_months),
        next_payment_due_date: firstDueDate.toISOString().slice(0, 10),
      })
      .select('id')
      .single()
    if (createAccountRes.error || !createAccountRes.data) return
    loanAccountId = createAccountRes.data.id as string

    const scheduledPayments = Array.from({ length: Number(appRes.data.requested_term_months) }, (_, index) => ({
      org_id: membership.orgId,
      loan_account_id: loanAccountId,
      amount: Number(monthlyPayment.toFixed(2)),
      principal_component: 0,
      interest_component: 0,
      fee_component: 0,
      status: 'scheduled',
      payment_method: 'ach',
      due_date: addMonths(firstDueDate, index).toISOString().slice(0, 10),
    }))
    if (scheduledPayments.length > 0) {
      await supabase.from('loan_payments').insert(scheduledPayments)
    }
  }

  const borrowerUserRes = await supabase
    .from('borrower_profiles')
    .select('user_id')
    .eq('id', appRes.data.borrower_id)
    .limit(1)
    .maybeSingle()

  if (borrowerUserRes.data?.user_id) {
    await createNotification({
      orgId: membership.orgId,
      userId: borrowerUserRes.data.user_id as string,
      actorType: 'system',
      type: 'loan_funded',
      title: 'Loan funded',
      message: 'Your approved loan has been funded and account servicing is now active.',
    })
  }

  await createAuditEvent({
    orgId: membership.orgId,
    actorType: 'lender',
    eventType: 'loan.funded',
    resourceType: 'loan_account',
    resourceId: loanAccountId,
    payload: { application_id: appRes.data.id },
  })

  await advanceApplicationStage(appRes.data.id, 'servicing')

  revalidatePath('/dashboard/funding')
  revalidatePath('/dashboard/servicing')
  revalidatePath('/borrower/payments')
}
