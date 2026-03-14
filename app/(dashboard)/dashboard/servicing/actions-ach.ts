'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireOrgMembership } from '@/lib/authz'
import { createAuditEvent, createNotification } from '@/lib/events'

export async function processAchCollections() {
  const membership = await requireOrgMembership()
  const supabase = await createClient()
  const today = new Date().toISOString().slice(0, 10)

  const duePaymentsRes = await supabase
    .from('loan_payments')
    .select('id,loan_account_id,amount,due_date,bank_account_id,loan_accounts!inner(id,borrower_id,org_id,autopay_enabled,autopay_bank_account_id,principal_balance)')
    .eq('org_id', membership.orgId)
    .eq('status', 'scheduled')
    .lte('due_date', today)
    .limit(200)

  const payments = duePaymentsRes.data || []
  for (const payment of payments as any[]) {
    const account = payment.loan_accounts
    if (!account?.autopay_enabled || !account?.autopay_bank_account_id) {
      await supabase.from('loan_payments').update({ status: 'failed', external_reference: 'autopay_not_enabled' }).eq('id', payment.id)
      continue
    }

    const bankRes = await supabase
      .from('borrower_bank_accounts')
      .select('id,verification_status')
      .eq('id', account.autopay_bank_account_id)
      .limit(1)
      .maybeSingle()
    if (!bankRes.data || bankRes.data.verification_status !== 'verified') {
      await supabase.from('loan_payments').update({ status: 'failed', external_reference: 'bank_not_verified' }).eq('id', payment.id)
      continue
    }

    const amount = Number(payment.amount)
    const remaining = Math.max(0, Number(account.principal_balance) - amount)
    await supabase
      .from('loan_payments')
      .update({
        status: 'posted',
        payment_method: 'ach',
        bank_account_id: account.autopay_bank_account_id,
        posted_at: new Date().toISOString(),
        external_reference: `ach_${payment.id}`,
        principal_component: amount,
      })
      .eq('id', payment.id)

    const nextScheduledRes = await supabase
      .from('loan_payments')
      .select('due_date')
      .eq('loan_account_id', payment.loan_account_id)
      .eq('status', 'scheduled')
      .gt('due_date', payment.due_date)
      .order('due_date', { ascending: true })
      .limit(1)
      .maybeSingle()

    await supabase
      .from('loan_accounts')
      .update({
        principal_balance: remaining,
        status: remaining === 0 ? 'paid_off' : 'active',
        next_payment_due_date: nextScheduledRes.data?.due_date ?? null,
      })
      .eq('id', payment.loan_account_id)

    const borrowerUserRes = await supabase
      .from('borrower_profiles')
      .select('user_id')
      .eq('id', account.borrower_id)
      .limit(1)
      .maybeSingle()
    if (borrowerUserRes.data?.user_id) {
      await createNotification({
        orgId: membership.orgId,
        userId: borrowerUserRes.data.user_id as string,
        actorType: 'system',
        type: 'ach_payment_posted',
        title: 'ACH payment collected',
        message: `Automatic ACH payment of $${amount.toFixed(2)} was collected successfully.`,
      })
    }

    await createAuditEvent({
      orgId: membership.orgId,
      actorType: 'lender',
      eventType: 'payment.ach_collected',
      resourceType: 'loan_payment',
      resourceId: payment.id,
      payload: { loan_account_id: payment.loan_account_id, amount },
    })
  }

  revalidatePath('/dashboard/servicing')
  revalidatePath('/dashboard/wallet')
  revalidatePath('/borrower/payments')
}
