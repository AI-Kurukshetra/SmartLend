'use client'

import { useState, useTransition } from 'react'
import type { CSSProperties } from 'react'
import {
  BadgeDollarSign,
  CheckCircle2,
  FileStack,
  Gavel,
  Layers3,
  ListChecks,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { createLoanProduct } from '@/app/(dashboard)/dashboard/loan-products/actions'

type Product = {
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
}

function money(value: number) {
  return `$${Math.round(value).toLocaleString()}`
}

function titleize(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

function toWorkflowEditorValue(value: string) {
  return value
    .split(',')
    .map((item) => titleize(item.trim()))
    .join(', ')
}

function toWorkflowSubmitValue(value: string) {
  return value
    .split(',')
    .map((item) => item.trim().toLowerCase().replaceAll(' ', '_'))
    .filter(Boolean)
    .join(',')
}

function pricingRulesToEditorValue() {
  return [
    '0-39: +2.5 APR',
    '40-59: +1.0 APR',
    '80-100: -0.5 APR',
  ].join('\n')
}

function pricingRulesToSubmitValue(value: string) {
  const entries = value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(\d+)\s*-\s*(\d+)\s*:\s*([+-]?\d+(?:\.\d+)?)\s*apr?$/i)
      if (!match) return null
      return {
        minScore: Number(match[1]),
        maxScore: Number(match[2]),
        adjustmentApr: Number(match[3]),
      }
    })
    .filter(Boolean)

  return JSON.stringify(entries)
}

