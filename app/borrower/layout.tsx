import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { CSSProperties } from 'react'

export default async function BorrowerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <header style={{ borderBottom: '1px solid #e2e8f0', background: '#ffffff' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a' }}>SmartLend Borrower</span>
          <nav style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <Link href="/borrower" style={linkStyle}>Overview</Link>
            <Link href="/borrower/applications" style={linkStyle}>Applications</Link>
            <Link href="/borrower/documents" style={linkStyle}>Documents</Link>
            <Link href="/borrower/payments" style={linkStyle}>Payments</Link>
            <Link href="/borrower/statements" style={linkStyle}>Statements</Link>
            <Link href="/borrower/notifications" style={linkStyle}>Notifications</Link>
            <Link href="/borrower/support" style={linkStyle}>Support</Link>
            <Link href="/post-login?switch=1" style={linkStyle}>Switch Actor</Link>
          </nav>
        </div>
      </header>
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: 20 }}>{children}</main>
    </div>
  )
}

const linkStyle: CSSProperties = {
  color: '#334155',
  textDecoration: 'none',
  fontWeight: 700,
  fontSize: '0.9rem',
}
