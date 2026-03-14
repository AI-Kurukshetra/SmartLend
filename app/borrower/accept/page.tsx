import { redirect } from 'next/navigation'
import { acceptBorrowerInvite, getBorrowerInviteDetails } from '@/app/(dashboard)/dashboard/borrowers/actions'
import BorrowerInviteSetup from '@/components/borrower/BorrowerInviteSetup'
import { createClient } from '@/lib/supabase/server'

export default async function BorrowerAcceptPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>
}) {
  const invite = (await searchParams).invite ?? ''
  if (!invite) redirect('/borrower/onboarding')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const inviteDetails = await getBorrowerInviteDetails(invite)
    if (!inviteDetails) {
      return (
        <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--color-bg)', padding: 20 }}>
          <div style={{ width: '100%', maxWidth: 560, border: '1px solid var(--color-border)', background: 'var(--color-surface)', borderRadius: 16, padding: 18 }}>
            <h1 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--color-text-primary)' }}>Borrower invite failed</h1>
            <p style={{ margin: '8px 0 0', color: '#b91c1c', fontWeight: 700 }}>This invite is invalid, expired, or already accepted.</p>
          </div>
        </div>
      )
    }

    return <BorrowerInviteSetup invite={invite} inviteEmail={inviteDetails.email} orgName={inviteDetails.orgName} expiresAt={inviteDetails.expiresAt} />
  }

  const result = await acceptBorrowerInvite(invite)
  if (result?.error) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f8fafc', padding: 20 }}>
        <div style={{ width: '100%', maxWidth: 560, border: '1px solid #e2e8f0', background: '#fff', borderRadius: 16, padding: 18 }}>
          <h1 style={{ margin: 0, fontSize: '1.3rem', color: '#0f172a' }}>Borrower invite failed</h1>
          <p style={{ margin: '8px 0 0', color: '#b91c1c', fontWeight: 700 }}>{result.error}</p>
        </div>
      </div>
    )
  }

  redirect('/borrower/onboarding')
}
