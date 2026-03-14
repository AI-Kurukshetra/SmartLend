import type { Metadata } from 'next'
import { BookOpenCheck, HandCoins, LifeBuoy, Users } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Help Center',
  description: 'SmartLend help center for lender and borrower operations.',
}

const cards = [
  {
    title: 'Org and team setup',
    text: 'Use onboarding and team settings to create your organization, define roles, and invite internal members with the right permission set.',
    icon: Users,
  },
  {
    title: 'Borrower onboarding',
    text: 'Use the Borrowers page to send secure invite links, track acceptance, and move applicants into the origination flow.',
    icon: Users,
  },
  {
    title: 'Application to funding',
    text: 'Underwriting moves files through decisioning, Funding activates approved loans, and Servicing manages the live account lifecycle.',
    icon: HandCoins,
  },
  {
    title: 'Collections and support',
    text: 'Use Collections to manage delinquency workflows and Support Inbox to track borrower issues through resolution.',
    icon: LifeBuoy,
  },
]

export default function HelpPage() {
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <section style={{ borderRadius: 28, padding: 24, background: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 46%, #0f766e 100%)', color: '#fff' }}>
        <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.74)', opacity: 0.78 }}>Help Center</p>
        <h1 style={{ margin: '10px 0 0', fontSize: '2rem', lineHeight: 1.04, fontWeight: 950, letterSpacing: '-0.04em', color: '#fff' }}>Operational guidance for key SmartLend workflows</h1>
        <p style={{ margin: '12px 0 0', maxWidth: 620, color: 'rgba(255,255,255,0.82)', lineHeight: 1.7 }}>
          Use this page as a quick internal guide for onboarding, origination, funding, servicing, and support workflows.
        </p>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <div key={card.title} style={{ border: '1px solid var(--color-border)', borderRadius: 24, background: 'var(--color-surface)', padding: 18, boxShadow: 'var(--shadow-lg)' }}>
              <div style={{ width: 46, height: 46, borderRadius: 16, background: '#eff6ff', border: '1px solid #bfdbfe', display: 'grid', placeItems: 'center' }}>
                <Icon size={18} color="#1d4ed8" />
              </div>
              <p style={{ margin: '14px 0 0', color: 'var(--color-text-primary)', fontWeight: 950, fontSize: '1.02rem' }}>{card.title}</p>
              <p style={{ margin: '8px 0 0', color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>{card.text}</p>
            </div>
          )
        })}
      </section>

      <section style={{ border: '1px solid var(--color-border)', borderRadius: 24, background: 'var(--color-surface)', padding: 18, boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 42, height: 42, borderRadius: 14, background: '#ecfeff', border: '1px solid #bae6fd', display: 'grid', placeItems: 'center' }}>
            <BookOpenCheck size={18} color="#0f766e" />
          </div>
          <div>
            <h2 style={{ margin: 0, color: 'var(--color-text-primary)', fontWeight: 950, fontSize: '1.05rem' }}>Recommended operating pattern</h2>
            <p style={{ margin: '4px 0 0', color: 'var(--color-text-secondary)', fontSize: '0.84rem' }}>Keep teams aligned around one predictable lender workflow.</p>
          </div>
        </div>
        <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
          {['Review borrower readiness in Applications', 'Confirm engine and manual decisions in Underwriting', 'Complete funding handoff in Funding', 'Monitor live accounts in Servicing and Collections'].map((item) => (
            <div key={item} style={{ border: '1px solid var(--color-border)', borderRadius: 14, background: 'var(--gray-50)', padding: '12px 14px', color: 'var(--color-text-primary)', fontWeight: 800 }}>
              {item}
            </div>
          ))}
        </div>
      </section>

      <style>{`
        @media (max-width: 760px) {
          section[style*='grid-template-columns: repeat(2'] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
