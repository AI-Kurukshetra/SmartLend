'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAuditEvent, createNotification } from '@/lib/events'

export async function createBorrowerProfile(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' as const }

  const fullName = ((formData.get('full_name') as string) || '').trim()
  const phone = ((formData.get('phone') as string) || '').trim()
  const acceptedTerms = formData.get('accepted_terms') === 'true'
  if (!fullName) return { error: 'Full name is required.' as const }
  if (!acceptedTerms) return { error: 'You must accept terms to continue.' as const }

  const inviteRes = await supabase
    .from('org_invites')
    .select('org_id')
    .eq('role', 'borrower')
    .eq('accepted_by', user.id)
    .not('accepted_at', 'is', null)
    .order('accepted_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const upsertRes = await supabase
    .from('borrower_profiles')
    .upsert({
      org_id: inviteRes.data?.org_id ?? null,
      user_id: user.id,
      full_name: fullName,
      phone: phone || null,
      status: 'active',
      terms_accepted_at: new Date().toISOString(),
      onboarding_completed_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select('id')
    .single()

  if (upsertRes.error) return { error: upsertRes.error.message }

  await supabase.from('profiles').upsert({
    id: user.id,
    email: user.email,
    first_name: user.user_metadata?.first_name ?? '',
    last_name: user.user_metadata?.last_name ?? '',
    phone: phone || null,
    last_actor: 'borrower',
    updated_at: new Date().toISOString(),
  })

  await supabase.auth.updateUser({
    data: {
      actor: 'borrower',
      borrower_profile_id: upsertRes.data.id,
    },
  })

  await createAuditEvent({
    actorType: 'borrower',
    eventType: 'borrower.onboarding_completed',
    resourceType: 'borrower_profile',
    resourceId: upsertRes.data.id,
    payload: {},
  })
  await createNotification({
    userId: user.id,
    actorType: 'borrower',
    type: 'onboarding_completed',
    title: 'Borrower onboarding completed',
    message: 'Your borrower workspace is now active.',
  })

  redirect('/borrower')
}
