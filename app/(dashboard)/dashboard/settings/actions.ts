'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireRole, requireOrgMembership } from '@/lib/authz'
import { createAuditEvent } from '@/lib/events'

export async function updateOrganizationName(formData: FormData) {
  const name = String(formData.get('name') || '').trim()
  if (!name) return

  const membership = await requireRole('admin')
  const supabase = await createClient()
  await supabase
    .from('organizations')
    .update({ name })
    .eq('id', membership.orgId)

  await createAuditEvent({
    orgId: membership.orgId,
    actorType: 'lender',
    eventType: 'organization.updated',
    resourceType: 'organization',
    resourceId: membership.orgId,
    payload: { name },
  })

  revalidatePath('/dashboard/settings')
}

export async function setLastActorPreference(formData: FormData) {
  const actor = String(formData.get('actor') || '')
  if (actor !== 'lender' && actor !== 'borrower') return

  await requireOrgMembership()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('profiles').upsert({
    id: user.id,
    email: user.email,
    first_name: user.user_metadata?.first_name ?? '',
    last_name: user.user_metadata?.last_name ?? '',
    last_actor: actor,
    updated_at: new Date().toISOString(),
  })

  revalidatePath('/dashboard/settings')
}
