import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getCurrentMembership } from '@/lib/authz'
import { setLastActorPreference, updateOrganizationName } from './actions'

export const metadata: Metadata = { title: 'Settings' }

export default async function SettingsPage() {
  const supabase = await createClient()
  const membership = await getCurrentMembership()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const orgRes = membership
    ? await supabase.from('organizations').select('id,name').eq('id', membership.orgId).limit(1).maybeSingle()
    : { data: null as any }

  const profileRes = user
    ? await supabase.from('profiles').select('last_actor').eq('id', user.id).limit(1).maybeSingle()
    : { data: null as any }

  return (
    <div>
      <h1 style={{ margin: 0, fontSize: '1.9rem', fontWeight: 900, color: '#0f172a' }}>Settings</h1>
      <p style={{ marginTop: 8, color: '#64748b' }}>Organization profile and actor preferences.</p>

      <div style={{ marginTop: 16, border: '1px solid #e2e8f0', borderRadius: 14, background: '#fff', padding: 14, maxWidth: 680 }}>
        <p style={{ margin: 0, color: '#0f172a', fontWeight: 900 }}>Organization</p>
        <p style={{ margin: '6px 0 10px', color: '#64748b', fontSize: '0.88rem' }}>Only admin can update organization name.</p>
        <form action={updateOrganizationName} style={{ display: 'flex', gap: 8 }}>
          <input name="name" defaultValue={orgRes.data?.name || ''} style={{ flex: 1, borderRadius: 10, border: '1.5px solid #e2e8f0', padding: '10px 12px' }} />
          <button type="submit" disabled={membership?.role !== 'admin'} style={{ border: 'none', borderRadius: 10, background: membership?.role === 'admin' ? '#0f766e' : '#94a3b8', color: '#fff', fontWeight: 800, padding: '10px 12px', cursor: membership?.role === 'admin' ? 'pointer' : 'default' }}>
            Save
          </button>
        </form>
      </div>

      <div style={{ marginTop: 12, border: '1px solid #e2e8f0', borderRadius: 14, background: '#fff', padding: 14, maxWidth: 680 }}>
        <p style={{ margin: 0, color: '#0f172a', fontWeight: 900 }}>Default actor</p>
        <p style={{ margin: '6px 0 10px', color: '#64748b', fontSize: '0.88rem' }}>Used when your account has both lender and borrower access.</p>
        <form action={setLastActorPreference} style={{ display: 'flex', gap: 8 }}>
          <select name="actor" defaultValue={profileRes.data?.last_actor || 'lender'} style={{ borderRadius: 10, border: '1.5px solid #e2e8f0', padding: '10px 12px' }}>
            <option value="lender">lender</option>
            <option value="borrower">borrower</option>
          </select>
          <button type="submit" style={{ border: 'none', borderRadius: 10, background: '#0f766e', color: '#fff', fontWeight: 800, padding: '10px 12px', cursor: 'pointer' }}>
            Update
          </button>
        </form>
      </div>
    </div>
  )
}
