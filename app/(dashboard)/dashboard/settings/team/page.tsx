import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/authz'
import TeamSettings from '@/components/settings/TeamSettings'

export const metadata: Metadata = {
  title: 'Team Settings',
  description: 'Invite staff and manage role-based access for your SmartLend organization.',
}

export default async function TeamSettingsPage() {
  await requirePermission('team.manage')
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return <TeamSettings user={null} membership={null} orgName={null} members={[]} />

  const membershipRes = await supabase
    .from('org_members')
    .select('org_id, role, status')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()

  const orgId = membershipRes.data?.org_id as string | undefined
  let orgName: string | null = null
  let members: Array<{ id: string; user_id: string; role: 'admin' | 'staff'; status: 'active' | 'invited' | 'disabled'; permissions: string[] }> = []
  if (orgId) {
    const orgRes = await supabase
      .from('organizations')
      .select('name')
      .eq('id', orgId)
      .limit(1)
      .maybeSingle()
    orgName = (orgRes.data?.name as string | undefined) ?? null

    const membersRes = await supabase
      .from('org_members')
      .select('id,user_id,role,status,permissions')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(50)
    members = (membersRes.data || []).map((member: any) => ({
      id: member.id as string,
      user_id: member.user_id as string,
      role: member.role as 'admin' | 'staff',
      status: member.status as 'active' | 'invited' | 'disabled',
      permissions: Array.isArray(member.permissions) ? member.permissions : [],
    }))
  }

  return (
    <TeamSettings
      user={user}
      membership={membershipRes.data ? {
        orgId: membershipRes.data.org_id as string,
        role: membershipRes.data.role as 'admin' | 'staff',
        status: membershipRes.data.status as 'active' | 'invited' | 'disabled',
      } : null}
      orgName={orgName}
      members={members}
    />
  )
}