export default function LoanProductsPanel({ products }: { products: Product[] }) {
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
    pricing_rate_adjustments: pricingRulesToEditorValue(),
    workflow_template: toWorkflowEditorValue('application_submitted,documents_pending,underwriting,decision,offer,agreement,funding,servicing'),
    min_credit_score: '660',
    min_annual_income: '30000',
    max_debt_to_income_percent: '40',
    allowed_employment_statuses: 'employed,self-employed',
  })

  const activeProducts = products.filter((item) => item.status === 'active').length
  const autoDecisionProducts = products.filter((item) => item.auto_decision_enabled).length
  const avgMaxAmount = products.length
    ? money(products.reduce((sum, item) => sum + Number(item.max_amount || 0), 0) / products.length)
    : '$0'
  const workflowCount = new Set(products.flatMap((item) => item.workflow_template || [])).size

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <section
        style={{
          borderRadius: 28,
          padding: 24,
          background: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 44%, #0f766e 100%)',
          color: '#fff',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', inset: 'auto -8% -45% auto', width: 320, height: 320, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', filter: 'blur(10px)' }} />
        <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 18 }}>
          <div>
            <p style={heroKickerStyle}>Pricing Workspace</p>
            <h1 style={heroTitleStyle}>Configure loan products, pricing bands, and decision policy in one place</h1>
            <p style={heroBodyStyle}>
              Shape your origination catalog with amount ranges, term policy, workflow stages, and credit guardrails that match your portfolio strategy.
            </p>
            <div style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <HeroChip icon={Layers3} label={`${products.length} total products`} />
              <HeroChip icon={ShieldCheck} label={`${autoDecisionProducts} auto-decision enabled`} />
              <HeroChip icon={BadgeDollarSign} label={`${avgMaxAmount} avg max amount`} />
            </div>
          </div>

          <div style={heroPanelStyle}>
            <p style={heroKickerStyle}>Catalog Snapshot</p>
            <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
              <StatRow label="Active products" value={String(activeProducts)} tone="green" />
              <StatRow label="Distinct workflow stages" value={String(workflowCount)} tone="blue" />
              <StatRow label="Manual review products" value={String(products.length - autoDecisionProducts)} tone="amber" />
              <StatRow label="Inactive products" value={String(products.filter((item) => item.status !== 'active').length)} tone="slate" />
            </div>
          </div>
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', gap: 16 }}>
        <div style={panelStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div>
              <h2 style={panelTitleStyle}>Create loan product</h2>
              <p style={panelSubtitleStyle}>Define credit box, pricing behavior, and servicing workflow for a new product.</p>
            </div>
            <div style={pillStyle}>
              <Sparkles size={14} color="#0f766e" />
              Live setup
            </div>
          </div>

          <div style={{ marginTop: 18, display: 'grid', gap: 16 }}>
            <div style={formSectionStyle}>
              <div style={sectionHeaderStyle}>
                <BadgeDollarSign size={16} color="#1d4ed8" />
                Product economics
              </div>
              <div style={inputGridStyle}>
                <Field label="Product name">
                  <input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} style={inputStyle} placeholder="Working capital line" />
                </Field>
                <Field label="Pricing strategy">
                  <select value={form.pricing_strategy} onChange={(e) => setForm((s) => ({ ...s, pricing_strategy: e.target.value }))} style={inputStyle}>
                    <option value="fixed_band">Fixed band</option>
                    <option value="risk_based">Risk based</option>
                    <option value="market_adjusted">Market adjusted</option>
                  </select>
                </Field>
                <Field label="Min amount">
                  <input value={form.min_amount} onChange={(e) => setForm((s) => ({ ...s, min_amount: e.target.value }))} style={inputStyle} />
                </Field>
                <Field label="Max amount">
                  <input value={form.max_amount} onChange={(e) => setForm((s) => ({ ...s, max_amount: e.target.value }))} style={inputStyle} />
                </Field>
                <Field label="Min APR">
                  <input value={form.min_apr} onChange={(e) => setForm((s) => ({ ...s, min_apr: e.target.value }))} style={inputStyle} />
                </Field>
                <Field label="Max APR">
                  <input value={form.max_apr} onChange={(e) => setForm((s) => ({ ...s, max_apr: e.target.value }))} style={inputStyle} />
                </Field>
                <Field label="Market rate index">
                  <input value={form.market_rate_index} onChange={(e) => setForm((s) => ({ ...s, market_rate_index: e.target.value }))} style={inputStyle} />
                </Field>
              </div>
            </div>

            <div style={formSectionStyle}>
              <div style={sectionHeaderStyle}>
                <Gavel size={16} color="#0f766e" />
                Underwriting policy
              </div>
              <div style={inputGridStyle}>
                <Field label="Min term (months)">
                  <input value={form.min_term} onChange={(e) => setForm((s) => ({ ...s, min_term: e.target.value }))} style={inputStyle} />
                </Field>
                <Field label="Max term (months)">
                  <input value={form.max_term} onChange={(e) => setForm((s) => ({ ...s, max_term: e.target.value }))} style={inputStyle} />
                </Field>
                <Field label="Min credit score">
                  <input value={form.min_credit_score} onChange={(e) => setForm((s) => ({ ...s, min_credit_score: e.target.value }))} style={inputStyle} />
                </Field>
                <Field label="Min annual income">
                  <input value={form.min_annual_income} onChange={(e) => setForm((s) => ({ ...s, min_annual_income: e.target.value }))} style={inputStyle} />
                </Field>
                <Field label="Max DTI %">
                  <input value={form.max_debt_to_income_percent} onChange={(e) => setForm((s) => ({ ...s, max_debt_to_income_percent: e.target.value }))} style={inputStyle} />
                </Field>
                <Field label="Employment statuses">
                  <input value={form.allowed_employment_statuses} onChange={(e) => setForm((s) => ({ ...s, allowed_employment_statuses: e.target.value }))} style={inputStyle} />
                </Field>
              </div>
              <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
                <input
                  type="checkbox"
                  checked={form.auto_decision_enabled === 'true'}
                  onChange={(e) => setForm((s) => ({ ...s, auto_decision_enabled: e.target.checked ? 'true' : 'false' }))}
                />
                Enable automatic underwriting decisioning
              </label>
            </div>

            <div style={formSectionStyle}>
              <div style={sectionHeaderStyle}>
                <ListChecks size={16} color="#0f766e" />
                Workflow configuration
              </div>
              <div style={{ display: 'grid', gap: 12 }}>
                <Field label="Pricing rules">
                  <textarea value={form.pricing_rate_adjustments} onChange={(e) => setForm((s) => ({ ...s, pricing_rate_adjustments: e.target.value }))} style={textareaStyle} />
                </Field>
                <Field label="Workflow stages">
                  <textarea value={form.workflow_template} onChange={(e) => setForm((s) => ({ ...s, workflow_template: e.target.value }))} style={textareaStyle} />
                </Field>
              </div>
            </div>
          </div>

          <button
            disabled={isPending}
            onClick={() => {
              setError(null)
              const fd = new FormData()
              Object.entries(form).forEach(([key, value]) => {
                if (key === 'pricing_rate_adjustments') {
                  fd.set(key, pricingRulesToSubmitValue(value))
                  return
                }
                if (key === 'workflow_template') {
                  fd.set(key, toWorkflowSubmitValue(value))
                  return
                }
                fd.set(key, value)
              })
              startTransition(async () => {
                const result = await createLoanProduct(fd)
                if (result?.error) setError(result.error)
                else window.location.reload()
              })
            }}
            style={primaryButtonStyle}
          >
            {isPending ? 'Creating product...' : 'Create loan product'}
          </button>
          {error && <p style={{ marginTop: 12, color: '#dc2626', fontWeight: 700 }}>{error}</p>}
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          <div style={panelStyle}>
            <h2 style={panelTitleStyle}>Existing products</h2>
            <p style={panelSubtitleStyle}>Active origination catalog with pricing and underwriting posture.</p>
            <div style={{ marginTop: 14, display: 'grid', gap: 12 }}>
              {products.length === 0 && <div style={emptyStyle}>No products configured yet.</div>}
              {products.map((product) => (
                <div key={product.id} style={productCardStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ margin: 0, color: 'var(--color-text-primary)', fontWeight: 900, fontSize: '1rem' }}>{product.name}</p>
                      <p style={{ margin: '6px 0 0', color: 'var(--color-text-secondary)', fontSize: '0.84rem', lineHeight: 1.55 }}>
                        {money(product.min_amount)} to {money(product.max_amount)} • {product.min_term_months}-{product.max_term_months} months
                      </p>
                    </div>
                    <span style={statusBadgeStyle(product.status)}>{titleize(product.status)}</span>
                  </div>

                  <div style={metaGridStyle}>
                    <MiniMeta icon={BadgeDollarSign} label="Pricing" value={titleize(product.pricing_strategy || 'fixed')} />
                    <MiniMeta icon={ShieldCheck} label="Decisioning" value={product.auto_decision_enabled ? 'Auto enabled' : 'Manual review'} />
                    <MiniMeta icon={Gavel} label="Credit floor" value={product.min_credit_score ? String(product.min_credit_score) : 'N/A'} />
                    <MiniMeta icon={FileStack} label="Income floor" value={product.min_annual_income ? money(product.min_annual_income) : 'N/A'} />
                  </div>

                  {(product.workflow_template || []).length > 0 && (
                    <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {(product.workflow_template || []).slice(0, 6).map((step) => (
                        <span key={step} style={workflowChipStyle}>
                          {titleize(step)}
                        </span>
                      ))}
                    </div>
                  )}

                  <p style={{ margin: '12px 0 0', color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>
                    {product.market_rate_index ? `Market index ${product.market_rate_index}` : 'No market index linked'}
                    {product.max_debt_to_income ? ` • Max DTI ${(Number(product.max_debt_to_income) * 100).toFixed(0)}%` : ''}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <style jsx>{`
        @media (max-width: 1120px) {
          section[style*='grid-template-columns: 1.1fr 0.9fr'],
          section[style*='grid-template-columns: 1.05fr 0.95fr'] {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 720px) {
          div[style*='grid-template-columns: repeat(2'] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

function HeroChip({ icon: Icon, label }: { icon: React.ComponentType<{ size?: number; color?: string }>; label: string }) {
  return (
    <span style={heroChipStyle}>
      <Icon size={14} color="#fff" />
      {label}
    </span>
  )
}

function StatRow({ label, value, tone }: { label: string; value: string; tone: 'green' | 'blue' | 'amber' | 'slate' }) {
  const palette = {
    green: { dot: '#22c55e', bg: 'rgba(34,197,94,0.16)' },
    blue: { dot: '#60a5fa', bg: 'rgba(96,165,250,0.16)' },
    amber: { dot: '#f59e0b', bg: 'rgba(245,158,11,0.16)' },
    slate: { dot: '#cbd5e1', bg: 'rgba(203,213,225,0.14)' },
  }[tone]
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 12px', borderRadius: 14, background: 'rgba(255,255,255,0.08)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: palette.dot, boxShadow: `0 0 0 6px ${palette.bg}` }} />
        <span style={{ fontWeight: 700 }}>{label}</span>
      </div>
      <span style={{ fontWeight: 900 }}>{value}</span>
    </div>
  )
}

function MiniMeta({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>
  label: string
  value: string
}) {
  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: 14, background: 'var(--gray-50)', padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon size={14} color="#334155" />
        <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', fontWeight: 800 }}>{label}</span>
      </div>
      <p style={{ margin: '8px 0 0', color: 'var(--color-text-primary)', fontWeight: 900, fontSize: '0.92rem' }}>{value}</p>
    </div>
  )
}

const panelStyle: CSSProperties = {
  border: '1px solid var(--color-border)',
  borderRadius: 24,
  background: 'var(--color-surface)',
  padding: 18,
  boxShadow: 'var(--shadow-lg)',
}
const heroKickerStyle: CSSProperties = { margin: 0, fontSize: '0.78rem', fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.74)', opacity: 0.78 }
const heroTitleStyle: CSSProperties = { margin: '10px 0 0', fontSize: '2rem', lineHeight: 1.04, fontWeight: 950, letterSpacing: '-0.04em', color: '#fff' }
const heroBodyStyle: CSSProperties = { margin: '12px 0 0', color: 'rgba(255,255,255,0.82)', lineHeight: 1.7, maxWidth: 620 }
const heroPanelStyle: CSSProperties = { borderRadius: 22, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', padding: 18, backdropFilter: 'blur(10px)' }
const heroChipStyle: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 999, background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.12)', fontWeight: 800, fontSize: '0.82rem' }
const panelTitleStyle: CSSProperties = { margin: 0, color: 'var(--color-text-primary)', fontWeight: 950, fontSize: '1.1rem' }
const panelSubtitleStyle: CSSProperties = { margin: '6px 0 0', color: 'var(--color-text-secondary)', lineHeight: 1.65, fontSize: '0.86rem' }
const pillStyle: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 999, padding: '8px 11px', background: '#ecfeff', border: '1px solid #bae6fd', color: '#0f766e', fontSize: '0.78rem', fontWeight: 900 }
const formSectionStyle: CSSProperties = { border: '1px solid var(--color-border)', borderRadius: 18, background: 'var(--gray-50)', padding: 16 }
const sectionHeaderStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-primary)', fontWeight: 900, fontSize: '0.9rem', marginBottom: 12 }
const inputGridStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }
const labelStyle: CSSProperties = { display: 'block', marginBottom: 6, color: 'var(--color-text-secondary)', fontWeight: 800, fontSize: '0.8rem' }
const inputStyle: CSSProperties = { width: '100%', padding: '11px 12px', border: '1.5px solid var(--color-border)', borderRadius: 12, outline: 'none', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }
const textareaStyle: CSSProperties = { width: '100%', minHeight: 92, padding: '11px 12px', border: '1.5px solid var(--color-border)', borderRadius: 12, outline: 'none', background: 'var(--color-surface)', color: 'var(--color-text-primary)', resize: 'vertical' }
const primaryButtonStyle: CSSProperties = { marginTop: 16, border: 'none', borderRadius: 14, background: 'linear-gradient(135deg, #0f766e 0%, #0f9f8c 100%)', color: '#fff', fontWeight: 900, padding: '13px 16px', cursor: 'pointer' }
const emptyStyle: CSSProperties = { border: '1px dashed var(--color-border)', borderRadius: 16, padding: 14, color: 'var(--color-text-secondary)', background: 'var(--gray-50)' }
const productCardStyle: CSSProperties = { border: '1px solid var(--color-border)', borderRadius: 18, padding: 14, background: 'var(--color-surface)' }
const metaGridStyle: CSSProperties = { marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }
const workflowChipStyle: CSSProperties = { borderRadius: 999, padding: '7px 10px', background: 'var(--gray-50)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)', fontSize: '0.76rem', fontWeight: 800 }

function statusBadgeStyle(status: string): CSSProperties {
  const key = status.toLowerCase()
  const palette: Record<string, { bg: string; fg: string }> = {
    active: { bg: '#dcfce7', fg: '#166534' },
    draft: { bg: '#e2e8f0', fg: '#334155' },
    inactive: { bg: '#fee2e2', fg: '#991b1b' },
  }
  const colors = palette[key] || { bg: '#f1f5f9', fg: '#334155' }
  return {
    borderRadius: 999,
    padding: '7px 10px',
    background: colors.bg,
    color: colors.fg,
    fontSize: '0.78rem',
    fontWeight: 900,
  }
}
