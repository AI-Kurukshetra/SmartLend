'use client'

import { useMemo, useState, useTransition } from 'react'
import type { User } from '@supabase/supabase-js'
import { generateInviteLink, updateMemberPermissions } from '@/app/settings/team/actions'

type Membership = {
  orgId: string
  role: 'admin' | 'staff'
  status: 'active' | 'invited' | 'disabled'
}

export default function TeamSettings({
  user,
  membership,
  orgName,
  members,
}: {
  user: User | null
  membership: Membership | null
  orgName: string | null
  members: Array<{ id: string; user_id: string; role: 'admin' | 'staff'; status: 'active' | 'invited' | 'disabled'; permissions: string[] }>
}) {
  const [role, setRole] = useState<'staff' | 'admin'>('staff')
  const [email, setEmail] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const orgId = membership?.orgId
  const myRole = membership?.role

  const canInvite = myRole === 'admin'
  const permissionOptions = ['team.manage', 'pricing.manage', 'workflow.manage', 'communications.manage', 'collections.manage', 'compliance.manage', 'reports.view', 'audit.view']

  const title = useMemo(() => {
    if (!orgName || !orgId) return 'Organization not set'
    return `Team settings for ${orgName}`
  }, [orgName, orgId])

  if (!user) {
    return (
      <div style={{ padding: 24 }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900 }}>Unauthorized</h1>
        <p style={{ color: '#64748b' }}>Sign in to view team settings.</p>
      </div>
    )
  }

  return (
    <div style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>
      <h1 style={{ margin: 0, fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 950, letterSpacing: '-0.03em' }}>
        {title}
      </h1>
      <p style={{ margin: '10px 0 0', color: '#64748b', lineHeight: 1.7 }}>
        Members are separated by roles. Admins can invite staff and manage access.
      </p>

      <div style={{ marginTop: 18, border: '1px solid #e2e8f0', borderRadius: 18, padding: 18, background: '#fff' }}>
        <p style={{ margin: 0, color: '#0f172a', fontWeight: 900 }}>Your role: {myRole ?? '—'}</p>
        <p style={{ margin: '6px 0 0', color: '#64748b' }}>Organization ID: {orgId ?? '—'}</p>
      </div>

      <div style={{ marginTop: 18, border: '1px solid #e2e8f0', borderRadius: 18, padding: 18, background: '#fff' }}>
        <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 950 }}>Member permissions</h2>
        <p style={{ margin: '8px 0 14px', color: '#64748b', lineHeight: 1.7 }}>
          Admins can assign granular permissions to staff without promoting them to full admin access.
        </p>
        <div style={{ display: 'grid', gap: 12 }}>
          {members.map((member) => (
            <PermissionEditor
              key={member.id}
              member={member}
              disabled={!canInvite}
              permissionOptions={permissionOptions}
            />
          ))}
        </div>
      </div>

      <div style={{ marginTop: 18, border: '1px solid #e2e8f0', borderRadius: 18, padding: 18, background: '#fff' }}>
        <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 950 }}>Invite a member</h2>
        <p style={{ margin: '8px 0 14px', color: '#64748b', lineHeight: 1.7 }}>
          SmartLend currently generates a secure invite link. You can send it to the teammate you want to add.
        </p>

        {!canInvite && (
          <p style={{ margin: 0, color: '#dc2626', fontWeight: 800 }}>
            Only admins can invite members.
          </p>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.6fr', gap: 12, marginTop: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#475569', marginBottom: 8 }}>
              Member email (optional)
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@company.com"
              style={{
                width: '100%',
                padding: '13px 14px',
                borderRadius: 14,
                border: '1.5px solid #e2e8f0',
                fontSize: '0.95rem',
                outline: 'none',
              }}
              disabled={!canInvite}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#475569', marginBottom: 8 }}>
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              style={{
                width: '100%',
                padding: '13px 14px',
                borderRadius: 14,
                border: '1.5px solid #e2e8f0',
                fontSize: '0.95rem',
                outline: 'none',
                background: '#fff',
              }}
              disabled={!canInvite}
            >
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
          <button
            disabled={!canInvite || isPending}
            onClick={() => {
              setError(null)
              setResult(null)
              startTransition(async () => {
                const res = await generateInviteLink({ role, email })
                if (res.error) setError(res.error)
                else setResult(res.inviteUrl ?? null)
              })
            }}
            style={{
              padding: '12px 16px',
              borderRadius: 14,
              border: 'none',
              background: '#0f766e',
              color: '#fff',
              fontWeight: 900,
              cursor: !canInvite || isPending ? 'not-allowed' : 'pointer',
            }}
          >
            {isPending ? 'Generating...' : 'Generate invite link'}
          </button>
        </div>

        {error && <p style={{ marginTop: 12, color: '#dc2626', fontWeight: 800 }}>{error}</p>}
        {result && (
          <div style={{ marginTop: 12 }}>
            <p style={{ margin: '0 0 8px', color: '#475569', fontWeight: 800 }}>Invite link</p>
            <code style={{ display: 'block', padding: 12, borderRadius: 14, background: '#0b1220', color: '#e2e8f0', overflowX: 'auto' }}>
              {result}
            </code>
          </div>
        )}
      </div>

      <style jsx>{`
        @media (max-width: 720px) {
          div[style*='grid-template-columns'] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}

function PermissionEditor({
  member,
  disabled,
  permissionOptions,
}: {
  member: { id: string; user_id: string; role: 'admin' | 'staff'; status: 'active' | 'invited' | 'disabled'; permissions: string[] }
  disabled: boolean
  permissionOptions: string[]
}) {
  const [permissions, setPermissions] = useState<string[]>(member.permissions)
  const [pending, startTransition] = useTransition()

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 14, padding: 14, background: '#f8fafc' }}>
      <p style={{ margin: 0, color: '#0f172a', fontWeight: 900 }}>{member.user_id}</p>
      <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '0.84rem' }}>{member.role} | {member.status}</p>
      <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {permissionOptions.map((permission) => {
          const checked = permissions.includes(permission)
          return (
            <label key={permission} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.84rem', color: '#334155', fontWeight: 700 }}>
              <input
                type="checkbox"
                checked={checked}
                disabled={disabled || member.role === 'admin'}
                onChange={(e) => {
                  setPermissions((current) => e.target.checked ? [...current, permission] : current.filter((value) => value !== permission))
                }}
              />
              {permission}
            </label>
          )
        })}
      </div>
      {member.role !== 'admin' && (
        <button
          disabled={disabled || pending}
          onClick={() => startTransition(async () => {
            await updateMemberPermissions({ memberId: member.id, permissions: permissions as any })
          })}
          style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, border: 'none', background: '#0f766e', color: '#fff', fontWeight: 900 }}
        >
          {pending ? 'Saving...' : 'Save permissions'}
        </button>
      )}
    </div>
  )
}
