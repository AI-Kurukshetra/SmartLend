'use client'

import { useState, useTransition } from 'react'
import { useEffect } from 'react'
import type { CSSProperties } from 'react'
import { submitBorrowerApplication } from '@/app/borrower/applications/new/actions'

export default function NewApplicationForm({
  orgOptions,
  productOptions,
}: {
  orgOptions: Array<{ id: string; name: string }>
  productOptions: Array<{ id: string; name: string; orgId: string; minAmount: number; maxAmount: number; minTerm: number; maxTerm: number }>
}) {
  const [amount, setAmount] = useState('10000')
  const [term, setTerm] = useState('60')
  const [orgId, setOrgId] = useState(orgOptions[0]?.id || '')
  const initialProductId = productOptions.find((p) => p.orgId === (orgOptions[0]?.id || ''))?.id || ''
  const [loanProductId, setLoanProductId] = useState(initialProductId)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const draftKey = 'smartlend.borrower.application.draft'
  const filteredProducts = productOptions.filter((p) => p.orgId === orgId)

  useEffect(() => {
    const raw = window.localStorage.getItem(draftKey)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as { amount?: string; term?: string; orgId?: string; loanProductId?: string }
      if (parsed.amount) setAmount(parsed.amount)
      if (parsed.term) setTerm(parsed.term)
      if (parsed.orgId && orgOptions.some((o) => o.id === parsed.orgId)) setOrgId(parsed.orgId)
      if (parsed.loanProductId && productOptions.some((p) => p.id === parsed.loanProductId)) setLoanProductId(parsed.loanProductId)
    } catch {
      // ignore malformed draft
    }
  }, [orgOptions, productOptions])

  useEffect(() => {
    if (!filteredProducts.some((p) => p.id === loanProductId)) {
      setLoanProductId(filteredProducts[0]?.id || '')
    }
  }, [filteredProducts, loanProductId])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(draftKey, JSON.stringify({ amount, term, orgId, loanProductId }))
    }, 400)
    return () => window.clearTimeout(timer)
  }, [amount, term, orgId, loanProductId])

  if (orgOptions.length === 0) {
    return (
      <div style={{ maxWidth: 760 }}>
        <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900, color: '#0f172a' }}>New loan application</h1>
        <p style={{ marginTop: 8, color: '#64748b', lineHeight: 1.7 }}>
          No lender organization has invited this borrower account yet. Ask your lender admin to send a borrower invite.
        </p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 760 }}>
      <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900, color: '#0f172a' }}>New loan application</h1>
      <p style={{ marginTop: 8, color: '#64748b', lineHeight: 1.7 }}>
        Create a SmartLend application draft, then complete the full borrower portal with documents and e-signature.
      </p>
      <div style={{ marginTop: 16, border: '1px solid #e2e8f0', borderRadius: 16, background: '#fff', padding: 16 }}>
        <label style={labelStyle}>Lender organization</label>
        <select value={orgId} onChange={(e) => setOrgId(e.target.value)} style={inputStyle}>
          {orgOptions.map((org) => (
            <option key={org.id} value={org.id}>{org.name}</option>
          ))}
        </select>
        <label style={labelStyle}>Loan product</label>
        <select value={loanProductId} onChange={(e) => setLoanProductId(e.target.value)} style={inputStyle}>
          {filteredProducts.length === 0 && <option value="">No published products</option>}
          {filteredProducts.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name} | ${product.minAmount.toLocaleString()}-${product.maxAmount.toLocaleString()} | {product.minTerm}-{product.maxTerm} months
            </option>
          ))}
        </select>
        <label style={labelStyle}>Requested amount</label>
        <input value={amount} onChange={(e) => setAmount(e.target.value)} style={inputStyle} type="number" />
        <label style={labelStyle}>Term (months)</label>
        <input value={term} onChange={(e) => setTerm(e.target.value)} style={inputStyle} type="number" />
        <button
          onClick={() => {
            setError(null)
            const fd = new FormData()
            fd.set('org_id', orgId)
            fd.set('loan_product_id', loanProductId)
            fd.set('amount', amount)
            fd.set('term_months', term)
            startTransition(async () => {
              const result = await submitBorrowerApplication(fd)
              if (result?.error) setError(result.error)
              else window.localStorage.removeItem(draftKey)
            })
          }}
          disabled={isPending}
          style={{ marginTop: 14, border: 'none', borderRadius: 10, background: '#0f766e', color: '#fff', fontWeight: 800, padding: '11px 14px', cursor: isPending ? 'not-allowed' : 'pointer' }}
        >
          {isPending ? 'Creating draft...' : 'Continue to application portal'}
        </button>
        {error && <p style={{ marginTop: 10, color: '#dc2626', fontWeight: 700 }}>{error}</p>}
      </div>
    </div>
  )
}

const labelStyle: CSSProperties = {
  display: 'block',
  marginTop: 12,
  marginBottom: 6,
  color: '#475569',
  fontWeight: 700,
}

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1.5px solid #e2e8f0',
  borderRadius: 10,
  outline: 'none',
}
