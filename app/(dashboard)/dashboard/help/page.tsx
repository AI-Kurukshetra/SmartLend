import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Help Center',
  description: 'SmartLend help center for lender and borrower operations.',
}

export default function HelpPage() {
  return (
    <div>
      <h1 style={{ margin: 0, fontSize: '1.9rem', fontWeight: 900, color: '#0f172a' }}>Help Center</h1>
      <p style={{ marginTop: 8, color: '#64748b' }}>Operational guidance for key SmartLend workflows.</p>
      <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
        <HelpCard
          title="Org & Team Setup"
          text="Use Onboarding and Team pages to create your organization and invite admin/staff members."
        />
        <HelpCard
          title="Borrower Onboarding"
          text="Use Borrowers page to send borrower magic-link invites, then track accepted status."
        />
        <HelpCard
          title="Application to Funding"
          text="Underwriting updates application status, Funding activates loan accounts, Servicing manages lifecycle."
        />
        <HelpCard
          title="Collections & Support"
          text="Open collection cases from delinquent accounts and process borrower support tickets in Support Inbox."
        />
      </div>
    </div>
  )
}

function HelpCard({ title, text }: { title: string; text: string }) {
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 14, background: '#fff', padding: 14 }}>
      <p style={{ margin: 0, color: '#0f172a', fontWeight: 900 }}>{title}</p>
      <p style={{ margin: '7px 0 0', color: '#64748b', lineHeight: 1.7 }}>{text}</p>
    </div>
  )
}
