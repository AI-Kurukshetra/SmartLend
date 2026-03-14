'use client'

import { useMemo, useState, useTransition } from 'react'
import type { User } from '@supabase/supabase-js'
import { Copy, Crown, Link2, ShieldCheck, UserPlus2, Users } from 'lucide-react'
import { generateInviteLink, updateMemberPermissions } from '@/app/settings/team/actions'
import { formatUiLabel } from '@/lib/utils'

type Membership = {
  orgId: string
  role: 'admin' | 'staff'
  status: 'active' | 'invited' | 'disabled'
}

type Member = {
  id: string
  user_id: string
  role: 'admin' | 'staff'
  status: 'active' | 'invited' | 'disabled'
  permissions: string[]
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
  members: Member[]
}) {
  const [role, setRole] = useState<'staff' | 'admin'>('staff')
  const [email, setEmail] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isPending, startTransition] = useTransition()

  const orgId = membership?.orgId
  const myRole = membership?.role
  const canInvite = myRole === 'admin'
  const permissionOptions = ['team.manage', 'pricing.manage', 'workflow.manage', 'communications.manage', 'collections.manage', 'compliance.manage', 'reports.view', 'audit.view']

  const title = useMemo(() => {
    if (!orgName || !orgId) return 'Organization not set'
    return `Team management for ${orgName}`
  }, [orgName, orgId])

  const stats = useMemo(() => {
    return {
      total: members.length,
      admins: members.filter((member) => member.role === 'admin').length,
      invited: members.filter((member) => member.status === 'invited').length,
      active: members.filter((member) => member.status === 'active').length,
    }
  }, [members])

  if (!user) {
    return (
      <div style={{ padding: 24 }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900 }}>Unauthorized</h1>
        <p style={{ color: 'var(--color-text-muted)' }}>Sign in to view team settings.</p>
      </div>
    )
  }

  return (
    <div style={{ padding: 24, maxWidth: 1180, margin: '0 auto', display: 'grid', gap: 18 }}>
      <section style={{ borderRadius: 30, padding: 24, background: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 44%, #0f766e 100%)', color: '#fff' }}>
        <p style={eyebrowStyle}>Team</p>
        <h1 style={{ margin: '10px 0 0', fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 950, letterSpacing: '-0.04em', lineHeight: 1.02 }}>
          {title}
        </h1>
        <p style={{ margin: '12px 0 0', maxWidth: 720, color: 'rgba(255,255,255,0.82)', lineHeight: 1.7 }}>
          Invite teammates, review access, and manage granular permissions from one cleaner member management screen.
        </p>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
        <StatCard icon={Users} label="Team members" value={String(stats.total)} tone="blue" />
        <StatCard icon={Crown} label="Admins" value={String(stats.admins)} tone="amber" />
        <StatCard icon={ShieldCheck} label="Active" value={String(stats.active)} tone="teal" />
        <StatCard icon={UserPlus2} label="Invited" value={String(stats.invited)} tone="slate" />
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 14 }}>
        <div style={panelStyle}>
          <h2 style={sectionTitleStyle}>Workspace access</h2>
          <p style={sectionSubtitleStyle}>Quick reference for your organization and current management rights.</p>
          <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
            <Row label="Your role" value={formatUiLabel(myRole ?? '') || 'Not available'} />
            <Row label="Membership status" value={formatUiLabel(membership?.status ?? '') || 'Not available'} />
            <Row label="Organization ID" value={orgId ?? 'Not available'} />
            <Row label="Invite control" value={canInvite ? 'Admin access enabled' : 'Admin access required'} />
          </div>
        </div>

        <div style={panelStyle}>
          <h2 style={sectionTitleStyle}>Invite a member</h2>
          <p style={sectionSubtitleStyle}>Generate a secure invite link for a new admin or staff member.</p>

          {!canInvite && (
            <p style={{ margin: '14px 0 0', color: '#dc2626', fontWeight: 800 }}>
              Only admins can invite members.
            </p>
          )}

          <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@company.com"
              style={inputStyle}
              disabled={!canInvite}
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'staff' | 'admin')}
              style={inputStyle}
              disabled={!canInvite}
            >
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
            <button
              disabled={!canInvite || isPending}
              onClick={() => {
                setError(null)
                setResult(null)
                setCopied(false)
                startTransition(async () => {
                  const res = await generateInviteLink({ role, email })
                  if (res.error) setError(res.error)
                  else setResult(res.inviteUrl ?? null)
                })
              }}
              style={{ ...primaryButtonStyle, opacity: !canInvite || isPending ? 0.7 : 1, cursor: !canInvite || isPending ? 'not-allowed' : 'pointer' }}
            >
              {isPending ? 'Generating...' : 'Generate invite link'}
            </button>
          </div>

          {error && <p style={{ marginTop: 12, color: '#dc2626', fontWeight: 800 }}>{error}</p>}
          {result && (
            <div style={{ marginTop: 14, border: '1px solid var(--color-border-strong)', borderRadius: 18, background: 'var(--color-surface-soft)', padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <div>
                  <p style={{ margin: 0, color: 'var(--color-text-primary)', fontWeight: 900 }}>Invite link ready</p>
                  <p style={{ margin: '4px 0 0', color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>Share this secure link with the new team member.</p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(result)
                    setCopied(true)
                  }}
                  style={secondaryButtonStyle}
                >
                  <Copy size={15} />
                  {copied ? 'Copied' : 'Copy link'}
                </button>
              </div>
              <div style={{ marginTop: 12, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 40, height: 40, borderRadius: 14, background: '#eff6ff', border: '1px solid #bfdbfe', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <Link2 size={17} color="#1d4ed8" />
                </div>
                <code style={{ display: 'block', padding: 12, borderRadius: 14, background: '#0b1220', color: '#e2e8f0', overflowX: 'auto', width: '100%' }}>
                  {result}
                </code>
              </div>
            </div>
          )}
        </div>
      </section>

      <section style={panelStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div>
            <h2 style={sectionTitleStyle}>Member access</h2>
            <p style={sectionSubtitleStyle}>Review team roles and update staff permissions without exposing raw system data.</p>
          </div>
          <span style={{ borderRadius: 999, padding: '7px 11px', background: '#eff6ff', color: '#1d4ed8', fontSize: '0.78rem', fontWeight: 900 }}>
            {stats.total} members
          </span>
        </div>

        <div style={{ marginTop: 14, display: 'grid', gap: 12 }}>
          {members.map((member) => (
            <PermissionEditor
              key={member.id}
              member={member}
              disabled={!canInvite}
              permissionOptions={permissionOptions}
            />
          ))}
        </div>
      </section>

      <style jsx>{`
        @media (max-width: 980px) {
          section[style*='grid-template-columns: repeat(4'] {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
          section[style*='grid-template-columns: 1.1fr 0.9fr'] {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 720px) {
          section[style*='grid-template-columns: repeat(4'] {
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
  member: Member
  disabled: boolean
  permissionOptions: string[]
}) {
  const [permissions, setPermissions] = useState<string[]>(member.permissions)
  const [pending, startTransition] = useTransition()

  const isAdmin = member.role === 'admin'

  return (
    <article style={{ border: '1px solid var(--color-border)', borderRadius: 20, padding: 16, background: 'var(--color-surface-soft)', display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: 0, color: 'var(--color-text-primary)', fontWeight: 900, fontSize: '1rem' }}>{member.user_id}</p>
          <p style={{ margin: '6px 0 0', color: 'var(--color-text-muted)', fontSize: '0.84rem' }}>
            {formatUiLabel(member.role)} • {formatUiLabel(member.status)}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <RolePill role={member.role} />
          <StatusPill status={member.status} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {permissionOptions.map((permission) => {
          const checked = permissions.includes(permission)
          return (
            <label
              key={permission}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 10px',
                borderRadius: 999,
                border: `1px solid ${checked ? '#86efac' : 'var(--color-border-strong)'}`,
                background: checked ? '#f0fdf4' : 'var(--color-surface)',
                color: checked ? '#166534' : 'var(--color-text-secondary)',
                fontSize: '0.82rem',
                fontWeight: 800,
              }}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={disabled || isAdmin}
                onChange={(e) => {
                  setPermissions((current) => (e.target.checked ? [...current, permission] : current.filter((value) => value !== permission)))
                }}
              />
              {formatUiLabel(permission)}
            </label>
          )
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>
          {isAdmin ? 'Admins keep full platform access.' : `${permissions.length} permissions enabled`}
        </p>
        {!isAdmin && (
          <button
            disabled={disabled || pending}
            onClick={() =>
              startTransition(async () => {
                await updateMemberPermissions({ memberId: member.id, permissions: permissions as any })
              })
            }
            style={{ ...primaryButtonStyle, padding: '10px 14px', opacity: disabled || pending ? 0.7 : 1 }}
          >
            {pending ? 'Saving...' : 'Save permissions'}
          </button>
        )}
      </div>
    </article>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>
  label: string
  value: string
  tone: 'blue' | 'amber' | 'teal' | 'slate'
}) {
  const palette = {
    blue: { bg: '#eff6ff', border: '#bfdbfe', fg: '#1d4ed8' },
    amber: { bg: '#fffbeb', border: '#fde68a', fg: '#b45309' },
    teal: { bg: '#ecfeff', border: '#a5f3fc', fg: '#0f766e' },
    slate: { bg: '#f1f5f9', border: '#cbd5e1', fg: '#334155' },
  }[tone]

  return (
    <div style={{ border: '1px solid var(--color-border-strong)', borderRadius: 22, background: 'var(--color-surface)', padding: 16, boxShadow: 'var(--color-shadow-soft)' }}>
      <div style={{ width: 44, height: 44, borderRadius: 14, background: palette.bg, border: `1px solid ${palette.border}`, display: 'grid', placeItems: 'center' }}>
        <Icon size={18} color={palette.fg} />
      </div>
      <p style={{ margin: '12px 0 0', color: 'var(--color-text-muted)', fontWeight: 800, fontSize: '0.82rem' }}>{label}</p>
      <p style={{ margin: '8px 0 0', color: 'var(--color-text-primary)', fontWeight: 950, fontSize: '1.7rem' }}>{value}</p>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', border: '1px solid var(--color-border)', borderRadius: 14, background: 'var(--color-surface-soft)', padding: '12px 14px' }}>
      <span style={{ color: 'var(--color-text-muted)', fontWeight: 800, fontSize: '0.82rem' }}>{label}</span>
      <span style={{ color: 'var(--color-text-primary)', fontWeight: 900, fontSize: '0.86rem', textAlign: 'right' }}>{value}</span>
    </div>
  )
}

function RolePill({ role }: { role: Member['role'] }) {
  const isAdmin = role === 'admin'
  return (
    <span style={{ borderRadius: 999, padding: '7px 11px', background: isAdmin ? '#fffbeb' : '#eff6ff', color: isAdmin ? '#b45309' : '#1d4ed8', fontSize: '0.78rem', fontWeight: 900 }}>
      {formatUiLabel(role)}
    </span>
  )
}

function StatusPill({ status }: { status: Member['status'] }) {
  const palette = status === 'active'
    ? { bg: '#dcfce7', fg: '#166534' }
    : status === 'invited'
      ? { bg: '#eff6ff', fg: '#1d4ed8' }
      : { bg: '#f1f5f9', fg: '#334155' }

  return (
    <span style={{ borderRadius: 999, padding: '7px 11px', background: palette.bg, color: palette.fg, fontSize: '0.78rem', fontWeight: 900 }}>
      {formatUiLabel(status)}
    </span>
  )
}

const eyebrowStyle = {
  margin: 0,
  fontSize: '0.78rem',
  fontWeight: 900,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.74)',
  opacity: 0.78,
} satisfies React.CSSProperties

const panelStyle = {
  border: '1px solid var(--color-border-strong)',
  borderRadius: 24,
  background: 'var(--color-surface)',
  padding: 18,
  boxShadow: 'var(--color-shadow-soft)',
} satisfies React.CSSProperties

const sectionTitleStyle = {
  margin: 0,
  color: 'var(--color-text-primary)',
  fontWeight: 950,
  fontSize: '1rem',
} satisfies React.CSSProperties

const sectionSubtitleStyle = {
  margin: '4px 0 0',
  color: 'var(--color-text-muted)',
  fontSize: '0.82rem',
  lineHeight: 1.55,
} satisfies React.CSSProperties

const inputStyle = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 14,
  border: '1.5px solid var(--color-border-strong)',
  fontSize: '0.95rem',
  background: 'var(--color-surface)',
  color: 'var(--color-text-primary)',
  outline: 'none',
} satisfies React.CSSProperties

const primaryButtonStyle = {
  border: 'none',
  borderRadius: 14,
  background: 'linear-gradient(135deg, #0f766e 0%, #0ea5a4 100%)',
  color: '#fff',
  fontWeight: 900,
  padding: '12px 16px',
  cursor: 'pointer',
} satisfies React.CSSProperties

const secondaryButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  border: '1px solid var(--color-border-strong)',
  borderRadius: 14,
  background: 'var(--color-surface)',
  color: 'var(--color-text-primary)',
  fontWeight: 900,
  padding: '10px 12px',
  cursor: 'pointer',
} satisfies React.CSSProperties
