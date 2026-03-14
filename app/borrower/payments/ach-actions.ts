'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAuditEvent, createNotification } from '@/lib/events'

async function getBorrowerContext() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, borrower: null }
  const borrowerRes = await supabase
    .from('borrower_profiles')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()
  return { supabase, user, borrower: borrowerRes.data ?? null }
}

function generateMicroDepositPair() {
  const first = Number((Math.random() * 0.8 + 0.11).toFixed(2))
  let second = Number((Math.random() * 0.8 + 0.12).toFixed(2))
  if (first === second) second = Number((second + 0.01).toFixed(2))
  return [first, second]
}

export async function addBorrowerBankAccount(formData: FormData) {
  const bankName = String(formData.get('bank_name') || '').trim()
  const accountHolderName = String(formData.get('account_holder_name') || '').trim()
  const routingNumber = String(formData.get('routing_number') || '').trim()
  const accountNumber = String(formData.get('account_number') || '').trim()
  const orgId = String(formData.get('org_id') || '').trim()
  if (!bankName || !accountHolderName || routingNumber.length < 4 || accountNumber.length < 4 || !orgId) return

  const { supabase, user, borrower } = await getBorrowerContext()
  if (!user || !borrower?.id) return

  await supabase
    .from('borrower_bank_accounts')
    .insert({
      org_id: orgId,
      borrower_id: borrower.id,
      bank_name: bankName,
      account_holder_name: accountHolderName,
      routing_number_last4: routingNumber.slice(-4),
      account_number_last4: accountNumber.slice(-4),
      verification_status: 'pending',
      verification_method: 'micro_deposits',
      verification_provider: 'smartlend_micro_deposits',
      is_default: true,
    })

  await createAuditEvent({
    orgId,
    actorType: 'borrower',
    eventType: 'bank_account.added',
    resourceType: 'borrower_bank_account',
    payload: { bank_name: bankName },
  })
  await createNotification({
    orgId,
    userId: user.id,
    actorType: 'borrower',
    type: 'bank_account_added',
    title: 'Bank account added',
    message: 'Your ACH bank account was added and is pending verification.',
  })

  revalidatePath('/borrower/payments')
}

export async function verifyBorrowerBankAccount(formData: FormData) {
  const bankAccountId = String(formData.get('bank_account_id') || '')
  const mode = String(formData.get('mode') || 'instant')
  const amount1 = Number(formData.get('amount_1') || 0)
  const amount2 = Number(formData.get('amount_2') || 0)
  if (!bankAccountId) return

  const { supabase, user, borrower } = await getBorrowerContext()
  if (!user || !borrower?.id) return

  const accountRes = await supabase
    .from('borrower_bank_accounts')
    .select('id,org_id,micro_deposit_amount_1,micro_deposit_amount_2')
    .eq('id', bankAccountId)
    .eq('borrower_id', borrower.id)
    .limit(1)
    .maybeSingle()
  if (!accountRes.data) return

  if (mode === 'micro_start') {
    const [first, second] = generateMicroDepositPair()
    await supabase
      .from('borrower_bank_accounts')
      .update({
        verification_status: 'pending',
        verification_method: 'micro_deposits',
        verification_provider: 'smartlend_micro_deposits',
        verification_reference: `md-${Date.now()}`,
        micro_deposit_amount_1: first,
        micro_deposit_amount_2: second,
      })
      .eq('id', bankAccountId)

    await createAuditEvent({
      orgId: accountRes.data.org_id,
      actorType: 'borrower',
      eventType: 'bank_account.micro_deposits_started',
      resourceType: 'borrower_bank_account',
      resourceId: bankAccountId,
      payload: {},
    })
    revalidatePath('/borrower/payments')
    return
  }

  if (mode === 'micro_confirm') {
    const expected = [
      Number(accountRes.data.micro_deposit_amount_1 || 0),
      Number(accountRes.data.micro_deposit_amount_2 || 0),
    ].sort((a, b) => a - b)
    const provided = [amount1, amount2].sort((a, b) => a - b)
    if (expected[0] <= 0 || expected[1] <= 0) return
    if (expected[0] !== provided[0] || expected[1] !== provided[1]) return
  }

  await supabase
    .from('borrower_bank_accounts')
    .update({
      verification_status: 'verified',
      verification_method: mode === 'instant' ? 'open_banking' : 'micro_deposits',
      verification_provider: mode === 'instant' ? 'mock_open_banking' : 'smartlend_micro_deposits',
      verified_at: new Date().toISOString(),
      is_default: true,
    })
    .eq('id', bankAccountId)

  await createAuditEvent({
    orgId: accountRes.data.org_id,
    actorType: 'borrower',
    eventType: 'bank_account.verified',
    resourceType: 'borrower_bank_account',
    resourceId: bankAccountId,
    payload: {},
  })
  await createNotification({
    orgId: accountRes.data.org_id,
    userId: user.id,
    actorType: 'borrower',
    type: 'bank_account_verified',
    title: 'Bank account verified',
    message: 'Your ACH bank account is verified and ready for autopay.',
  })

  revalidatePath('/borrower/payments')
}

export async function enableAutopay(formData: FormData) {
  const loanAccountId = String(formData.get('loan_account_id') || '')
  const bankAccountId = String(formData.get('bank_account_id') || '')
  if (!loanAccountId || !bankAccountId) return

  const { supabase, user, borrower } = await getBorrowerContext()
  if (!user || !borrower?.id) return

  const bankRes = await supabase
    .from('borrower_bank_accounts')
    .select('id,org_id,verification_status')
    .eq('id', bankAccountId)
    .eq('borrower_id', borrower.id)
    .limit(1)
    .maybeSingle()
  if (!bankRes.data || bankRes.data.verification_status !== 'verified') return

  await supabase
    .from('loan_accounts')
    .update({
      autopay_enabled: true,
      autopay_bank_account_id: bankAccountId,
    })
    .eq('id', loanAccountId)
    .eq('borrower_id', borrower.id)

  await createAuditEvent({
    orgId: bankRes.data.org_id,
    actorType: 'borrower',
    eventType: 'autopay.enabled',
    resourceType: 'loan_account',
    resourceId: loanAccountId,
    payload: { bank_account_id: bankAccountId },
  })
  await createNotification({
    orgId: bankRes.data.org_id,
    userId: user.id,
    actorType: 'borrower',
    type: 'autopay_enabled',
    title: 'Autopay enabled',
    message: 'ACH autopay has been enabled for your loan account.',
  })

  revalidatePath('/borrower/payments')
  revalidatePath('/dashboard/servicing')
}
