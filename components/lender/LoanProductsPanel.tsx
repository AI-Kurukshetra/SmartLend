'use client'

import { useState, useTransition } from 'react'
import type { CSSProperties } from 'react'
import { createLoanProduct } from '@/app/(dashboard)/dashboard/loan-products/actions'

export default function LoanProductsPanel({
  products,
}: {
  products: Array<{
    id: string
    name: string
    status: string
    min_amount: number
    max_amount: number
    min_term_months: number
    max_term_months: number
    pricing_strategy?: string
    market_rate_index?: number | null
    workflow_template?: string[]
    auto_decision_enabled?: boolean
    min_credit_score?: number | null
    min_annual_income?: number | null
    max_debt_to_income?: number | null
  }>
}) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({
    name: '',
    min_amount: '1000',
    max_amount: '50000',
    min_term: '12',
    max_term: '60',
    min_apr: '8.5',
    max_apr: '22',
    auto_decision_enabled: 'true',
    pricing_strategy: 'risk_based',
    market_rate_index: '0',
    pricing_rate_adjustments: '[{\"minScore\":0,\"maxScore\":39,\"adjustmentApr\":2.5},{\"minScore\":40,\"maxScore\":59,\"adjustmentApr\":1},{\"minScore\":80,\"maxScore\":100,\"adjustmentApr\":-0.5}]',
    workflow_template: 'application_submitted,documents_pending,underwriting,decision,offer,agreement,funding,servicing',
    min_credit_score: '660',
    min_annual_income: '30000',
    max_debt_to_income_percent: '40',
    allowed_employment_statuses: 'employed,self-employed',
  })

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      <div style={cardStyle}>
        <h2 style={h2Style}>Create loan product</h2>
        <p style={subtitleStyle}>Configure amount, term, and APR ranges.</p>
        {(
          [
            ['name', 'Name'],
            ['min_amount', 'Min amount'],
            ['max_amount', 'Max amount'],
            ['min_term', 'Min term (months)'],
            ['max_term', 'Max term (months)'],
            ['min_apr', 'Min APR'],
            ['max_apr', 'Max APR'],
            ['pricing_strategy', 'Pricing strategy'],
            ['market_rate_index', 'Market rate index'],
            ['pricing_rate_adjustments', 'Pricing adjustments JSON'],
            ['workflow_template', 'Workflow template'],
            ['min_credit_score', 'Min credit score'],
            ['min_annual_income', 'Min annual income'],
            ['max_debt_to_income_percent', 'Max DTI %'],
            ['allowed_employment_statuses', 'Allowed employment statuses'],
          ] as const
        ).map(([key, label]) => (
          <div key={key} style={{ marginTop: 10 }}>
            <label style={labelStyle}>{label}</label>
            <input
              value={form[key]}
              onChange={(e) => setForm((s) => ({ ...s, [key]: e.target.value }))}
              style={inputStyle}
            />
          </div>
        ))}
        <div style={{ marginTop: 10 }}>
          <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={form.auto_decision_enabled === 'true'}
              onChange={(e) => setForm((s) => ({ ...s, auto_decision_enabled: e.target.checked ? 'true' : 'false' }))}
            />
            Enable automatic underwriting decision
          </label>
        </div>
        <button
          disabled={isPending}
          onClick={() => {
            setError(null)
            const fd = new FormData()
            Object.entries(form).forEach(([k, v]) => fd.set(k, v))
            startTransition(async () => {
              const result = await createLoanProduct(fd)
              if (result?.error) setError(result.error)
              else window.location.reload()
            })
          }}
          style={buttonStyle}
        >
          {isPending ? 'Creating...' : 'Create product'}
        </button>
        {error && <p style={{ marginTop: 10, color: '#dc2626', fontWeight: 700 }}>{error}</p>}
      </div>

      <div style={cardStyle}>
        <h2 style={h2Style}>Existing products</h2>
        <p style={subtitleStyle}>Org-scoped origination products.</p>
        <div style={{ marginTop: 8, display: 'grid', gap: 10 }}>
          {products.length === 0 && <div style={emptyStyle}>No products yet.</div>}
          {products.map((product) => (
            <div key={product.id} style={rowStyle}>
              <div>
                <p style={{ margin: 0, color: '#0f172a', fontWeight: 800 }}>{product.name}</p>
                <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '0.84rem' }}>
                  ${Number(product.min_amount).toLocaleString()} - ${Number(product.max_amount).toLocaleString()} | {product.min_term_months}-{product.max_term_months} months
                </p>
                <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '0.8rem' }}>
                  {product.pricing_strategy ? `${product.pricing_strategy} pricing` : 'fixed pricing'}{product.market_rate_index ? ` | market index ${product.market_rate_index}` : ''}{product.workflow_template?.length ? ` | workflow ${product.workflow_template.join(' > ')}` : ''}
                </p>
                <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '0.8rem' }}>
                  {product.auto_decision_enabled ? 'auto-decision on' : 'manual review'}{product.min_credit_score ? ` | min score ${product.min_credit_score}` : ''}{product.min_annual_income ? ` | min income $${Number(product.min_annual_income).toLocaleString()}` : ''}{product.max_debt_to_income ? ` | max DTI ${(Number(product.max_debt_to_income) * 100).toFixed(0)}%` : ''}
                </p>
              </div>
              <span style={badgeStyle}>{product.status}</span>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 920px) {
          div[style*='grid-template-columns'] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}

const cardStyle: CSSProperties = { border: '1px solid #e2e8f0', borderRadius: 16, padding: 16, background: '#fff' }
const h2Style: CSSProperties = { margin: 0, color: '#0f172a', fontWeight: 900, fontSize: '1.2rem' }
const subtitleStyle: CSSProperties = { margin: '8px 0 0', color: '#64748b', lineHeight: 1.7 }
const labelStyle: CSSProperties = { display: 'block', marginBottom: 6, color: '#475569', fontWeight: 700, fontSize: '0.85rem' }
const inputStyle: CSSProperties = { width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 10, outline: 'none' }
const buttonStyle: CSSProperties = { marginTop: 14, border: 'none', borderRadius: 10, background: '#0f766e', color: '#fff', fontWeight: 800, padding: '11px 14px' }
const emptyStyle: CSSProperties = { border: '1px dashed #cbd5e1', borderRadius: 12, padding: 12, color: '#64748b' }
const rowStyle: CSSProperties = { border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }
const badgeStyle: CSSProperties = { borderRadius: 999, background: '#f1f5f9', color: '#334155', padding: '6px 10px', fontSize: '0.8rem', fontWeight: 800 }
