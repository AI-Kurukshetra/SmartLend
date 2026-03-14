import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrgId } from '@/lib/authz'

export const metadata: Metadata = { title: 'Wallet' }

export default async function WalletPage() {
  const supabase = await createClient()
  const orgId = await getCurrentOrgId()

  const paymentsRes = await supabase
    .from('loan_payments')
    .select('id,amount,status,due_date,posted_at,payment_method,external_reference')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(100)

  const payments = paymentsRes.data || []
  const posted = payments.filter((p: any) => p.status === 'posted')
  const scheduled = payments.filter((p: any) => p.status === 'scheduled')
  const failed = payments.filter((p: any) => p.status === 'failed')
  const postedVolume = posted.reduce((s: number, p: any) => s + Number(p.amount || 0), 0)

  return (
    <div>
      <h1 style={{ margin: 0, fontSize: '1.9rem', fontWeight: 900, color: '#0f172a' }}>Wallet</h1>
      <p style={{ marginTop: 8, color: '#64748b' }}>Payment processing overview and recent transaction records.</p>
      <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(4, minmax(180px,1fr))', gap: 10 }}>
        <Tile label="Posted volume" value={`$${postedVolume.toLocaleString()}`} />
        <Tile label="Posted count" value={String(posted.length)} />
        <Tile label="Scheduled count" value={String(scheduled.length)} />
        <Tile label="Failed count" value={String(failed.length)} />
      </div>
      <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
        {payments.slice(0, 25).map((p: any) => (
          <div key={p.id} style={{ border: '1px solid #e2e8f0', borderRadius: 12, background: '#fff', padding: 12, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#0f172a', fontWeight: 800 }}>${Number(p.amount).toLocaleString()} | {p.payment_method}</span>
            <span style={{ color: '#475569', fontWeight: 700 }}>{p.status}{p.external_reference ? ` | ${p.external_reference}` : ''}</span>
          </div>
        ))}
      </div>
      <style>{`
        @media (max-width: 980px) {
          div[style*='grid-template-columns: repeat(4'] { grid-template-columns: repeat(2, minmax(180px, 1fr)) !important; }
        }
        @media (max-width: 620px) {
          div[style*='grid-template-columns: repeat(4'] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 14, background: '#fff', padding: 14 }}>
      <p style={{ margin: 0, color: '#64748b', fontWeight: 700, fontSize: '0.85rem' }}>{label}</p>
      <p style={{ margin: '8px 0 0', color: '#0f172a', fontWeight: 900, fontSize: '1.4rem' }}>{value}</p>
    </div>
  )
}
