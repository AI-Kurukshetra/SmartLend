import type { Metadata } from 'next'
import { BanknoteArrowDown, CalendarClock, NotebookPen, RefreshCcw, WalletCards } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrgId } from '@/lib/authz'
import { formatUiLabel } from '@/lib/utils'
import { addServicingNote, applyLoanModification, updateLoanAccountStatus } from './actions'
import { processAchCollections } from './actions-ach'

export const metadata: Metadata = {
  title: 'Servicing',
  description: 'Loan account servicing and status management.',
}

function money(value: number | null | undefined) {
  return `$${Math.round(Number(value || 0)).toLocaleString()}`
}

export default async function ServicingPage() {
  const supabase = await createClient()
  const orgId = await getCurrentOrgId()
  const accountsRes = await supabase
    .from('loan_accounts')
    .select('id,application_id,borrower_id,principal_balance,status,created_at,autopay_enabled,scheduled_payment_amount,next_payment_due_date,apr,term_months')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(50)

  const items = accountsRes.data || []
  const borrowerIds = Array.from(new Set(items.map((item: any) => item.borrower_id as string)))
  const accountIds = items.map((item: any) => item.id as string)
  const appIds = items.map((item: any) => item.application_id as string)

  const [borrowersRes, appsRes, paymentsRes, notesRes, modificationsRes] = await Promise.all([
    borrowerIds.length > 0
      ? supabase.from('borrower_profiles').select('id,full_name').in('id', borrowerIds)
      : Promise.resolve({ data: [] as any[] }),
    appIds.length > 0
      ? supabase.from('loan_applications').select('id,requested_amount,status').in('id', appIds)
      : Promise.resolve({ data: [] as any[] }),
    accountIds.length > 0
      ? supabase.from('loan_payments').select('loan_account_id,status,amount,due_date').in('loan_account_id', accountIds).limit(500)
      : Promise.resolve({ data: [] as any[] }),
    accountIds.length > 0
      ? supabase.from('servicing_notes').select('id,loan_account_id,note,visibility,created_at').in('loan_account_id', accountIds).order('created_at', { ascending: false }).limit(200)
      : Promise.resolve({ data: [] as any[] }),
    accountIds.length > 0
      ? supabase.from('loan_modifications').select('id,loan_account_id,modification_type,status,effective_date,note,created_at').in('loan_account_id', accountIds).order('created_at', { ascending: false }).limit(200)
      : Promise.resolve({ data: [] as any[] }),
  ])

  const borrowerMap = new Map((borrowersRes.data || []).map((row: any) => [row.id, row]))
  const appMap = new Map((appsRes.data || []).map((row: any) => [row.id, row]))
  const paymentMap = new Map<string, any[]>()
  const noteMap = new Map<string, any[]>()
  const modificationMap = new Map<string, any[]>()

  for (const payment of paymentsRes.data || []) {
    const current = paymentMap.get(payment.loan_account_id) || []
    current.push(payment)
    paymentMap.set(payment.loan_account_id, current)
  }
  for (const note of notesRes.data || []) {
    const current = noteMap.get(note.loan_account_id) || []
    current.push(note)
    noteMap.set(note.loan_account_id, current)
  }
  for (const modification of modificationsRes.data || []) {
    const current = modificationMap.get(modification.loan_account_id) || []
    current.push(modification)
    modificationMap.set(modification.loan_account_id, current)
  }

  const totalBalance = items.reduce((sum: number, item: any) => sum + Number(item.principal_balance || 0), 0)
  const delinquentCount = items.filter((item: any) => item.status === 'delinquent').length
  const autopayCount = items.filter((item: any) => item.autopay_enabled).length
  const dueSoonCount = items.filter((item: any) => item.next_payment_due_date).length

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <section style={{ borderRadius: 28, padding: 24, background: 'linear-gradient(135deg, #0f172a 0%, #155e75 50%, #0f766e 100%)', color: '#fff' }}>
        <p style={eyebrowStyle}>Servicing</p>
        <h1 style={heroTitleStyle}>Manage live account health, payment readiness, and borrower follow-up</h1>
        <p style={heroCopyStyle}>
          Monitor active balances, schedule adjustments, and servicing notes from one operational workspace built for day-two portfolio management.
        </p>
        <form action={processAchCollections} style={{ marginTop: 16 }}>
          <button type="submit" style={heroButtonStyle}>Process due ACH collections</button>
        </form>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
        <StatCard icon={WalletCards} label="Outstanding balance" value={money(totalBalance)} tone="blue" />
        <StatCard icon={RefreshCcw} label="Autopay enabled" value={String(autopayCount)} tone="teal" />
        <StatCard icon={CalendarClock} label="Accounts with due dates" value={String(dueSoonCount)} tone="amber" />
        <StatCard icon={BanknoteArrowDown} label="Delinquent accounts" value={String(delinquentCount)} tone="rose" />
      </section>

      <section style={{ display: 'grid', gap: 14 }}>
        {items.length === 0 && <EmptyState text="No loan accounts yet." />}
        {items.map((item: any) => {
          const payments = paymentMap.get(item.id) || []
          const notes = noteMap.get(item.id) || []
          const modifications = modificationMap.get(item.id) || []
          const borrower = borrowerMap.get(item.borrower_id)
          const app = appMap.get(item.application_id)

          return (
            <article key={item.id} style={panelStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <p style={{ margin: 0, color: 'var(--color-text-primary)', fontSize: '1.08rem', fontWeight: 950 }}>
                    {borrower?.full_name || 'Borrower account'}
                  </p>
                  <p style={{ margin: '6px 0 0', color: 'var(--color-text-secondary)', fontSize: '0.86rem' }}>
                    Account #{item.id.slice(0, 8)} • Application #{String(item.application_id || '').slice(0, 8)} • {formatUiLabel(app?.status || item.status)}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Badge value={item.status} />
                  <form action={updateLoanAccountStatus} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <input type="hidden" name="loan_account_id" value={item.id} />
                    <select name="status" defaultValue={item.status} style={inputStyle}>
                      <option value="active">Active</option>
                      <option value="delinquent">Delinquent</option>
                      <option value="forbearance">Forbearance</option>
                      <option value="paid_off">Paid off</option>
                      <option value="charged_off">Charged off</option>
                    </select>
                    <button type="submit" style={primaryButtonStyle}>Update</button>
                  </form>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
                <Metric label="Principal balance" value={money(item.principal_balance)} />
                <Metric label="Scheduled payment" value={money(item.scheduled_payment_amount)} />
                <Metric label="APR and term" value={`${Number(item.apr || 0).toFixed(2)}% • ${item.term_months || 'N/A'} months`} />
                <Metric label="Next payment due" value={item.next_payment_due_date || 'Not scheduled'} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 14 }}>
                <div style={{ display: 'grid', gap: 14 }}>
                  <SectionCard
                    icon={RefreshCcw}
                    title="Apply account change"
                    subtitle="Restructure payment terms without leaving the servicing queue."
                  >
                    <form action={applyLoanModification} style={{ display: 'grid', gap: 10 }}>
                      <input type="hidden" name="loan_account_id" value={item.id} />
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <select name="modification_type" defaultValue="payment_plan" style={inputStyle}>
                          <option value="payment_plan">Payment plan</option>
                          <option value="forbearance">Forbearance</option>
                          <option value="term_extension">Term extension</option>
                          <option value="apr_change">APR change</option>
                          <option value="manual_adjustment">Manual adjustment</option>
                        </select>
                        <input type="date" name="next_payment_due_date" defaultValue={item.next_payment_due_date || ''} style={inputStyle} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
                        <input type="number" step="0.01" min="0" name="scheduled_payment_amount" defaultValue={item.scheduled_payment_amount || ''} placeholder="Scheduled payment" style={inputStyle} />
                        <input type="number" step="0.01" min="0" name="apr" defaultValue={item.apr || ''} placeholder="APR" style={inputStyle} />
                        <input type="number" min="1" name="term_months" defaultValue={item.term_months || ''} placeholder="Term months" style={inputStyle} />
                      </div>
                      <input name="note" placeholder="Reason for the change" style={inputStyle} />
                      <button type="submit" style={primaryButtonStyle}>Apply change</button>
                    </form>
                  </SectionCard>

                  <SectionCard
                    icon={NotebookPen}
                    title="Servicing note"
                    subtitle="Capture borrower-visible or internal context for the next touchpoint."
                  >
                    <form action={addServicingNote} style={{ display: 'grid', gap: 10 }}>
                      <input type="hidden" name="loan_account_id" value={item.id} />
                      <select name="visibility" defaultValue="internal" style={inputStyle}>
                        <option value="internal">Internal only</option>
                        <option value="borrower">Visible to borrower</option>
                      </select>
                      <textarea name="note" rows={4} placeholder="Write an update, promise to pay, or servicing summary" style={{ ...inputStyle, resize: 'vertical' }} />
                      <button type="submit" style={secondaryButtonStyle}>Save note</button>
                    </form>
                  </SectionCard>
                </div>

                <div style={sectionCardStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={iconWrapStyle('#eef2ff')}>
                      <CalendarClock size={18} color="#4338ca" />
                    </div>
                    <div>
                      <h2 style={sectionTitleStyle}>Recent activity</h2>
                      <p style={sectionSubtitleStyle}>Payments, modifications, and notes attached to this account.</p>
                    </div>
                  </div>

                  <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
                    <ActivityRow
                      label="Posted payments"
                      value={String(payments.filter((payment: any) => payment.status === 'posted').length)}
                    />
                    <ActivityRow
                      label="Scheduled payments"
                      value={String(payments.filter((payment: any) => payment.status === 'scheduled').length)}
                    />
                    {modifications.slice(0, 2).map((mod: any) => (
                      <MiniCard
                        key={mod.id}
                        title={formatUiLabel(mod.modification_type)}
                        caption={`${mod.effective_date || 'Pending date'} • ${formatUiLabel(mod.status)}`}
                      />
                    ))}
                    {notes.slice(0, 2).map((note: any) => (
                      <MiniCard
                        key={note.id}
                        title={note.note}
                        caption={`${formatUiLabel(note.visibility)} • ${new Date(note.created_at).toLocaleDateString()}`}
                      />
                    ))}
                    {payments.length === 0 && modifications.length === 0 && notes.length === 0 && (
                      <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.88rem' }}>No servicing activity logged yet.</div>
                    )}
                  </div>
                </div>
              </div>
            </article>
          )
        })}
      </section>

      <style>{responsiveStyles}</style>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>
  label: string
  value: string
  tone: 'blue' | 'teal' | 'amber' | 'rose'
}) {
  const palette = {
    blue: { bg: '#eff6ff', border: '#bfdbfe', fg: '#1d4ed8' },
    teal: { bg: '#ecfeff', border: '#a5f3fc', fg: '#0f766e' },
    amber: { bg: '#fffbeb', border: '#fde68a', fg: '#b45309' },
    rose: { bg: '#fff1f2', border: '#fecdd3', fg: '#be123c' },
  }[tone]

  return (
    <div style={statCardStyle}>
      <div style={{ ...iconWrapStyle(palette.bg), border: `1px solid ${palette.border}` }}>
        <Icon size={18} color={palette.fg} />
      </div>
      <p style={metricLabelStyle}>{label}</p>
      <p style={statValueStyle}>{value}</p>
    </div>
  )
}

