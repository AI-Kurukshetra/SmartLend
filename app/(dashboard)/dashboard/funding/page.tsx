import type { Metadata } from 'next'
import {
  BadgeDollarSign,
  Banknote,
  CalendarClock,
  CheckCircle2,
  HandCoins,
  WalletCards,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrgId } from '@/lib/authz'
import { fundApplication } from './actions'
import { formatUiLabel } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Funding',
  description: 'Funding and disbursal workflow scaffolding.',
}

function money(value: number) {
  return `$${Math.round(value).toLocaleString()}`
}

function timeAgo(value: string) {
  const diff = Date.now() - new Date(value).getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

export default async function FundingPage() {
  const supabase = await createClient()
  const orgId = await getCurrentOrgId()

  const approvedRes = await supabase
    .from('loan_applications')
    .select('id,borrower_id,requested_amount,requested_term_months,status,created_at')
    .eq('org_id', orgId)
    .in('status', ['approved', 'funded'])
    .order('created_at', { ascending: false })
    .limit(50)

  const items = approvedRes.data || []
  const borrowerIds = Array.from(new Set(items.map((item: any) => item.borrower_id).filter(Boolean)))

  const [borrowersRes, offersRes, accountsRes] = await Promise.all([
    borrowerIds.length > 0
      ? supabase.from('borrower_profiles').select('id,full_name').in('id', borrowerIds)
      : Promise.resolve({ data: [] as any[] }),
    items.length > 0
      ? supabase.from('loan_offers').select('application_id,apr,term_months,fee_amount,status,monthly_payment').in('application_id', items.map((item: any) => item.id))
      : Promise.resolve({ data: [] as any[] }),
    items.length > 0
      ? supabase.from('loan_accounts').select('application_id,id,funded_at').in('application_id', items.map((item: any) => item.id))
      : Promise.resolve({ data: [] as any[] }),
  ])

  const borrowerMap = new Map((borrowersRes.data || []).map((row: any) => [row.id, row]))
  const offerMap = new Map((offersRes.data || []).map((row: any) => [row.application_id, row]))
  const accountMap = new Map((accountsRes.data || []).map((row: any) => [row.application_id, row]))

  const readyCount = items.filter((item: any) => item.status === 'approved').length
  const fundedCount = items.filter((item: any) => item.status === 'funded').length
  const queueVolume = items.filter((item: any) => item.status === 'approved').reduce((sum: number, item: any) => sum + Number(item.requested_amount || 0), 0)
  const fundedVolume = items.filter((item: any) => item.status === 'funded').reduce((sum: number, item: any) => sum + Number(item.requested_amount || 0), 0)

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <section
        style={{
          borderRadius: 28,
          padding: 24,
          background: 'linear-gradient(135deg, #0f172a 0%, #134e4a 46%, #0f766e 100%)',
          color: '#fff',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', inset: 'auto -8% -45% auto', width: 330, height: 330, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', filter: 'blur(10px)' }} />
        <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: 18 }}>
          <div>
            <p style={heroKickerStyle}>Funding Desk</p>
            <h1 style={heroTitleStyle}>Move approved applications into funded accounts with better disbursal visibility</h1>
            <p style={heroBodyStyle}>
              Review funding-ready volume, offer economics, and funded account creation from one operational queue.
            </p>
            <div style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <HeroChip icon={HandCoins} label={`${readyCount} ready to fund`} />
              <HeroChip icon={BadgeDollarSign} label={`${money(queueVolume)} ready volume`} />
              <HeroChip icon={CheckCircle2} label={`${fundedCount} already funded`} />
            </div>
          </div>

          <div style={heroPanelStyle}>
            <p style={heroKickerStyle}>Funding Snapshot</p>
            <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
              <MixRow label="Ready volume" value={money(queueVolume)} tone="blue" />
              <MixRow label="Funded volume" value={money(fundedVolume)} tone="green" />
              <MixRow label="Approved queue" value={String(readyCount)} tone="amber" />
              <MixRow label="Funded records" value={String(fundedCount)} tone="green" />
            </div>
          </div>
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
        <MetricCard icon={HandCoins} label="Ready to fund" value={String(readyCount)} hint="Approved applications awaiting disbursal" tone="amber" />
        <MetricCard icon={Banknote} label="Ready volume" value={money(queueVolume)} hint="Requested principal still waiting for funding" tone="blue" />
        <MetricCard icon={WalletCards} label="Funded count" value={String(fundedCount)} hint="Applications already converted into active accounts" tone="green" />
        <MetricCard icon={CalendarClock} label="Funded volume" value={money(fundedVolume)} hint="Total principal already activated in servicing" tone="green" />
      </section>

      <section style={{ display: 'grid', gap: 12 }}>
        {items.length === 0 && (
          <div style={{ border: '1px dashed var(--color-border)', borderRadius: 18, background: 'var(--color-surface)', padding: 16, color: 'var(--color-text-secondary)' }}>
            No approved applications ready for funding.
          </div>
        )}
        {items.map((item: any) => {
          const offer = offerMap.get(item.id)
          const borrower = borrowerMap.get(item.borrower_id)
          const fundedAccount = accountMap.get(item.id)
          const isFunded = item.status === 'funded'

          return (
            <div
              key={item.id}
              style={{
                border: '1px solid var(--color-border)',
                borderRadius: 22,
                background: 'var(--color-surface)',
                padding: 18,
                boxShadow: 'var(--shadow-lg)',
                display: 'grid',
                gridTemplateColumns: '1.08fr 0.92fr',
                gap: 18,
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <p style={{ margin: 0, color: 'var(--color-text-primary)', fontWeight: 950, fontSize: '1.08rem' }}>
                    {money(Number(item.requested_amount || 0))} request
                  </p>
                  <span style={statusBadge(isFunded ? 'funded' : 'approved')}>{formatUiLabel(item.status)}</span>
                </div>
                <p style={{ margin: '8px 0 0', color: 'var(--color-text-secondary)', fontSize: '0.84rem' }}>
                  {borrower?.full_name || 'Borrower'} • Application #{item.id.slice(0, 8)} • Submitted {timeAgo(item.created_at)}
                </p>

                <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
                  <MetaCard label="Requested term" value={`${item.requested_term_months} months`} />
                  <MetaCard label="Offer APR" value={offer?.apr ? `${Number(offer.apr).toFixed(2)}%` : 'Pending'} />
                  <MetaCard label="Monthly payment" value={offer?.monthly_payment ? money(Number(offer.monthly_payment)) : 'Pending'} />
                  <MetaCard label="Fee amount" value={offer?.fee_amount ? money(Number(offer.fee_amount)) : '$0'} />
                </div>

                {fundedAccount?.id && (
                  <p style={{ margin: '12px 0 0', color: '#166534', fontSize: '0.82rem', fontWeight: 800 }}>
                    Active loan account #{String(fundedAccount.id).slice(0, 8)} created.
                  </p>
                )}
              </div>

              <div style={{ border: '1px solid var(--color-border)', borderRadius: 18, background: 'var(--color-surface-muted, var(--gray-50))', padding: 14 }}>
                <p style={{ margin: 0, color: 'var(--color-text-primary)', fontWeight: 900 }}>Funding action</p>
                <p style={{ margin: '6px 0 0', color: 'var(--color-text-secondary)', fontSize: '0.82rem', lineHeight: 1.55 }}>
                  Funding creates an active loan account, schedules ACH payments, and advances the borrower into servicing.
                </p>
                <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                  <InfoRow label="Offer status" value={offer ? formatUiLabel(offer.status) : 'No offer found'} />
                  <InfoRow label="Disbursal status" value={isFunded ? 'Completed' : 'Ready'} />
                  <InfoRow label="Account activation" value={fundedAccount?.funded_at ? `Funded ${timeAgo(fundedAccount.funded_at)}` : 'Pending'} />
                </div>
                <form action={fundApplication} style={{ marginTop: 14 }}>
                  <input type="hidden" name="application_id" value={item.id} />
                  <button
                    type="submit"
                    disabled={isFunded}
                    style={{
                      border: 'none',
                      borderRadius: 14,
                      background: isFunded ? '#94a3b8' : 'linear-gradient(135deg, #0f766e 0%, #0ea5a4 100%)',
                      color: '#fff',
                      fontWeight: 900,
                      padding: '12px 14px',
                      cursor: isFunded ? 'default' : 'pointer',
                      width: '100%',
                    }}
                  >
                    {isFunded ? 'Already funded' : 'Fund application'}
                  </button>
                </form>
              </div>
            </div>
          )
        })}
      </section>

      <style>{`
        @media (max-width: 1180px) {
          section[style*='grid-template-columns: 1.15fr 0.85fr'],
          section[style*='grid-template-columns: repeat(4'],
          div[style*='grid-template-columns: 1.08fr 0.92fr'] {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 760px) {
          section[style*='grid-template-columns: repeat(4'] {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
          div[style*='grid-template-columns: repeat(4'] {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }
        @media (max-width: 520px) {
          section[style*='grid-template-columns: repeat(4'],
          div[style*='grid-template-columns: repeat(4'] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
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

function MixRow({ label, value, tone }: { label: string; value: string; tone: 'blue' | 'green' | 'amber' }) {
  const palette = {
    blue: { dot: '#60a5fa', bg: 'rgba(96,165,250,0.16)' },
    green: { dot: '#22c55e', bg: 'rgba(34,197,94,0.16)' },
    amber: { dot: '#f59e0b', bg: 'rgba(245,158,11,0.16)' },
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
  tone: 'green' | 'blue' | 'amber'
}) {
  const palette = {
    green: { bg: '#f0fdf4', fg: '#166534', ring: '#bbf7d0' },
    blue: { bg: '#eff6ff', fg: '#1d4ed8', ring: '#bfdbfe' },
    amber: { bg: '#fffbeb', fg: '#92400e', ring: '#fde68a' },
  }[tone]

  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: 22, background: 'var(--color-surface)', padding: 16, boxShadow: 'var(--shadow-lg)' }}>
      <div style={{ width: 44, height: 44, borderRadius: 14, background: palette.bg, border: `1px solid ${palette.ring}`, display: 'grid', placeItems: 'center' }}>
        <Icon size={18} color={palette.fg} />
      </div>
      <p style={{ margin: '14px 0 0', color: 'var(--color-text-secondary)', fontWeight: 800, fontSize: '0.84rem' }}>{label}</p>
      <p style={{ margin: '6px 0 0', color: 'var(--color-text-primary)', fontWeight: 950, fontSize: '1.7rem', letterSpacing: '-0.03em' }}>{value}</p>
      <p style={{ margin: '8px 0 0', color: 'var(--color-text-secondary)', fontSize: '0.8rem', lineHeight: 1.55 }}>{hint}</p>
    </div>
  )
}

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: 14, background: 'var(--gray-50)', padding: 12 }}>
      <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontWeight: 800, fontSize: '0.75rem' }}>{label}</p>
      <p style={{ margin: '8px 0 0', color: 'var(--color-text-primary)', fontWeight: 900, fontSize: '0.92rem' }}>{value}</p>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', borderRadius: 12, background: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '10px 12px' }}>
      <span style={{ color: 'var(--color-text-secondary)', fontWeight: 800, fontSize: '0.8rem' }}>{label}</span>
      <span style={{ color: 'var(--color-text-primary)', fontWeight: 900, fontSize: '0.84rem', textAlign: 'right' }}>{value}</span>
    </div>
  )
}

const heroKickerStyle = { margin: 0, fontSize: '0.78rem', fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase' as const, opacity: 0.78 }
const heroTitleStyle = { margin: '10px 0 0', fontSize: '2rem', lineHeight: 1.03, fontWeight: 950, letterSpacing: '-0.04em' }
const heroBodyStyle = { margin: '12px 0 0', maxWidth: 620, color: 'rgba(255,255,255,0.82)', lineHeight: 1.7 }
const heroPanelStyle = { borderRadius: 22, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', padding: 18, backdropFilter: 'blur(10px)' }

function statusBadge(status: 'approved' | 'funded') {
  const palette = status === 'funded'
    ? { bg: '#dcfce7', fg: '#166534' }
    : { bg: '#fef3c7', fg: '#92400e' }

  return {
    borderRadius: 999,
    background: palette.bg,
    color: palette.fg,
    padding: '7px 11px',
    fontSize: '0.78rem',
    fontWeight: 900,
    whiteSpace: 'nowrap' as const,
  }
}
