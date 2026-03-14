import type { Metadata } from 'next'
import { ArrowDownLeft, ArrowRightLeft, BellRing, Mail, MessageSquareText, PhoneCall, Send, Smartphone } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrgId, requirePermission } from '@/lib/authz'
import { formatUiLabel } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Communications',
  description: 'Borrower communication log across in-app, email, SMS, and phone events.',
}

export default async function CommunicationsPage() {
  await requirePermission('communications.manage')
  const supabase = await createClient()
  const orgId = await getCurrentOrgId()

  const eventsRes = await supabase
    .from('communication_events')
    .select('id,borrower_id,application_id,loan_account_id,direction,channel,event_type,subject,message,status,created_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(120)

  const borrowerIds = Array.from(new Set((eventsRes.data || []).map((item: any) => item.borrower_id).filter(Boolean)))
  const borrowersRes = borrowerIds.length > 0
    ? await supabase.from('borrower_profiles').select('id,full_name').in('id', borrowerIds)
    : { data: [] as any[] }

  const borrowerMap = new Map((borrowersRes.data || []).map((row: any) => [row.id, row]))
  const items = eventsRes.data || []

  const outbound = items.filter((item: any) => item.direction === 'outbound')
  const inbound = items.filter((item: any) => item.direction === 'inbound')
  const delivered = items.filter((item: any) => item.status === 'delivered')
  const failed = items.filter((item: any) => item.status === 'failed' || item.status === 'undelivered')

  const channelCounts = {
    email: items.filter((item: any) => item.channel === 'email').length,
    sms: items.filter((item: any) => item.channel === 'sms').length,
    phone: items.filter((item: any) => item.channel === 'phone').length,
    inApp: items.filter((item: any) => item.channel === 'in_app' || item.channel === 'in app').length,
  }

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <section style={{ borderRadius: 30, padding: 24, background: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 42%, #0891b2 100%)', color: '#fff', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 'auto -10% -35% auto', width: 260, height: 260, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', filter: 'blur(20px)' }} />
        <p style={eyebrowStyle}>Communications</p>
        <h1 style={heroTitleStyle}>Communication command center for borrower messaging, reminders, and service updates</h1>
        <p style={heroCopyStyle}>
          Monitor outbound campaigns, inbound replies, delivery issues, and borrower contact context from a cleaner inbox-style workspace instead of a flat event log.
        </p>

        <div style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <HeroChip icon={Send} label={`${outbound.length} outbound`} />
          <HeroChip icon={ArrowDownLeft} label={`${inbound.length} inbound`} />
          <HeroChip icon={BellRing} label={`${failed.length} need attention`} />
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
        <StatCard icon={MessageSquareText} label="Messages logged" value={String(items.length)} tone="blue" />
        <StatCard icon={Send} label="Outbound messages" value={String(outbound.length)} tone="teal" />
        <StatCard icon={ArrowRightLeft} label="Delivered" value={String(delivered.length)} tone="slate" />
        <StatCard icon={BellRing} label="Delivery issues" value={String(failed.length)} tone="rose" />
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', gap: 14 }}>
        <div style={panelStyle}>
          <div>
            <h2 style={sectionTitleStyle}>Channel mix</h2>
            <p style={sectionSubtitleStyle}>Current communication volume by delivery surface.</p>
          </div>
          <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
            <ChannelCard icon={Mail} label="Email" value={String(channelCounts.email)} tone="blue" />
            <ChannelCard icon={Smartphone} label="SMS" value={String(channelCounts.sms)} tone="amber" />
            <ChannelCard icon={PhoneCall} label="Phone" value={String(channelCounts.phone)} tone="slate" />
            <ChannelCard icon={MessageSquareText} label="In app" value={String(channelCounts.inApp)} tone="teal" />
          </div>
        </div>

        <div style={panelStyle}>
          <div>
            <h2 style={sectionTitleStyle}>Operational snapshot</h2>
            <p style={sectionSubtitleStyle}>Quick read on communication health and response patterns.</p>
          </div>
          <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
            <SummaryRow label="Outbound share" value={items.length === 0 ? '0%' : `${Math.round((outbound.length / items.length) * 100)}%`} />
            <SummaryRow label="Inbound replies" value={String(inbound.length)} />
            <SummaryRow label="Successful deliveries" value={String(delivered.length)} />
            <SummaryRow label="Needs follow-up" value={String(failed.length)} />
          </div>
        </div>
      </section>

      <section style={{ display: 'grid', gap: 12 }}>
        {items.length === 0 && <EmptyState text="No communications logged yet." />}
        {items.map((item: any) => {
          const channel = channelMeta(item.channel)
          const status = statusMeta(item.status)
          const borrowerName = borrowerMap.get(item.borrower_id)?.full_name || 'Borrower'

          return (
            <article key={item.id} style={messageCardStyle}>
              <div style={{ display: 'grid', gridTemplateColumns: '54px 1fr auto', gap: 14, alignItems: 'start' }}>
                <div style={{ ...iconWrapStyle(channel.bg), border: `1px solid ${channel.border}` }}>
                  <channel.icon size={20} color={channel.fg} />
                </div>

                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <p style={{ margin: 0, color: '#0f172a', fontWeight: 950, fontSize: '1rem' }}>
                      {item.subject || formatUiLabel(item.event_type)}
                    </p>
                    <span style={{ borderRadius: 999, padding: '5px 9px', background: '#f8fafc', color: '#475569', fontSize: '0.74rem', fontWeight: 800 }}>
                      {formatUiLabel(item.direction)}
                    </span>
                  </div>
                  <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '0.84rem' }}>
                      {borrowerName} • {channel.label} • {formatUiLabel(item.event_type)}
                  </p>
                </div>

                <span style={{ borderRadius: 999, padding: '7px 11px', background: status.bg, color: status.fg, fontSize: '0.78rem', fontWeight: 900, whiteSpace: 'nowrap' }}>
                  {formatUiLabel(item.status)}
                </span>
              </div>

              <div style={{ border: '1px solid #e2e8f0', borderRadius: 16, background: '#f8fafc', padding: 14 }}>
                <p style={{ margin: 0, color: 'var(--color-text-secondary)', lineHeight: 1.75 }}>
                  {item.message || 'No message body attached.'}
                </p>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <MetaPill value={channel.label} />
                <MetaPill value={formatUiLabel(item.event_type)} />
                {item.application_id && <MetaPill value={`Application ${item.application_id.slice(0, 8)}`} />}
                {item.loan_account_id && <MetaPill value={`Account ${item.loan_account_id.slice(0, 8)}`} />}
                <MetaPill value={new Date(item.created_at).toLocaleString()} />
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
          div[style*='grid-template-columns: 54px 1fr auto'] { grid-template-columns: 54px 1fr !important; }
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
  tone: 'blue' | 'teal' | 'slate' | 'rose'
}) {
  const palette = {
    blue: { bg: '#eff6ff', border: '#bfdbfe', fg: '#1d4ed8' },
    teal: { bg: '#ecfeff', border: '#a5f3fc', fg: '#0f766e' },
    slate: { bg: '#f1f5f9', border: '#cbd5e1', fg: '#334155' },
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

function ChannelCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>
  label: string
  value: string
  tone: 'blue' | 'amber' | 'slate' | 'teal'
}) {
  const palette = {
    blue: { bg: '#eff6ff', border: '#bfdbfe', fg: '#1d4ed8' },
    amber: { bg: '#fffbeb', border: '#fde68a', fg: '#b45309' },
    slate: { bg: '#f1f5f9', border: '#cbd5e1', fg: '#334155' },
    teal: { bg: '#ecfeff', border: '#a5f3fc', fg: '#0f766e' },
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

function MetaPill({ value }: { value: string }) {
  return (
    <span style={{ borderRadius: 999, padding: '7px 11px', background: 'var(--color-surface-soft)', color: 'var(--color-text-secondary)', fontSize: '0.76rem', fontWeight: 800 }}>
      {value}
    </span>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div style={{ border: '1px dashed var(--color-border)', borderRadius: 18, background: 'var(--color-surface)', padding: 18, color: 'var(--color-text-muted)' }}>
      {text}
    </div>
  )
}

function channelMeta(channel: string | null) {
  if (channel === 'email') return { label: 'Email', bg: '#eff6ff', border: '#bfdbfe', fg: '#1d4ed8', icon: Mail }
  if (channel === 'sms') return { label: 'SMS', bg: '#fffbeb', border: '#fde68a', fg: '#b45309', icon: Smartphone }
  if (channel === 'phone') return { label: 'Phone', bg: '#f1f5f9', border: '#cbd5e1', fg: '#334155', icon: PhoneCall }
  return { label: 'In app', bg: '#ecfeff', border: '#a5f3fc', fg: '#0f766e', icon: MessageSquareText }
}

function statusMeta(status: string | null) {
  if (status === 'delivered') return { bg: '#dcfce7', fg: '#166534' }
  if (status === 'failed' || status === 'undelivered') return { bg: '#fff1f2', fg: '#be123c' }
  if (status === 'sent') return { bg: '#eff6ff', fg: '#1d4ed8' }
  return { bg: '#f1f5f9', fg: '#334155' }
}

const eyebrowStyle = {
  margin: 0,
  fontSize: '0.78rem',
  fontWeight: 900,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.74)',
  opacity: 0.78,
} satisfies React.CSSProperties

const heroTitleStyle = {
  margin: '10px 0 0',
  fontSize: '2rem',
  lineHeight: 1.04,
  fontWeight: 950,
  letterSpacing: '-0.04em',
  maxWidth: 840,
  color: '#fff',
} satisfies React.CSSProperties

const heroCopyStyle = {
  margin: '12px 0 0',
  maxWidth: 700,
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

const messageCardStyle = {
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
  width: 46,
  height: 46,
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
