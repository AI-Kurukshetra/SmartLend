import type { Metadata } from 'next'
import type { CSSProperties } from 'react'
import { createClient } from '@/lib/supabase/server'
import { requireOrgMembership } from '@/lib/authz'
import { inviteBorrower, resendBorrowerInvite } from './actions'

export const metadata: Metadata = {
  title: 'Borrower Management',
  description: 'Create and invite borrowers to SmartLend with secure magic-link onboarding.',
}

export default async function BorrowersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>
}) {
  const supabase = await createClient()
  const membership = await requireOrgMembership()
  const { error, success } = await searchParams

  const invitesRes = await supabase
    .from('org_invites')
    .select('id,email,accepted_at,expires_at,created_at')
    .eq('org_id', membership.orgId)
    .eq('role', 'borrower')
    .order('created_at', { ascending: false })
    .limit(50)

  const invites = invitesRes.data ?? []

  return (
    <div>
      <h1 style={{ margin: 0, fontSize: '1.9rem', fontWeight: 900, color: '#0f172a' }}>Borrower management</h1>
      <p style={{ marginTop: 8, color: '#64748b' }}>
        Create borrower access from your organization and send secure magic-link onboarding invites.
      </p>
      {error && (
        <div style={{ marginTop: 12, border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c', borderRadius: 12, padding: '10px 12px', fontWeight: 700 }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ marginTop: 12, border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#166534', borderRadius: 12, padding: '10px 12px', fontWeight: 700 }}>
          {success}
        </div>
      )}

      <form action={inviteBorrower} style={cardStyle}>
        <p style={{ margin: 0, fontWeight: 900, color: '#0f172a' }}>Invite borrower</p>
        <input
          type="email"
          name="email"
          placeholder="borrower@email.com"
          required
          style={inputStyle}
        />
        <button type="submit" style={buttonStyle}>Send magic-link invite</button>
      </form>

      <div style={{ ...cardStyle, marginTop: 14 }}>
        <p style={{ margin: '0 0 10px', fontWeight: 900, color: '#0f172a' }}>Invite status</p>
        {invites.length === 0 && (
          <div style={{ border: '1px dashed #cbd5e1', borderRadius: 12, padding: 12, color: '#64748b' }}>
            No borrower invites yet.
          </div>
        )}
        <div style={{ display: 'grid', gap: 8 }}>
          {invites.map((invite: any) => (
            <div key={invite.id} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, background: '#fff' }}>
              <p style={{ margin: 0, fontWeight: 800, color: '#0f172a' }}>{invite.email}</p>
              <p style={{ margin: '6px 0', color: '#64748b', fontSize: '0.85rem' }}>
                {invite.accepted_at ? 'Accepted' : 'Pending'} | Expires {new Date(invite.expires_at).toLocaleString()}
              </p>
              {!invite.accepted_at && (
                <form action={resendBorrowerInvite}>
                  <input type="hidden" name="invite_id" value={invite.id} />
                  <button type="submit" style={{ ...buttonStyle, padding: '8px 10px', fontSize: '0.85rem' }}>
                    Resend invite
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const cardStyle: CSSProperties = {
  marginTop: 16,
  border: '1px solid #e2e8f0',
  background: '#fff',
  borderRadius: 16,
  padding: 14,
  display: 'grid',
  gap: 10,
}

const inputStyle: CSSProperties = {
  padding: '11px 12px',
  border: '1.5px solid #e2e8f0',
  borderRadius: 12,
  fontSize: '0.95rem',
  outline: 'none',
}

const buttonStyle: CSSProperties = {
  border: 'none',
  borderRadius: 10,
  background: '#0f766e',
  color: '#fff',
  fontWeight: 800,
  padding: '10px 12px',
  cursor: 'pointer',
}
