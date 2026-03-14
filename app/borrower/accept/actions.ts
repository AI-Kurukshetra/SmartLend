'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSiteUrl } from '@/lib/siteUrl'

export async function signupBorrowerFromInvite(formData: FormData) {
  const token = String(formData.get('invite') || '').trim()
  const fullName = String(formData.get('full_name') || '').trim()
  const phone = String(formData.get('phone') || '').trim()
  const password = String(formData.get('password') || '')
  const confirmPassword = String(formData.get('confirm_password') || '')
  const acceptedTerms = String(formData.get('accepted_terms') || '') === 'true'

  if (!token) return { error: 'Invite token is required.' as const }
  if (!fullName) return { error: 'Full name is required.' as const }
  if (!acceptedTerms) return { error: 'You must accept borrower terms to continue.' as const }
  if (password.length < 8) return { error: 'Password must be at least 8 characters.' as const }
  if (password !== confirmPassword) return { error: 'Passwords do not match.' as const }

  const supabase = await createClient()
  const inviteRes = await supabase
    .from('org_invites')
    .select('id,org_id,email,role,expires_at,accepted_at')
    .eq('token', token)
    .eq('role', 'borrower')
    .limit(1)
    .maybeSingle()

  if (!inviteRes.data) return { error: 'Invite not found.' as const }
  if (inviteRes.data.accepted_at) return { error: 'Invite already used.' as const }
  if (new Date(inviteRes.data.expires_at).getTime() < Date.now()) return { error: 'Invite expired.' as const }

  const redirectTo = `${getSiteUrl()}/auth/callback?next=${encodeURIComponent(`/borrower/accept?invite=${token}`)}`
  const { data, error } = await supabase.auth.signUp({
    email: String(inviteRes.data.email || ''),
    password,
    options: {
      emailRedirectTo: redirectTo,
      data: {
        full_name: fullName,
        phone: phone || null,
        actor: 'borrower',
        invite_token: token,
      },
    },
  })

  if (error) {
    const msg = error.message.toLowerCase()
    if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('user already')) {
      return { alreadyRegistered: true as const, email: String(inviteRes.data.email || '') }
    }
    return { error: error.message as string }
  }

  if (data.user && (!data.user.identities || data.user.identities.length === 0)) {
    return { alreadyRegistered: true as const, email: String(inviteRes.data.email || '') }
  }

  if (data.session) {
    const profileRes = await supabase
      .from('borrower_profiles')
      .upsert({
        org_id: inviteRes.data.org_id,
        user_id: data.user?.id,
        full_name: fullName,
        phone: phone || null,
        status: 'active',
        terms_accepted_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

    if (profileRes.error) return { error: profileRes.error.message }
    redirect(`/borrower/accept?invite=${encodeURIComponent(token)}`)
  }

  return { success: true as const, email: String(inviteRes.data.email || '') }
}
