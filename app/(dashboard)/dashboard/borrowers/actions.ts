'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getSiteUrl } from '@/lib/siteUrl'
import { createClient } from '@/lib/supabase/server'
import { createInviteToken, verifyInviteToken } from '@/lib/invites'
import { createAuditEvent, createNotification } from '@/lib/events'
import { requireRole } from '@/lib/authz'

function requireInviteSecret() {
  const secret = process.env.INVITE_SECRET
  if (!secret || secret.length < 16) return null
  return secret
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function buildBorrowerInviteUrl(token: string) {
  return `${getSiteUrl()}/borrower/accept?invite=${encodeURIComponent(token)}`
}

export async function inviteBorrower(formData: FormData) {
  const email = normalizeEmail(String(formData.get('email') || ''))
  if (!email) redirect('/dashboard/borrowers?error=Borrower%20email%20is%20required')

  const supabase = await createClient()
  const membership = await requireRole('admin')
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/dashboard/borrowers?error=Unauthorized')

  const orgRes = await supabase
    .from('organizations')
    .select('id,name')
    .eq('id', membership.orgId)
    .limit(1)
    .maybeSingle()
  if (!orgRes.data) redirect('/dashboard/borrowers?error=Organization%20not%20found')

  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7
  const secret = requireInviteSecret()
  const token = secret
    ? createInviteToken(
      { org_id: membership.orgId, org_name: orgRes.data.name as string, role: 'borrower', exp },
      secret
    )
    : randomUUID()

  const insertInvite = await supabase.from('org_invites').insert({
    org_id: membership.orgId,
    email,
    role: 'borrower',
    token,
    expires_at: new Date(exp * 1000).toISOString(),
    created_by: user.id,
  })
  if (insertInvite.error) {
    redirect(`/dashboard/borrowers?error=${encodeURIComponent(insertInvite.error.message)}`)
  }

  await createAuditEvent({
    orgId: membership.orgId,
    actorType: 'lender',
    eventType: 'borrower_invite.created',
    resourceType: 'org_invite',
    payload: { email },
  })

  revalidatePath('/dashboard/borrowers')
  redirect('/dashboard/borrowers?success=Borrower%20invite%20link%20created')
}

export async function resendBorrowerInvite(formData: FormData) {
  const inviteId = String(formData.get('invite_id') || '')
  if (!inviteId) redirect('/dashboard/borrowers?error=Invite%20id%20is%20required')

  const supabase = await createClient()
  const membership = await requireRole('admin')
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/dashboard/borrowers?error=Unauthorized')

  const inviteRes = await supabase
    .from('org_invites')
    .select('id,email,role,accepted_at')
    .eq('id', inviteId)
    .eq('org_id', membership.orgId)
    .eq('role', 'borrower')
    .limit(1)
    .maybeSingle()
  if (!inviteRes.data) redirect('/dashboard/borrowers?error=Invite%20not%20found')
  if (inviteRes.data.accepted_at) redirect('/dashboard/borrowers?error=Invite%20already%20accepted')

  const orgRes = await supabase
    .from('organizations')
    .select('name')
    .eq('id', membership.orgId)
    .limit(1)
    .maybeSingle()
  if (!orgRes.data) redirect('/dashboard/borrowers?error=Organization%20not%20found')

  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7
  const secret = requireInviteSecret()
  const token = secret
    ? createInviteToken(
      { org_id: membership.orgId, org_name: orgRes.data.name as string, role: 'borrower', exp },
      secret
    )
    : randomUUID()
  const updateRes = await supabase
    .from('org_invites')
    .update({
      token,
      expires_at: new Date(exp * 1000).toISOString(),
      created_by: user.id,
    })
    .eq('id', inviteId)
  if (updateRes.error) {
    redirect(`/dashboard/borrowers?error=${encodeURIComponent(updateRes.error.message)}`)
  }

  await createAuditEvent({
    orgId: membership.orgId,
    actorType: 'lender',
    eventType: 'borrower_invite.resent',
    resourceType: 'org_invite',
    resourceId: inviteId,
    payload: { email: inviteRes.data.email },
  })

  revalidatePath('/dashboard/borrowers')
  redirect('/dashboard/borrowers?success=Borrower%20invite%20link%20refreshed')
}

export async function acceptBorrowerInvite(token: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' as const }

  const inviteRes = await supabase
    .from('org_invites')
    .select('id,org_id,email,role,expires_at,accepted_at,created_by')
    .eq('token', token)
    .eq('role', 'borrower')
    .limit(1)
    .maybeSingle()
  if (!inviteRes.data) return { error: 'Invite not found.' as const }
  if (inviteRes.data.role !== 'borrower') return { error: 'Not a borrower invite.' as const }
  if (inviteRes.data.accepted_at) return { error: 'Invite already used.' as const }
  if (new Date(inviteRes.data.expires_at).getTime() < Date.now()) return { error: 'Invite expired.' as const }
  if (normalizeEmail(String(inviteRes.data.email || '')) !== normalizeEmail(user.email ?? '')) {
    return { error: 'Invite email does not match signed-in user.' as const }
  }

  const secret = requireInviteSecret()
  if (secret) {
    try {
      const payload = verifyInviteToken(token, secret)
      if (payload.role !== 'borrower' || payload.org_id !== inviteRes.data.org_id) {
        return { error: 'Invite token does not match invite record.' as const }
      }
    } catch (e: unknown) {
      return { error: e instanceof Error ? e.message : 'Invalid invite token' as const }
    }
  }

  const borrowerUpsert = await supabase
    .from('borrower_profiles')
    .upsert({
      org_id: inviteRes.data.org_id,
      user_id: user.id,
      full_name: user.user_metadata?.full_name ?? null,
      phone: null,
      status: 'active',
    }, { onConflict: 'user_id' })
    .select('id')
    .single()
  if (borrowerUpsert.error) return { error: borrowerUpsert.error.message }

  const inviteUpdate = await supabase
    .from('org_invites')
    .update({
      accepted_at: new Date().toISOString(),
      accepted_by: user.id,
    })
    .eq('id', inviteRes.data.id)
  if (inviteUpdate.error) return { error: inviteUpdate.error.message }

  await createAuditEvent({
    orgId: inviteRes.data.org_id,
    actorType: 'borrower',
    eventType: 'borrower_invite.accepted',
    resourceType: 'org_invite',
    resourceId: inviteRes.data.id,
    payload: { borrower_profile_id: borrowerUpsert.data.id },
  })

  if (inviteRes.data.created_by) {
    await createNotification({
      orgId: inviteRes.data.org_id,
      userId: inviteRes.data.created_by,
      actorType: 'system',
      type: 'invite_accepted',
      title: 'Borrower invite accepted',
      message: `${user.email} accepted the borrower invite.`,
    })
  }

  revalidatePath('/dashboard/borrowers')
  return { success: true as const }
}

export async function getBorrowerInviteDetails(token: string) {
  if (!token) return null

  const supabase = await createClient()
  const inviteRes = await supabase
    .from('org_invites')
    .select('id,org_id,email,role,expires_at,accepted_at')
    .eq('token', token)
    .eq('role', 'borrower')
    .limit(1)
    .maybeSingle()

  if (!inviteRes.data || inviteRes.data.accepted_at) return null

  const orgRes = await supabase
    .from('organizations')
    .select('name')
    .eq('id', inviteRes.data.org_id)
    .limit(1)
    .maybeSingle()

  return {
    email: String(inviteRes.data.email || ''),
    orgName: String(orgRes.data?.name || 'Lender organization'),
    expiresAt: String(inviteRes.data.expires_at),
    inviteUrl: buildBorrowerInviteUrl(token),
  }
}
