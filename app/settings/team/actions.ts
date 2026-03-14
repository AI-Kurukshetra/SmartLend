'use server'

import { randomUUID } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { getSiteUrl } from '@/lib/siteUrl'
import { createInviteToken } from '@/lib/invites'
import type { OrgPermission } from '@/lib/authz'

function requireInviteSecret() {
  const secret = process.env.INVITE_SECRET
  if (!secret || secret.length < 16) {
    return null
  }
  return secret
}

export async function generateInviteLink(input: { role: 'admin' | 'staff'; email?: string }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' as const }

  const membership = await supabase
    .from('org_members')
    .select('org_id, role')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()
  if (membership.error || !membership.data) return { error: 'Organization membership not found.' as const }
  if (membership.data.role !== 'admin') return { error: 'Only admins can invite members.' as const }

  const orgRes = await supabase
    .from('organizations')
    .select('id,name')
    .eq('id', membership.data.org_id)
    .limit(1)
    .maybeSingle()
  if (orgRes.error || !orgRes.data) return { error: 'Organization is not set.' as const }

  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 // 7 days
  const secret = requireInviteSecret()
  const token = secret
    ? createInviteToken(
      { org_id: orgRes.data.id, org_name: orgRes.data.name, role: input.role, exp },
      secret
    )
    : randomUUID()

  const inviteInsert = await supabase
    .from('org_invites')
    .insert({
      org_id: orgRes.data.id,
      email: input.email?.trim() || null,
      role: input.role,
      token,
      expires_at: new Date(exp * 1000).toISOString(),
      created_by: user.id,
    })
  if (inviteInsert.error) return { error: inviteInsert.error.message }

  const base = getSiteUrl()
  const inviteUrl = `${base}/login?mode=signup&invite=${encodeURIComponent(token)}`

  return { inviteUrl } as const
}

export async function updateMemberPermissions(input: { memberId: string; permissions: OrgPermission[] }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' as const }

  const membership = await supabase
    .from('org_members')
    .select('org_id, role')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()
  if (membership.error || !membership.data || membership.data.role !== 'admin') {
    return { error: 'Only admins can change permissions.' as const }
  }

  const updateRes = await supabase
    .from('org_members')
    .update({ permissions: input.permissions })
    .eq('id', input.memberId)
    .eq('org_id', membership.data.org_id)

  if (updateRes.error) return { error: updateRes.error.message }
  return { success: true as const }
}
