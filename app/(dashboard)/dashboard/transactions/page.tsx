import type { Metadata } from 'next'
import { ArrowDownLeft, ArrowUpRight, CalendarClock, RotateCcw, XCircle } from 'lucide-react'
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

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <section style={{ borderRadius: 28, padding: 24, background: 'linear-gradient(135deg, #111827 0%, #155e75 48%, #0f766e 100%)', color: '#fff' }}>
        <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.78 }}>Transaction Feed</p>
        <h1 style={{ margin: '10px 0 0', fontSize: '2rem', lineHeight: 1.04, fontWeight: 950, letterSpacing: '-0.04em' }}>Settlement and collection activity across the portfolio</h1>
        <p style={{ margin: '12px 0 0', maxWidth: 620, color: 'rgba(255,255,255,0.82)', lineHeight: 1.7 }}>
          Follow posted, failed, scheduled, and reversed payment records from one transaction stream.
        </p>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
        <StatCard label="Transactions" value={String(items.length)} />
        <StatCard label="Posted volume" value={money(posted.reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0))} />
        <StatCard label="Failed payments" value={String(failed.length)} />
      </section>

      <section style={{ display: 'grid', gap: 10 }}>
        {items.map((item: any) => {
          const meta = transactionMeta(item.status)
          const Icon = meta.icon
          return (
            <div key={item.id} style={{ border: '1px solid #dbe4f0', borderRadius: 20, background: '#fff', padding: 16, display: 'grid', gridTemplateColumns: '44px 1fr auto', gap: 12, alignItems: 'center', boxShadow: '0 10px 28px rgba(15,23,42,0.04)' }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: meta.bg, display: 'grid', placeItems: 'center' }}>
                <Icon size={18} color={meta.fg} />
              </div>
              <div>
                <p style={{ margin: 0, color: '#0f172a', fontWeight: 900 }}>{money(Number(item.amount || 0))} • {formatUiLabel(item.payment_method || 'payment')}</p>
                <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '0.84rem' }}>
                  Account #{String(item.loan_account_id || '').slice(0, 8)} • {item.external_reference ? `Ref ${item.external_reference}` : 'Internal record'} • {item.posted_at ? timeAgo(item.posted_at) : `Due ${item.due_date || 'pending'}`}
                </p>
              </div>
              <span style={{ borderRadius: 999, padding: '7px 11px', background: meta.bg, color: meta.fg, fontSize: '0.78rem', fontWeight: 900, whiteSpace: 'nowrap' }}>
                {formatUiLabel(item.status)}
              </span>
            </div>
          )
        })}
      </section>

      <style>{`
        @media (max-width: 760px) {
          section[style*='grid-template-columns: repeat(3'] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: '1px solid #dbe4f0', borderRadius: 22, background: '#fff', padding: 16, boxShadow: '0 10px 28px rgba(15,23,42,0.04)' }}>
      <p style={{ margin: 0, color: '#64748b', fontWeight: 800, fontSize: '0.84rem' }}>{label}</p>
      <p style={{ margin: '8px 0 0', color: '#0f172a', fontWeight: 950, fontSize: '1.7rem' }}>{value}</p>
    </div>
  )
}

function transactionMeta(status: string) {
  if (status === 'posted') return { bg: '#dcfce7', fg: '#166534', icon: ArrowUpRight }
  if (status === 'failed') return { bg: '#fee2e2', fg: '#991b1b', icon: XCircle }
  if (status === 'reversed') return { bg: '#ffedd5', fg: '#9a3412', icon: RotateCcw }
  return { bg: '#dbeafe', fg: '#1d4ed8', icon: CalendarClock }
}
