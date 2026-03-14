import type { Metadata } from 'next'
import { LifeBuoy, MessageCircleWarning, ShieldCheck, Ticket } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrgId, requirePermission } from '@/lib/authz'
import { formatUiLabel } from '@/lib/utils'
import { updateSupportTicket } from './actions'

export const metadata: Metadata = {
  title: 'Support Inbox',
  description: 'Borrower support tickets and service follow-up.',
}

export default async function SupportPage() {
  await requirePermission('communications.manage')
  const supabase = await createClient()
  const orgId = await getCurrentOrgId()

  const ticketsRes = await supabase
    .from('support_tickets')
    .select('id,borrower_id,subject,message,status,created_at,updated_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(80)

  const tickets = ticketsRes.data || []
  const borrowerIds = Array.from(new Set(tickets.map((ticket: any) => ticket.borrower_id).filter(Boolean)))
  const borrowersRes = borrowerIds.length > 0
    ? await supabase.from('borrower_profiles').select('id,full_name').in('id', borrowerIds)
    : { data: [] as any[] }
  const borrowerMap = new Map((borrowersRes.data || []).map((row: any) => [row.id, row]))

  const openCount = tickets.filter((ticket: any) => ticket.status === 'open').length
  const inProgressCount = tickets.filter((ticket: any) => ticket.status === 'in_progress').length
  const resolvedCount = tickets.filter((ticket: any) => ticket.status === 'resolved' || ticket.status === 'closed').length

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <section style={{ borderRadius: 28, padding: 24, background: 'linear-gradient(135deg, #111827 0%, #1d4ed8 42%, #0f766e 100%)', color: '#fff' }}>
        <p style={eyebrowStyle}>Support Inbox</p>
        <h1 style={heroTitleStyle}>Manage borrower issues with a cleaner triage and resolution queue</h1>
        <p style={heroCopyStyle}>
          Review inbound support tickets, move cases through active handling, and keep borrower-facing service work separate from collections and underwriting queues.
        </p>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
        <StatCard icon={Ticket} label="Tickets" value={String(tickets.length)} tone="blue" />
        <StatCard icon={MessageCircleWarning} label="Open" value={String(openCount)} tone="amber" />
        <StatCard icon={LifeBuoy} label="In progress" value={String(inProgressCount)} tone="teal" />
        <StatCard icon={ShieldCheck} label="Resolved" value={String(resolvedCount)} tone="slate" />
      </section>

      <section style={{ display: 'grid', gap: 14 }}>
        {tickets.length === 0 && <EmptyState text="No support tickets yet." />}
        {tickets.map((ticket: any) => (
          <article key={ticket.id} style={panelStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div>
                <p style={{ margin: 0, color: 'var(--color-text-primary)', fontWeight: 950, fontSize: '1.05rem' }}>{ticket.subject}</p>
                <p style={{ margin: '6px 0 0', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                  {borrowerMap.get(ticket.borrower_id)?.full_name || 'Borrower'} • Ticket #{ticket.id.slice(0, 8)} • Created {new Date(ticket.created_at).toLocaleDateString()}
                </p>
              </div>
              <Badge value={ticket.status} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 14, alignItems: 'start' }}>
              <div style={{ border: '1px solid var(--color-border)', borderRadius: 16, background: 'var(--color-surface-soft)', padding: 14 }}>
                <p style={{ margin: 0, color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
                  {ticket.message || 'No ticket body attached.'}
                </p>
                <p style={{ margin: '10px 0 0', color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>
                  Last updated {ticket.updated_at ? new Date(ticket.updated_at).toLocaleString() : 'just now'}
                </p>
              </div>

              <form action={updateSupportTicket} style={{ display: 'grid', gap: 10, minWidth: 240 }}>
                <input type="hidden" name="ticket_id" value={ticket.id} />
                <select name="status" defaultValue={ticket.status} style={inputStyle}>
                  <option value="open">Open</option>
                  <option value="in_progress">In progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
                <input name="note" placeholder="Internal update note" style={inputStyle} />
                <button type="submit" style={primaryButtonStyle}>Save update</button>
              </form>
            </div>
          </article>
        ))}
      </section>

      <style>{`
        @media (max-width: 980px) {
          section[style*='grid-template-columns: repeat(4'] { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          div[style*='grid-template-columns: 1fr auto'] { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 620px) {
          section[style*='grid-template-columns: repeat(4'] { grid-template-columns: 1fr !important; }
        }
      `}</style>
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
  tone: 'blue' | 'amber' | 'teal' | 'slate'
}) {
  const palette = {
    blue: { bg: '#eff6ff', border: '#bfdbfe', fg: '#1d4ed8' },
    amber: { bg: '#fffbeb', border: '#fde68a', fg: '#b45309' },
    teal: { bg: '#ecfeff', border: '#a5f3fc', fg: '#0f766e' },
    slate: { bg: '#f1f5f9', border: '#cbd5e1', fg: '#334155' },
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

function Badge({ value }: { value: string }) {
  return (
    <span style={{ borderRadius: 999, padding: '7px 11px', background: '#eff6ff', color: '#1d4ed8', fontSize: '0.78rem', fontWeight: 900 }}>
      {formatUiLabel(value)}
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
  maxWidth: 760,
} satisfies React.CSSProperties

const heroCopyStyle = {
  margin: '12px 0 0',
  maxWidth: 680,
  color: 'rgba(255,255,255,0.82)',
  lineHeight: 1.7,
} satisfies React.CSSProperties

const statCardStyle = {
  border: '1px solid var(--color-border-strong)',
  borderRadius: 22,
  background: 'var(--color-surface)',
  padding: 16,
  boxShadow: 'var(--color-shadow-soft)',
} satisfies React.CSSProperties

const panelStyle = {
  border: '1px solid var(--color-border-strong)',
  borderRadius: 24,
  background: 'var(--color-surface)',
  padding: 18,
  display: 'grid',
  gap: 14,
  boxShadow: 'var(--color-shadow-soft)',
} satisfies React.CSSProperties

const iconWrapStyle = (background: string) => ({
  width: 44,
  height: 44,
  borderRadius: 14,
  background,
  display: 'grid',
  placeItems: 'center',
})

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

const inputStyle = {
  width: '100%',
  borderRadius: 14,
  border: '1.5px solid #dbe4f0',
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
