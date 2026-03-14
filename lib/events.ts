import { createClient } from '@/lib/supabase/server'

type ActorType = 'lender' | 'borrower' | 'system'

export async function createNotification(input: {
  userId: string
  title: string
  message: string
  type: string
  orgId?: string | null
  actorType?: ActorType
}) {
  const supabase = await createClient()
  await supabase.from('notifications').insert({
    org_id: input.orgId ?? null,
    user_id: input.userId,
    actor_type: input.actorType ?? 'system',
    type: input.type,
    title: input.title,
    message: input.message,
  })
}

export async function createAuditEvent(input: {
  eventType: string
  resourceType: string
  resourceId?: string | null
  orgId?: string | null
  actorType: ActorType
  payload?: Record<string, unknown>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  await supabase.from('audit_events').insert({
    org_id: input.orgId ?? null,
    actor_user_id: user?.id ?? null,
    actor_type: input.actorType,
    event_type: input.eventType,
    resource_type: input.resourceType,
    resource_id: input.resourceId ?? null,
    payload: input.payload ?? {},
  })
}
