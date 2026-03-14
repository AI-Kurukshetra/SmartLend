import type { Metadata } from 'next'
import {
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  CreditCard,
  Landmark,
  ReceiptText,
  RotateCcw,
  ShieldAlert,
  Wallet,
  XCircle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrgId } from '@/lib/authz'

export const metadata: Metadata = { title: 'Wallet' }

function money(value: number) {
  return `$${Math.round(value).toLocaleString()}`
}

function timeAgo(value: string | null) {
  if (!value) return 'Pending settlement'
  const diff = Date.now() - new Date(value).getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

function statusMeta(status: string) {
  const key = status.toLowerCase()
  if (key === 'posted') return { label: 'Posted', bg: '#dcfce7', fg: '#166534', icon: CheckCircle2 }
  if (key === 'scheduled') return { label: 'Scheduled', bg: '#dbeafe', fg: '#1d4ed8', icon: Clock3 }
  if (key === 'failed') return { label: 'Failed', bg: '#fee2e2', fg: '#991b1b', icon: XCircle }
  if (key === 'reversed') return { label: 'Reversed', bg: '#ffedd5', fg: '#9a3412', icon: RotateCcw }
  return { label: status, bg: '#e2e8f0', fg: '#334155', icon: ReceiptText }
}

export default async function WalletPage() {
  const supabase = await createClient()
  const orgId = await getCurrentOrgId()

  const paymentsRes = await supabase
    .from('loan_payments')
    .select('id,amount,status,due_date,posted_at,payment_method,external_reference,principal_component,interest_component,fee_component,created_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(120)

  const payments = paymentsRes.data || []
  const posted = payments.filter((item: any) => item.status === 'posted')
  const scheduled = payments.filter((item: any) => item.status === 'scheduled')
  const failed = payments.filter((item: any) => item.status === 'failed')
  const reversed = payments.filter((item: any) => item.status === 'reversed')

  const postedVolume = posted.reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0)
  const scheduledVolume = scheduled.reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0)
  const failedVolume = failed.reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0)
  const principalCollected = posted.reduce((sum: number, item: any) => sum + Number(item.principal_component || 0), 0)
  const interestCollected = posted.reduce((sum: number, item: any) => sum + Number(item.interest_component || 0), 0)
  const feeCollected = posted.reduce((sum: number, item: any) => sum + Number(item.fee_component || 0), 0)
  const settlementRate = posted.length + failed.length > 0 ? ((posted.length / (posted.length + failed.length)) * 100).toFixed(1) : '0.0'
  const achCount = payments.filter((item: any) => String(item.payment_method || '').toLowerCase() === 'ach').length
  const cardCount = payments.filter((item: any) => String(item.payment_method || '').toLowerCase().includes('card')).length
  const latestPosted = posted[0]?.posted_at || null

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <section
        style={{
          borderRadius: 28,
          padding: 24,
          background: 'linear-gradient(135deg, #0f172a 0%, #155e75 52%, #0f766e 100%)',
          color: '#fff',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', inset: 'auto -8% -45% auto', width: 340, height: 340, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', filter: 'blur(10px)' }} />
        <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1.2fr 0.9fr', gap: 18 }}>
          <div>
            <p style={{ margin: 0, fontSize: '0.76rem', fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.74)', opacity: 0.8 }}>
              Wallet Command Center
            </p>
            <h1 style={{ margin: '10px 0 0', fontSize: '2rem', lineHeight: 1.03, fontWeight: 950, letterSpacing: '-0.04em', color: '#fff' }}>
              Treasury visibility across posted, scheduled, and exception payments
            </h1>
            <p style={{ margin: '12px 0 0', maxWidth: 620, color: 'rgba(255,255,255,0.82)', lineHeight: 1.7 }}>
              Monitor settlement performance, scheduled receivables, payment method mix, and recovery pressure from one wallet view.
            </p>
            <div style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <HeroChip icon={Wallet} label={`${money(postedVolume)} posted`} />
              <HeroChip icon={CalendarClock} label={`${money(scheduledVolume)} scheduled`} />
              <HeroChip icon={ShieldAlert} label={`${settlementRate}% settlement success`} />
            </div>
          </div>

          <div style={{ borderRadius: 22, background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.14)', padding: 18, backdropFilter: 'blur(10px)' }}>
            <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.74)', opacity: 0.76 }}>
              Collection Breakdown
            </p>
            <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
              <BreakdownRow label="Principal collected" value={money(principalCollected)} tone="green" />
              <BreakdownRow label="Interest collected" value={money(interestCollected)} tone="blue" />
              <BreakdownRow label="Fee collected" value={money(feeCollected)} tone="amber" />
              <BreakdownRow label="Failed attempts" value={money(failedVolume)} tone="red" />
            </div>
          </div>
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
        <MetricCard icon={CheckCircle2} label="Posted payments" value={String(posted.length)} hint={latestPosted ? `Latest settlement ${timeAgo(latestPosted)}` : 'No posted payments yet'} tone="green" />
        <MetricCard icon={Clock3} label="Scheduled payments" value={String(scheduled.length)} hint={`${money(scheduledVolume)} queued for collection`} tone="blue" />
        <MetricCard icon={XCircle} label="Failed payments" value={String(failed.length)} hint={`${reversed.length} reversed transactions`} tone="red" />
        <MetricCard icon={Landmark} label="ACH payment mix" value={`${achCount}`} hint={`${cardCount} card-originated transactions`} tone="teal" />
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '0.95fr 1.05fr', gap: 16 }}>
        <Panel title="Wallet Health" subtitle="How payment activity is trending right now">
          <div style={{ display: 'grid', gap: 10 }}>
            <HealthRow icon={ArrowUpRight} title="Settlement success rate" detail={`${settlementRate}% of attempted collections have posted successfully.`} />
            <HealthRow icon={ReceiptText} title="Scheduled receivables" detail={`${money(scheduledVolume)} is currently scheduled across ${scheduled.length} upcoming payments.`} />
            <HealthRow icon={CreditCard} title="Payment rail mix" detail={`${achCount} ACH payments and ${cardCount} card payments are currently logged in the wallet feed.`} />
            <HealthRow icon={ShieldAlert} title="Exception pressure" detail={`${failed.length} failed and ${reversed.length} reversed transactions may need follow-up or borrower outreach.`} />
          </div>
        </Panel>

        <Panel title="Recent Transactions" subtitle="Latest payment activity and processing references">
          <div style={{ display: 'grid', gap: 10 }}>
            {payments.length === 0 && <EmptyState>No transactions recorded yet.</EmptyState>}
            {payments.slice(0, 18).map((item: any) => {
              const meta = statusMeta(String(item.status || ''))
              const Icon = meta.icon
              return (
                <div
                  key={item.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '44px 1fr auto',
                    gap: 12,
                    alignItems: 'center',
                    border: '1px solid var(--color-border)',
                    borderRadius: 18,
                    background: 'var(--color-surface)',
                    padding: 14,
                  }}
                >
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: meta.bg, display: 'grid', placeItems: 'center' }}>
                    <Icon size={18} color={meta.fg} />
                  </div>
                  <div>
                    <p style={{ margin: 0, color: 'var(--color-text-primary)', fontWeight: 900 }}>
                      {money(Number(item.amount || 0))} {item.payment_method ? `• ${String(item.payment_method).toUpperCase()}` : ''}
                    </p>
                    <p style={{ margin: '6px 0 0', color: 'var(--color-text-secondary)', fontSize: '0.84rem', lineHeight: 1.55 }}>
                      {item.external_reference ? `Ref ${item.external_reference}` : 'Internal payment record'}
                      {item.due_date ? ` • Due ${item.due_date}` : ''}
                      {item.posted_at ? ` • Posted ${timeAgo(item.posted_at)}` : ''}
                    </p>
                  </div>
                  <span
                    style={{
                      borderRadius: 999,
                      padding: '7px 11px',
                      background: meta.bg,
                      color: meta.fg,
                      fontSize: '0.78rem',
                      fontWeight: 900,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {meta.label}
                  </span>
                </div>
              )
            })}
          </div>
        </Panel>
      </section>

      <style>{`
        @media (max-width: 1180px) {
          section[style*='grid-template-columns: 1.2fr 0.9fr'],
          section[style*='grid-template-columns: repeat(4'],
          section[style*='grid-template-columns: 0.95fr 1.05fr'] {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 760px) {
          section[style*='grid-template-columns: repeat(4'] {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }
        @media (max-width: 520px) {
          section[style*='grid-template-columns: repeat(4'] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: 24, background: 'var(--color-surface)', padding: 18, boxShadow: 'var(--shadow-lg)' }}>
      <div style={{ marginBottom: 14 }}>
        <h2 style={{ margin: 0, color: 'var(--color-text-primary)', fontSize: '1.05rem', fontWeight: 950 }}>{title}</h2>
        <p style={{ margin: '6px 0 0', color: 'var(--color-text-secondary)', fontSize: '0.85rem', lineHeight: 1.6 }}>{subtitle}</p>
      </div>
      {children}
    </div>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>
  label: string
  value: string
  hint: string
  tone: 'green' | 'blue' | 'red' | 'teal'
}) {
  const palette = {
    green: { bg: '#f0fdf4', fg: '#166534', ring: '#bbf7d0' },
    blue: { bg: '#eff6ff', fg: '#1d4ed8', ring: '#bfdbfe' },
    red: { bg: '#fef2f2', fg: '#991b1b', ring: '#fecaca' },
    teal: { bg: '#ecfeff', fg: '#155e75', ring: '#bae6fd' },
  }[tone]

  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: 22, background: 'var(--color-surface)', padding: 16, boxShadow: 'var(--shadow-lg)' }}>
      <div style={{ width: 44, height: 44, borderRadius: 14, background: palette.bg, display: 'grid', placeItems: 'center', border: `1px solid ${palette.ring}` }}>
        <Icon size={18} color={palette.fg} />
      </div>
      <p style={{ margin: '14px 0 0', color: 'var(--color-text-secondary)', fontWeight: 800, fontSize: '0.84rem' }}>{label}</p>
      <p style={{ margin: '6px 0 0', color: 'var(--color-text-primary)', fontWeight: 950, fontSize: '1.7rem', letterSpacing: '-0.03em' }}>{value}</p>
      <p style={{ margin: '8px 0 0', color: 'var(--color-text-secondary)', fontSize: '0.8rem', lineHeight: 1.55 }}>{hint}</p>
    </div>
  )
}

function BreakdownRow({ label, value, tone }: { label: string; value: string; tone: 'green' | 'blue' | 'amber' | 'red' }) {
  const palette = {
    green: { dot: '#22c55e', bg: 'rgba(34,197,94,0.14)' },
    blue: { dot: '#60a5fa', bg: 'rgba(96,165,250,0.14)' },
    amber: { dot: '#f59e0b', bg: 'rgba(245,158,11,0.14)' },
    red: { dot: '#f87171', bg: 'rgba(248,113,113,0.16)' },
  }[tone]

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 12px', borderRadius: 14, background: 'rgba(255,255,255,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: palette.dot, boxShadow: `0 0 0 6px ${palette.bg}` }} />
        <span style={{ fontWeight: 700 }}>{label}</span>
      </div>
      <span style={{ fontWeight: 900 }}>{value}</span>
    </div>
  )
}

function HealthRow({
  icon: Icon,
  title,
  detail,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>
  title: string
  detail: string
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '42px 1fr', gap: 12, alignItems: 'start', padding: '10px 0' }}>
      <div style={{ width: 42, height: 42, borderRadius: 14, background: 'var(--gray-50)', display: 'grid', placeItems: 'center', border: '1px solid var(--color-border)' }}>
        <Icon size={18} color="var(--color-text-secondary)" />
      </div>
      <div>
        <p style={{ margin: 0, color: 'var(--color-text-primary)', fontWeight: 900 }}>{title}</p>
        <p style={{ margin: '6px 0 0', color: 'var(--color-text-secondary)', fontSize: '0.84rem', lineHeight: 1.6 }}>{detail}</p>
      </div>
    </div>
  )
}

function HeroChip({ icon: Icon, label }: { icon: React.ComponentType<{ size?: number; color?: string }>; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 999, background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.12)', fontWeight: 800, fontSize: '0.82rem' }}>
      <Icon size={14} color="#fff" />
      {label}
    </span>
  )
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ border: '1px dashed var(--color-border)', borderRadius: 18, background: 'var(--gray-50)', padding: 18, color: 'var(--color-text-secondary)' }}>
      {children}
    </div>
  )
}