function SectionCard({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <div style={sectionCardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={iconWrapStyle('#ecfeff')}>
          <Icon size={18} color="#0f766e" />
        </div>
        <div>
          <h2 style={sectionTitleStyle}>{title}</h2>
          <p style={sectionSubtitleStyle}>{subtitle}</p>
        </div>
      </div>
      <div style={{ marginTop: 14 }}>{children}</div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={metricCardStyle}>
      <p style={metricLabelStyle}>{label}</p>
      <p style={metricValueStyle}>{value}</p>
    </div>
  )
}

function ActivityRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', border: '1px solid var(--color-border)', borderRadius: 14, background: 'var(--gray-50)', padding: '12px 14px' }}>
      <span style={{ color: 'var(--color-text-secondary)', fontWeight: 800, fontSize: '0.82rem' }}>{label}</span>
      <span style={{ color: 'var(--color-text-primary)', fontWeight: 900 }}>{value}</span>
    </div>
  )
}

function MiniCard({ title, caption }: { title: string; caption: string }) {
  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: 14, background: 'var(--color-surface)', padding: 12 }}>
      <p style={{ margin: 0, color: 'var(--color-text-primary)', fontWeight: 900, fontSize: '0.88rem', lineHeight: 1.45 }}>{title}</p>
      <p style={{ margin: '6px 0 0', color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>{caption}</p>
    </div>
  )
}

