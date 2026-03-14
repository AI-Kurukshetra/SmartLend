'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAuditEvent, createNotification } from '@/lib/events'

export async function makePayment(formData: FormData) {
  const loanAccountId = String(formData.get('loan_account_id') || '')
  const amount = Number(formData.get('amount') || 0)
  if (!loanAccountId || !Number.isFinite(amount) || amount <= 0) return

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
    .select('id,org_id,principal_balance')
    .eq('id', loanAccountId)
    .eq('borrower_id', borrowerRes.data.id)
    .limit(1)
    .maybeSingle()
  if (!accountRes.data) return

  await supabase.from('loan_payments').insert({
    org_id: accountRes.data.org_id,
    loan_account_id: loanAccountId,
    amount,
    principal_component: amount,
    interest_component: 0,
    fee_component: 0,
    status: 'posted',
    payment_method: 'manual',
    posted_at: new Date().toISOString(),
  })

  const newBalance = Math.max(0, Number(accountRes.data.principal_balance) - amount)
  await supabase
    .from('loan_accounts')
    .update({ principal_balance: newBalance, status: newBalance === 0 ? 'paid_off' : 'active' })
    .eq('id', loanAccountId)

  await createAuditEvent({
    orgId: accountRes.data.org_id as string,
    actorType: 'borrower',
    eventType: 'payment.posted',
    resourceType: 'loan_account',
    resourceId: loanAccountId,
    payload: { amount },
  })
  await createNotification({
    orgId: accountRes.data.org_id as string,
    userId: user.id,
    actorType: 'borrower',
    type: 'payment_posted',
    title: 'Payment posted',
    message: `Payment of $${amount.toFixed(2)} posted successfully.`,
  })

  revalidatePath('/borrower/payments')
  revalidatePath('/dashboard/servicing')
}
