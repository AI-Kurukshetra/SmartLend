import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { CSSProperties } from 'react'
import { createClient } from '@/lib/supabase/server'
import { chooseActor } from './actions'

export default async function PostLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ switch?: string }>
}) {
  const forceSwitch = (await searchParams).switch === '1'
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [membershipRes, borrowerRes, profileRes] = await Promise.all([
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

  const hasLender = Boolean(membershipRes.data?.id)
  const hasBorrower = Boolean(borrowerRes.data?.id)
  const lastActor = profileRes.data?.last_actor as 'lender' | 'borrower' | undefined

  if (hasLender && hasBorrower && !forceSwitch) {
    if (lastActor === 'borrower') redirect('/borrower')
    redirect('/dashboard')
  }
  if (hasLender && !hasBorrower) redirect('/dashboard')
  if (!hasLender && hasBorrower) redirect('/borrower')
  if (!hasLender && !hasBorrower) redirect('/onboarding')

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f8fafc', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 520, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, padding: 20 }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#0f172a' }}>Choose workspace</h1>
        <p style={{ margin: '8px 0 16px', color: '#475569', lineHeight: 1.7 }}>
          Your account can access both lender and borrower experiences.
        </p>
        <div style={{ display: 'grid', gap: 10 }}>
          <form action={chooseActor.bind(null, 'lender')}>
            <button style={buttonStyle} type="submit">Continue as lender</button>
          </form>
          <form action={chooseActor.bind(null, 'borrower')}>
            <button style={buttonStyle} type="submit">Continue as borrower</button>
          </form>
        </div>
        <p style={{ margin: '14px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
          You can switch later from <Link href="/post-login?switch=1">actor switcher</Link>.
        </p>
      </div>
    </div>
  )
}

const buttonStyle: CSSProperties = {
  width: '100%',
  border: '1px solid #cbd5e1',
  background: '#fff',
  color: '#0f172a',
  borderRadius: 12,
  padding: '12px 14px',
  fontWeight: 800,
  cursor: 'pointer',
}
