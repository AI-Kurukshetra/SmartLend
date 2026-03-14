import type { Metadata } from 'next'
import { ArrowDownLeft, ArrowUpRight, CalendarClock, Landmark, RotateCcw, WalletCards, XCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrgId } from '@/lib/authz'
import { formatUiLabel } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Transactions',
  description: 'Transaction feed for payments and settlement activity.',
}

function money(value: number) {
  return `$${Math.round(value).toLocaleString()}`
}

function timeAgo(value: string | null) {
  if (!value) return 'Pending'
  const diff = Date.now() - new Date(value).getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default async function TransactionsPage() {
  const supabase = await createClient()
  const orgId = await getCurrentOrgId()

  const res = await supabase
    .from('loan_payments')
    .select('id,loan_account_id,amount,status,payment_method,external_reference,posted_at,due_date,created_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(120)

  const items = res.data || []
  const posted = items.filter((item: any) => item.status === 'posted')
  const failed = items.filter((item: any) => item.status === 'failed')
  const scheduled = items.filter((item: any) => item.status === 'scheduled')
  const reversed = items.filter((item: any) => item.status === 'reversed')

  const postedVolume = posted.reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0)
  const failedVolume = failed.reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0)
  const achCount = items.filter((item: any) => item.payment_method === 'ach').length
  const cardCount = items.filter((item: any) => item.payment_method === 'card').length

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <section style={{ borderRadius: 30, padding: 24, background: 'linear-gradient(135deg, #111827 0%, #155e75 46%, #0f766e 100%)', color: '#fff', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -40, right: -20, width: 240, height: 240, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', filter: 'blur(20px)' }} />
        <p style={eyebrowStyle}>Transactions</p>
        <h1 style={heroTitleStyle}>Settlement, collection, and reversal activity across the portfolio</h1>
        <p style={heroCopyStyle}>
          Follow posted payments, scheduled collections, failed attempts, and reversals from one treasury-style view designed for operational review.
        </p>
        <div style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <HeroChip icon={ArrowUpRight} label={`${posted.length} posted`} />
          <HeroChip icon={CalendarClock} label={`${scheduled.length} scheduled`} />
          <HeroChip icon={XCircle} label={`${failed.length} failed`} />
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
        <StatCard icon={WalletCards} label="Transactions" value={String(items.length)} tone="blue" />
        <StatCard icon={ArrowUpRight} label="Posted volume" value={money(postedVolume)} tone="teal" />
        <StatCard icon={XCircle} label="Failed payments" value={String(failed.length)} tone="rose" />
        <StatCard icon={RotateCcw} label="Reversals" value={String(reversed.length)} tone="amber" />
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', gap: 14 }}>
        <div style={panelStyle}>
          <div>
            <h2 style={sectionTitleStyle}>Settlement summary</h2>
            <p style={sectionSubtitleStyle}>Current processing mix across posted, scheduled, failed, and reversed records.</p>
          </div>
          <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
            <SummaryRow label="Posted volume" value={money(postedVolume)} />
            <SummaryRow label="Failed volume" value={money(failedVolume)} />
            <SummaryRow label="Scheduled items" value={String(scheduled.length)} />
            <SummaryRow label="Reversed items" value={String(reversed.length)} />
          </div>
        </div>

        <div style={panelStyle}>
          <div>
            <h2 style={sectionTitleStyle}>Payment method mix</h2>
            <p style={sectionSubtitleStyle}>Quick read on which channels are driving payment activity.</p>
          </div>
          <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
            <MethodCard icon={Landmark} label="ACH" value={String(achCount)} tone="teal" />
            <MethodCard icon={WalletCards} label="Card" value={String(cardCount)} tone="blue" />
            <MethodCard icon={CalendarClock} label="Scheduled" value={String(scheduled.length)} tone="amber" />
            <MethodCard icon={RotateCcw} label="Reversed" value={String(reversed.length)} tone="slate" />
          </div>
        </div>
      </section>

      <section style={{ display: 'grid', gap: 12 }}>
        {items.map((item: any) => {
          const meta = transactionMeta(item.status)
          const Icon = meta.icon
          return (
            <article key={item.id} style={transactionCardStyle}>
              <div style={{ display: 'grid', gridTemplateColumns: '48px 1fr auto', gap: 14, alignItems: 'start' }}>
                <div style={{ ...iconWrapStyle(meta.bg), border: `1px solid ${meta.border}` }}>
                  <Icon size={18} color={meta.fg} />
                </div>

                <div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <p style={{ margin: 0, color: 'var(--color-text-primary)', fontWeight: 950, fontSize: '1rem' }}>
                      {money(Number(item.amount || 0))}
                    </p>
                    <span style={{ borderRadius: 999, padding: '5px 9px', background: 'var(--color-surface-soft)', color: 'var(--color-text-secondary)', fontSize: '0.74rem', fontWeight: 800 }}>
                      {formatUiLabel(item.payment_method || 'payment')}
                    </span>
                  </div>
                  <p style={{ margin: '6px 0 0', color: 'var(--color-text-muted)', fontSize: '0.84rem' }}>
                    Account #{String(item.loan_account_id || '').slice(0, 8)} • {item.external_reference ? `Reference ${item.external_reference}` : 'Internal record'}
                  </p>
                </div>

                <span style={{ borderRadius: 999, padding: '7px 11px', background: meta.bg, color: meta.fg, fontSize: '0.78rem', fontWeight: 900, whiteSpace: 'nowrap' }}>
                  {formatUiLabel(item.status)}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
                <DetailCard label="Created" value={timeAgo(item.created_at)} />
                <DetailCard label="Posted" value={item.posted_at ? timeAgo(item.posted_at) : 'Not posted'} />
                <DetailCard label="Due date" value={item.due_date || 'Not scheduled'} />
                <DetailCard label="Method" value={formatUiLabel(item.payment_method || 'payment')} />
              </div>
            </article>
          )
        })}
      </section>

      <style>{`
        @media (max-width: 1080px) {
          section[style*='grid-template-columns: repeat(4'] { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          section[style*='grid-template-columns: 1.05fr 0.95fr'] { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 760px) {
          section[style*='grid-template-columns: repeat(4'] { grid-template-columns: 1fr !important; }
          div[style*='grid-template-columns: repeat(2, minmax(0, 1fr))'] { grid-template-columns: 1fr !important; }
          div[style*='grid-template-columns: 48px 1fr auto'] { grid-template-columns: 48px 1fr !important; }
          div[style*='grid-template-columns: repeat(4, minmax(0, 1fr))'] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

function HeroChip({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>
  label: string
}) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 999, padding: '9px 12px', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.14)', color: '#fff', fontSize: '0.82rem', fontWeight: 800, backdropFilter: 'blur(12px)' }}>
      <Icon size={15} color="currentColor" />
      {label}
    </span>
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
  tone: 'blue' | 'teal' | 'rose' | 'amber'
}) {
  const palette = {
    blue: { bg: '#eff6ff', border: '#bfdbfe', fg: '#1d4ed8' },
    teal: { bg: '#ecfeff', border: '#a5f3fc', fg: '#0f766e' },
    rose: { bg: '#fff1f2', border: '#fecdd3', fg: '#be123c' },
    amber: { bg: '#fffbeb', border: '#fde68a', fg: '#b45309' },
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

function MethodCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>
  label: string
  value: string
  tone: 'teal' | 'blue' | 'amber' | 'slate'
}) {
  const palette = {
    teal: { bg: '#ecfeff', border: '#a5f3fc', fg: '#0f766e' },
    blue: { bg: '#eff6ff', border: '#bfdbfe', fg: '#1d4ed8' },
    amber: { bg: '#fffbeb', border: '#fde68a', fg: '#b45309' },
    slate: { bg: '#f1f5f9', border: '#cbd5e1', fg: '#334155' },
  }[tone]

  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: 18, background: 'var(--color-surface-soft)', padding: 14 }}>
      <div style={{ ...iconWrapStyle(palette.bg), border: `1px solid ${palette.border}`, width: 42, height: 42 }}>
        <Icon size={17} color={palette.fg} />
      </div>
      <p style={{ margin: '12px 0 0', color: 'var(--color-text-muted)', fontWeight: 800, fontSize: '0.8rem' }}>{label}</p>
      <p style={{ margin: '6px 0 0', color: 'var(--color-text-primary)', fontWeight: 950, fontSize: '1.3rem' }}>{value}</p>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', border: '1px solid var(--color-border)', borderRadius: 14, background: 'var(--color-surface-soft)', padding: '12px 14px' }}>
      <span style={{ color: 'var(--color-text-muted)', fontWeight: 800, fontSize: '0.82rem' }}>{label}</span>
      <span style={{ color: 'var(--color-text-primary)', fontWeight: 900, fontSize: '0.88rem' }}>{value}</span>
    </div>
  )
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: 14, background: 'var(--color-surface-soft)', padding: 12 }}>
      <p style={{ margin: 0, color: 'var(--color-text-muted)', fontWeight: 800, fontSize: '0.78rem' }}>{label}</p>
      <p style={{ margin: '6px 0 0', color: 'var(--color-text-primary)', fontWeight: 900, fontSize: '0.9rem' }}>{value}</p>
    </div>
  )
}

function transactionMeta(status: string) {
  if (status === 'posted') return { bg: '#dcfce7', border: '#86efac', fg: '#166534', icon: ArrowUpRight }
  if (status === 'failed') return { bg: '#fee2e2', border: '#fecaca', fg: '#991b1b', icon: XCircle }
  if (status === 'reversed') return { bg: '#ffedd5', border: '#fdba74', fg: '#9a3412', icon: RotateCcw }
  return { bg: '#dbeafe', border: '#93c5fd', fg: '#1d4ed8', icon: CalendarClock }
}

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
  maxWidth: 780,
} satisfies React.CSSProperties

const heroCopyStyle = {
  margin: '12px 0 0',
  maxWidth: 680,
  color: 'rgba(255,255,255,0.82)',
  lineHeight: 1.7,
} satisfies React.CSSProperties

const panelStyle = {
  border: '1px solid var(--color-border-strong)',
  borderRadius: 24,
  background: 'var(--color-surface)',
  padding: 18,
  boxShadow: 'var(--color-shadow-soft)',
} satisfies React.CSSProperties

const transactionCardStyle = {
  border: '1px solid var(--color-border-strong)',
  borderRadius: 24,
  background: 'var(--color-surface)',
  padding: 18,
  display: 'grid',
  gap: 14,
  boxShadow: 'var(--color-shadow-soft)',
} satisfies React.CSSProperties

const statCardStyle = {
  border: '1px solid var(--color-border-strong)',
  borderRadius: 22,
  background: 'var(--color-surface)',
  padding: 16,
  boxShadow: 'var(--color-shadow-soft)',
} satisfies React.CSSProperties

const iconWrapStyle = (background: string) => ({
  width: 48,
  height: 48,
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
  color: 'var(--color-text-muted)',
  fontSize: '0.82rem',
  lineHeight: 1.55,
} satisfies React.CSSProperties

const metricLabelStyle = {
  margin: '12px 0 0',
  color: 'var(--color-text-muted)',
  fontWeight: 800,
  fontSize: '0.82rem',
} satisfies React.CSSProperties

const statValueStyle = {
  margin: '8px 0 0',
  color: 'var(--color-text-primary)',
  fontWeight: 950,
  fontSize: '1.7rem',
} satisfies React.CSSProperties