function Badge({ value }: { value: string }) {
  return (
    <span style={{ borderRadius: 999, padding: '7px 11px', background: '#eef2ff', color: '#3730a3', fontSize: '0.78rem', fontWeight: 900 }}>
      {formatUiLabel(value)}
    </span>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div style={{ border: '1px dashed var(--color-border)', borderRadius: 18, background: 'var(--color-surface)', padding: 18, color: 'var(--color-text-secondary)' }}>
      {text}
    </div>
  )
}

const responsiveStyles = `
  @media (max-width: 1180px) {
    section[style*='grid-template-columns: repeat(4'] { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
    article[style*='grid-template-columns: 1.1fr 1fr'] { grid-template-columns: 1fr !important; }
  }
  @media (max-width: 760px) {
    section[style*='grid-template-columns: repeat(4'] { grid-template-columns: 1fr !important; }
    div[style*='grid-template-columns: repeat(4, minmax(0, 1fr))'] { grid-template-columns: 1fr !important; }
    div[style*='grid-template-columns: 1fr 1fr'] { grid-template-columns: 1fr !important; }
    div[style*='grid-template-columns: repeat(3, minmax(0, 1fr))'] { grid-template-columns: 1fr !important; }
  }
`

const eyebrowStyle = {
  margin: 0,
  fontSize: '0.78rem',
  fontWeight: 900,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  opacity: 0.78,
} satisfies React.CSSProperties

