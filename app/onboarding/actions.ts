'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { verifyInviteToken } from '@/lib/invites'

const DEFAULT_ROLE_PERMISSIONS = {
  admin: ['team.manage', 'pricing.manage', 'workflow.manage', 'communications.manage', 'collections.manage', 'compliance.manage', 'reports.view', 'audit.view'],
  staff: ['communications.manage', 'collections.manage', 'reports.view'],
} as const

function getInviteSecret() {
  const secret = process.env.INVITE_SECRET
  if (!secret || secret.length < 16) return null
  return secret
}

export async function createOrganization(rawName: string) {
  const orgName = (rawName ?? '').trim()
  if (!orgName) return { error: 'Please enter an organization name.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' }

  const existingMember = await supabase
    .from('org_members')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()

  if (existingMember.data?.id) return { error: 'You are already in an organization.' }

  const orgInsert = await supabase
    .from('organizations')
    .insert({ name: orgName, created_by: user.id })
    .select('id,name')
    .single()

  if (orgInsert.error || !orgInsert.data) return { error: orgInsert.error?.message ?? 'Could not create organization.' }

  const orgId = orgInsert.data.id as string
  const memberInsert = await supabase.from('org_members').insert({
    org_id: orgId,
    user_id: user.id,
    role: 'admin',
    status: 'active',
    permissions: DEFAULT_ROLE_PERMISSIONS.admin,
  })
  if (memberInsert.error) return { error: memberInsert.error.message }

  const profileUpsert = await supabase.from('profiles').upsert({
    id: user.id,
    email: user.email,
    first_name: user.user_metadata?.first_name ?? '',
    last_name: user.user_metadata?.last_name ?? '',
    default_org_id: orgId,
    updated_at: new Date().toISOString(),
  })
  if (profileUpsert.error) return { error: profileUpsert.error.message }

  // Cache only for UI convenience; authorization is table-based.
  await supabase.auth.updateUser({
    data: {
      org_created: true,
      org_id: orgId,
      org_name: orgInsert.data.name,
      role: 'admin',
    },
  })

  redirect('/dashboard')
}

export async function acceptInvite(token: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const inviteRes = await supabase
    .from('org_invites')
    .select('id, org_id, role, accepted_at, expires_at')
    .eq('token', token)
    .maybeSingle()

  if (inviteRes.error || !inviteRes.data) return { error: 'Invite record not found.' }
  if (inviteRes.data.role === 'borrower') return { error: 'Borrower invite must be accepted from borrower flow.' }
  if (inviteRes.data.accepted_at) return { error: 'Invite already accepted.' }
  if (new Date(inviteRes.data.expires_at).getTime() < Date.now()) return { error: 'Invite token expired.' }

  const secret = getInviteSecret()
  if (secret) {
    try {
      const payload = verifyInviteToken(token, secret)
      if (inviteRes.data.org_id !== payload.org_id || inviteRes.data.role !== payload.role) {
        return { error: 'Invite token does not match invite record.' }
      }
    } catch (e: unknown) {
      return { error: e instanceof Error ? e.message : 'Invalid invite token' }
    }
  }

  const memberUpsert = await supabase
    .from('org_members')
    .upsert({
      org_id: inviteRes.data.org_id,
      user_id: user.id,
      role: inviteRes.data.role,
      status: 'active',
      permissions: DEFAULT_ROLE_PERMISSIONS[inviteRes.data.role as 'admin' | 'staff'],
    }, { onConflict: 'org_id,user_id' })

  if (memberUpsert.error) return { error: memberUpsert.error.message }

  const inviteUpdate = await supabase
    .from('org_invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', inviteRes.data.id)
  if (inviteUpdate.error) return { error: inviteUpdate.error.message }

  const profileUpsert = await supabase.from('profiles').upsert({
    id: user.id,
    email: user.email,
      first_name: user.user_metadata?.first_name ?? '',
      last_name: user.user_metadata?.last_name ?? '',
      default_org_id: inviteRes.data.org_id,
      updated_at: new Date().toISOString(),
  })
  if (profileUpsert.error) return { error: profileUpsert.error.message }

  const orgInfo = await supabase
    .from('organizations')
    .select('name')
    .eq('id', inviteRes.data.org_id)
    .limit(1)
    .maybeSingle()

  await supabase.auth.updateUser({
    data: {
      org_created: true,
      org_id: inviteRes.data.org_id,
      org_name: orgInfo.data?.name ?? null,
      role: inviteRes.data.role,
      invite_token: null,
    },
  })

  redirect('/dashboard')
}
