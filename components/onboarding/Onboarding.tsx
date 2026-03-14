'use client'

import { useMemo, useState, useTransition } from 'react'
import { createOrganization, acceptInvite } from '@/app/onboarding/actions'

export default function Onboarding({
  userId,
  inviteToken,
}: {
  userId: string | null
  inviteToken: string | null
}) {
  const [orgName, setOrgName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const heading = useMemo(() => {
    if (inviteToken) return 'You have been invited'
    return 'Create your organization'
  }, [inviteToken])

  const sub = useMemo(() => {
    if (inviteToken) return 'Join your team workspace to access SmartLend features.'
    return 'SmartLend is organization-first. Create an organization to unlock the dashboard, analytics, and settings.'
  }, [inviteToken])

  if (!userId) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
        <div style={{ maxWidth: 520, width: '100%', border: '1px solid #e2e8f0', borderRadius: 18, padding: 24, background: '#fff' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#0f172a' }}>Sign in required</h1>
          <p style={{ margin: '10px 0 0', color: '#64748b', lineHeight: 1.7 }}>
            Please sign in to continue onboarding.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #f8fbfd 0%, #eef5f7 100%)', padding: 24 }}>
      <div style={{ maxWidth: 920, margin: '0 auto', paddingTop: 72 }}>
        <div style={{ maxWidth: 640 }}>
          <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 950, letterSpacing: '-0.04em', margin: 0, color: '#0f172a' }}>
            {heading}
          </h1>
          <p style={{ margin: '14px 0 0', color: '#334155', lineHeight: 1.8, fontSize: '1rem' }}>
            {sub}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 18, marginTop: 28 }}>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 22, background: '#fff', padding: 22 }}>
            {!inviteToken ? (
              <>
                <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a' }}>Organization setup</h2>
                <p style={{ margin: '8px 0 18px', color: '#64748b', lineHeight: 1.7 }}>
                  You will be the first admin. You can invite staff after setup.
                </p>

                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: 8 }}>
                  Organization name
                </label>
                <input
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="SmartLend Demo Bank"
                  style={{
                    width: '100%',
                    padding: '14px 14px',
                    borderRadius: 14,
                    border: '1.5px solid #e2e8f0',
                    fontSize: '1rem',
                    outline: 'none',
                  }}
                />

                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                  <button
                    disabled={isPending}
                    onClick={() => {
                      setError(null)
                      startTransition(async () => {
                        const res = await createOrganization(orgName)
                        if (res?.error) setError(res.error)
                      })
                    }}
                    style={{
                      padding: '13px 18px',
                      borderRadius: 14,
                      border: 'none',
                      background: '#0f766e',
                      color: '#fff',
                      fontWeight: 900,
                      cursor: isPending ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isPending ? 'Creating...' : 'Create organization'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a' }}>Accept invite</h2>
                <p style={{ margin: '8px 0 18px', color: '#64748b', lineHeight: 1.7 }}>
                  This invite will attach your account to an existing SmartLend organization.
                </p>
                <button
                  disabled={isPending}
                  onClick={() => {
                    setError(null)
                    startTransition(async () => {
                      const res = await acceptInvite(inviteToken)
                      if (res?.error) setError(res.error)
                    })
                  }}
                  style={{
                    padding: '13px 18px',
                    borderRadius: 14,
                    border: 'none',
                    background: '#1d4ed8',
                    color: '#fff',
                    fontWeight: 900,
                    cursor: isPending ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isPending ? 'Joining...' : 'Join organization'}
                </button>
              </>
            )}

            {error && <p style={{ marginTop: 14, color: '#dc2626', fontWeight: 700 }}>{error}</p>}
          </div>

          <div style={{ border: '1px solid #e2e8f0', borderRadius: 22, background: '#fff', padding: 22 }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>Why this step?</h3>
            <p style={{ margin: '10px 0 0', color: '#64748b', lineHeight: 1.75 }}>
              SmartLend separates lender staff roles (admin, staff) and scopes access by organization. Until an organization exists,
              the app hides dashboard features to prevent orphaned data and permission gaps.
            </p>
          </div>
        </div>

        <style jsx>{`
          @media (max-width: 860px) {
            div[style*='grid-template-columns'] {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </div>
    </div>
  )
}