const heroTitleStyle = {
  margin: '10px 0 0',
  fontSize: '2rem',
  lineHeight: 1.04,
  fontWeight: 950,
  letterSpacing: '-0.04em',
  maxWidth: 820,
} satisfies React.CSSProperties

const heroCopyStyle = {
  margin: '12px 0 0',
  maxWidth: 680,
  color: 'rgba(255,255,255,0.82)',
  lineHeight: 1.7,
} satisfies React.CSSProperties

const heroButtonStyle = {
  border: '1px solid rgba(255,255,255,0.18)',
  borderRadius: 14,
  background: 'rgba(255,255,255,0.12)',
  color: '#fff',
  fontWeight: 900,
  padding: '12px 14px',
  cursor: 'pointer',
  backdropFilter: 'blur(14px)',
} satisfies React.CSSProperties

const panelStyle = {
  border: '1px solid var(--color-border)',
  borderRadius: 24,
  background: 'var(--color-surface)',
  padding: 18,
  display: 'grid',
  gap: 14,
  boxShadow: 'var(--shadow-lg)',
} satisfies React.CSSProperties

const statCardStyle = {
  border: '1px solid var(--color-border)',
  borderRadius: 22,
  background: 'var(--color-surface)',
  padding: 16,
  boxShadow: 'var(--shadow-lg)',
} satisfies React.CSSProperties

const sectionCardStyle = {
  border: '1px solid var(--color-border)',
  borderRadius: 22,
  background: 'var(--color-surface)',
  padding: 16,
  boxShadow: 'var(--shadow-lg)',
} satisfies React.CSSProperties

const metricCardStyle = {
  border: '1px solid var(--color-border)',
  borderRadius: 16,
  background: 'var(--gray-50)',
  padding: 12,
} satisfies React.CSSProperties

const iconWrapStyle = (background: string) => ({
  width: 44,
  height: 44,
  borderRadius: 14,
  background,
  display: 'grid',
  placeItems: 'center',
})

const sectionTitleStyle = {
  margin: 0,
  color: 'var(--color-text-primary)',
  fontWeight: 950,
  fontSize: '1rem',
} satisfies React.CSSProperties

const sectionSubtitleStyle = {
  margin: '4px 0 0',
  color: 'var(--color-text-secondary)',
  fontSize: '0.82rem',
  lineHeight: 1.55,
} satisfies React.CSSProperties

const metricLabelStyle = {
  margin: 0,
  color: 'var(--color-text-secondary)',
  fontWeight: 800,
  fontSize: '0.82rem',
} satisfies React.CSSProperties

const metricValueStyle = {
  margin: '6px 0 0',
  color: 'var(--color-text-primary)',
  fontWeight: 900,
  fontSize: '0.95rem',
  lineHeight: 1.4,
} satisfies React.CSSProperties

const statValueStyle = {
  margin: '8px 0 0',
  color: 'var(--color-text-primary)',
  fontWeight: 950,
  fontSize: '1.7rem',
} satisfies React.CSSProperties

const inputStyle = {
  width: '100%',
  borderRadius: 14,
  border: '1.5px solid var(--color-border)',
  padding: '12px 14px',
  fontSize: '0.9rem',
  background: 'var(--color-surface)',
  color: 'var(--color-text-primary)',
} satisfies React.CSSProperties

const primaryButtonStyle = {
  border: 'none',
  borderRadius: 14,
  background: 'linear-gradient(135deg, #0f766e 0%, #0ea5a4 100%)',
  color: '#fff',
  fontWeight: 900,
  padding: '12px 14px',
  cursor: 'pointer',
} satisfies React.CSSProperties

const secondaryButtonStyle = {
  border: 'none',
  borderRadius: 14,
  background: '#0f172a',
  color: '#fff',
  fontWeight: 900,
  padding: '12px 14px',
  cursor: 'pointer',
} satisfies React.CSSProperties
