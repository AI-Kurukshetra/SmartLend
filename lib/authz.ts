import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type MembershipRole = 'admin' | 'staff'
export type OrgPermission =
  | 'team.manage'
  | 'pricing.manage'
  | 'workflow.manage'
  | 'communications.manage'
  | 'collections.manage'
  | 'compliance.manage'
  | 'reports.view'
  | 'audit.view'

export type Membership = {
  orgId: string
  role: MembershipRole
  status: 'active' | 'invited' | 'disabled'
  permissions?: OrgPermission[]
}

const DEFAULT_ROLE_PERMISSIONS: Record<MembershipRole, OrgPermission[]> = {
  admin: ['team.manage', 'pricing.manage', 'workflow.manage', 'communications.manage', 'collections.manage', 'compliance.manage', 'reports.view', 'audit.view'],
  staff: ['communications.manage', 'collections.manage', 'reports.view'],
}

export type CurrentActor = 'lender' | 'borrower' | 'none'

export async function getCurrentUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

export async function getCurrentMembership(): Promise<Membership | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('org_members')
    .select('org_id, role, status, permissions')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  return {
    orgId: data.org_id as string,
    role: data.role as MembershipRole,
    status: data.status as Membership['status'],
    permissions: Array.isArray(data.permissions)
      ? (data.permissions as OrgPermission[])
      : DEFAULT_ROLE_PERMISSIONS[data.role as MembershipRole],
  }
}

export async function requireOrgMembership() {
  const membership = await getCurrentMembership()
  if (!membership) redirect('/onboarding')
  return membership
}

export async function requireRole(role: MembershipRole) {
  const membership = await requireOrgMembership()
  if (membership.role !== role) redirect('/dashboard')
  return membership
}

export async function requirePermission(permission: OrgPermission) {
  const membership = await requireOrgMembership()
  const effectivePermissions = membership.permissions?.length
    ? membership.permissions
    : DEFAULT_ROLE_PERMISSIONS[membership.role]
  if (!effectivePermissions.includes(permission)) redirect('/dashboard')
  return membership
}

export async function getCurrentOrgId() {
  const membership = await requireOrgMembership()
  return membership.orgId
}

export async function getCurrentBorrowerProfileId() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('borrower_profiles')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()

  return (data?.id as string | undefined) ?? null
}

export async function getCurrentActor(): Promise<CurrentActor> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return 'none'

  const [membership, borrower, profile] = await Promise.all([
    supabase
      .from('org_members')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle(),
    supabase
      .from('borrower_profiles')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle(),
    supabase.from('profiles').select('last_actor').eq('id', user.id).limit(1).maybeSingle(),
  ])

  const hasLender = Boolean(membership.data?.id)
  const hasBorrower = Boolean(borrower.data?.id)
  const lastActor = profile.data?.last_actor as CurrentActor | undefined

  if (hasLender && hasBorrower) {
    if (lastActor === 'borrower') return 'borrower'
    return 'lender'
  }
  if (hasLender) return 'lender'
  if (hasBorrower) return 'borrower'
  return 'none'
}

export async function requireBorrowerActor() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const borrowerRes = await supabase
    .from('borrower_profiles')
    .select('id,onboarding_completed_at')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()

  if (!borrowerRes.data?.id || !borrowerRes.data.onboarding_completed_at) redirect('/borrower/onboarding')
  return borrowerRes.data.id as string
}
