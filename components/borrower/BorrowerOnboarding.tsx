'use client'

import { useState, useTransition } from 'react'
import { createBorrowerProfile } from '@/app/borrower/onboarding/actions'

export default function BorrowerOnboarding() {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #f8fbfd 0%, #eef5f7 100%)', padding: 24 }}>
      <div style={{ maxWidth: 760, margin: '0 auto', paddingTop: 72 }}>
        <h1 style={{ margin: 0, fontSize: 'clamp(2rem, 4vw, 2.8rem)', fontWeight: 950, letterSpacing: '-0.04em', color: '#0f172a' }}>
          Borrower onboarding
        </h1>
        <p style={{ margin: '12px 0 0', color: '#334155', lineHeight: 1.8 }}>
          Complete your borrower profile to access applications, documents, payments, and support.
        </p>

        <div style={{ marginTop: 20, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: 20 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 700, color: '#475569' }}>Full name</label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Marcus Reed"
            style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #e2e8f0', borderRadius: 12, outline: 'none' }}
          />
          <label style={{ display: 'block', margin: '14px 0 8px', fontWeight: 700, color: '#475569' }}>Phone</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 555 123 4567"
            style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #e2e8f0', borderRadius: 12, outline: 'none' }}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, color: '#334155', fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
            />
            I accept SmartLend borrower terms and privacy policy.
          </label>

          <button
            onClick={() => {
              setError(null)
              const fd = new FormData()
              fd.set('full_name', fullName)
              fd.set('phone', phone)
              fd.set('accepted_terms', acceptedTerms ? 'true' : 'false')
              startTransition(async () => {
                const result = await createBorrowerProfile(fd)
                if (result?.error) setError(result.error)
              })
            }}
            disabled={isPending}
            style={{ marginTop: 16, border: 'none', borderRadius: 12, padding: '12px 16px', background: '#0f766e', color: '#fff', fontWeight: 800, cursor: isPending ? 'not-allowed' : 'pointer' }}
          >
            {isPending ? 'Saving...' : 'Complete onboarding'}
          </button>

          {error && <p style={{ marginTop: 10, color: '#dc2626', fontWeight: 700 }}>{error}</p>}
        </div>
      </div>
    </div>
  )
}
