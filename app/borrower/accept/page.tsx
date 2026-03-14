import { redirect } from 'next/navigation'
import { acceptBorrowerInvite } from '@/app/(dashboard)/dashboard/borrowers/actions'

export default async function BorrowerAcceptPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>
}) {
  const invite = (await searchParams).invite ?? ''
  if (!invite) redirect('/borrower/onboarding')

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
