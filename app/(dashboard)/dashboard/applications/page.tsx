import type { Metadata } from 'next'
import {
  BadgeCheck,
  CircleDashed,
  Clock3,
  FileSearch,
  Gavel,
  ShieldAlert,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrgId } from '@/lib/authz'
import { updateApplicationStatus } from './actions'

export const metadata: Metadata = {
  title: 'Applications Queue',
  description: 'Lender application queue with status and decision readiness.',
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

function statusBadge(status: string) {
  const palette: Record<string, { bg: string; fg: string }> = {
    submitted: { bg: '#dbeafe', fg: '#1d4ed8' },
    under_review: { bg: '#fffbeb', fg: '#92400e' },
    approved: { bg: '#dcfce7', fg: '#166534' },
    funded: { bg: '#dcfce7', fg: '#166534' },
    declined: { bg: '#fee2e2', fg: '#991b1b' },
    draft: { bg: '#e2e8f0', fg: '#334155' },
  }
  const colors = palette[status] || { bg: '#f1f5f9', fg: '#334155' }
  return {
    borderRadius: 999,
    background: colors.bg,
    color: colors.fg,
    padding: '7px 11px',
    fontSize: '0.78rem',
    fontWeight: 900,
    whiteSpace: 'nowrap' as const,
  }
}

export default async function LenderApplicationsPage() {
  const supabase = await createClient()
  const orgId = await getCurrentOrgId()
  const applicationsRes = await supabase
    .from('loan_applications')
    .select('id,requested_amount,requested_term_months,status,decision_code,created_at,current_stage,underwriting_recommendation')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(50)

  const items = applicationsRes.data || []
  const submitted = items.filter((item: any) => item.status === 'submitted').length
  const underReview = items.filter((item: any) => item.status === 'under_review').length
  const approved = items.filter((item: any) => item.status === 'approved' || item.status === 'funded').length
  const declined = items.filter((item: any) => item.status === 'declined').length
  const requestedVolume = items.reduce((sum: number, item: any) => sum + Number(item.requested_amount || 0), 0)

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <section
        style={{
          borderRadius: 28,
          padding: 24,
          background: 'linear-gradient(135deg, #111827 0%, #1d4ed8 48%, #0f766e 100%)',
          color: '#fff',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', inset: 'auto -7% -42% auto', width: 320, height: 320, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', filter: 'blur(10px)' }} />
        <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: 18 }}>
          <div>
            <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.78 }}>
              Review Queue
            </p>
            <h1 style={{ margin: '10px 0 0', fontSize: '2rem', lineHeight: 1.03, fontWeight: 950, letterSpacing: '-0.04em' }}>
              Applications ready for review, decisioning, and funding handoff
            </h1>
            <p style={{ margin: '12px 0 0', maxWidth: 620, color: 'rgba(255,255,255,0.82)', lineHeight: 1.7 }}>
              Triage new submissions, move files through underwriting, and update lender decisions from a cleaner operational queue.
            </p>
            <div style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <HeroChip icon={FileSearch} label={`${items.length} applications`} />
              <HeroChip icon={Clock3} label={`${submitted + underReview} still in pipeline`} />
              <HeroChip icon={BadgeCheck} label={`${money(requestedVolume)} requested volume`} />
            </div>
          </div>

          <div style={{ borderRadius: 22, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', padding: 18, backdropFilter: 'blur(10px)' }}>
            <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.76 }}>
              Queue Mix
            </p>
            <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
              <MixRow label="Submitted" value={String(submitted)} tone="blue" />
              <MixRow label="Under review" value={String(underReview)} tone="amber" />
              <MixRow label="Approved or funded" value={String(approved)} tone="green" />
              <MixRow label="Declined" value={String(declined)} tone="red" />
            </div>
          </div>
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
        <MetricCard icon={CircleDashed} label="Submitted" value={String(submitted)} hint="New applications awaiting triage" tone="blue" />
        <MetricCard icon={Gavel} label="Under review" value={String(underReview)} hint="Files in active underwriting" tone="amber" />
        <MetricCard icon={BadgeCheck} label="Approved" value={String(approved)} hint="Approved or funded applications" tone="green" />
        <MetricCard icon={ShieldAlert} label="Declined" value={String(declined)} hint="Applications closed out by policy or credit" tone="red" />
      </section>

      <section style={{ display: 'grid', gap: 12 }}>
        {items.length === 0 && (
          <div style={{ border: '1px dashed #cbd5e1', borderRadius: 18, background: '#fff', padding: 18, color: '#64748b' }}>
            No applications submitted yet.
          </div>
        )}

        {items.map((item: any) => (
          <div
            key={item.id}
            style={{
              border: '1px solid #dbe4f0',
              borderRadius: 22,
              background: '#fff',
              padding: 18,
              boxShadow: '0 10px 30px rgba(15,23,42,0.04)',
              display: 'grid',
              gridTemplateColumns: '1.1fr 0.9fr',
              gap: 18,
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <p style={{ margin: 0, color: '#0f172a', fontWeight: 950, fontSize: '1.08rem' }}>
                  {money(Number(item.requested_amount || 0))} request
                </p>
                <span style={statusBadge(String(item.status || 'draft'))}>{String(item.status || 'draft').replaceAll('_', ' ')}</span>
              </div>

              <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
                <MetaCard label="Term" value={`${item.requested_term_months} months`} />
                <MetaCard label="Stage" value={item.current_stage ? String(item.current_stage).replaceAll('_', ' ') : 'application submitted'} />
                <MetaCard label="Decision signal" value={item.underwriting_recommendation || item.decision_code || 'Awaiting review'} />
              </div>

              <p style={{ margin: '12px 0 0', color: '#64748b', fontSize: '0.83rem' }}>
                #{item.id.slice(0, 8)} • Created {timeAgo(item.created_at)}
              </p>
            </div>

            <div style={{ border: '1px solid #e2e8f0', borderRadius: 18, background: '#f8fafc', padding: 14 }}>
              <p style={{ margin: 0, color: '#0f172a', fontWeight: 900 }}>Decision controls</p>
              <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '0.82rem', lineHeight: 1.55 }}>
                Update lender status and optional decision code for downstream funding or decline workflows.
              </p>

              <form action={updateApplicationStatus} style={{ display: 'grid', gap: 10, marginTop: 12 }}>
                <input type="hidden" name="application_id" value={item.id} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px auto', gap: 8 }}>
                  <select name="status" defaultValue={item.status} style={selectStyle}>
                    <option value="under_review">under_review</option>
                    <option value="approved">approved</option>
                    <option value="declined">declined</option>
                    <option value="funded">funded</option>
                  </select>
                  <input name="decision_code" defaultValue={item.decision_code || ''} placeholder="Decision code" style={inputStyle} />
                  <button type="submit" style={buttonStyle}>
                    Update
                  </button>
                </div>
              </form>
            </div>
          </div>
        ))}
      </section>

      <style>{`
        @media (max-width: 1180px) {
          section[style*='grid-template-columns: 1.15fr 0.85fr'],
          section[style*='grid-template-columns: repeat(4'],
          div[style*='grid-template-columns: 1.1fr 0.9fr'] {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 760px) {
          section[style*='grid-template-columns: repeat(4'] {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
          div[style*='grid-template-columns: repeat(3'] {
            grid-template-columns: 1fr !important;
          }
          div[style*='grid-template-columns: 1fr 120px auto'] {
            grid-template-columns: 1fr !important;
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

function HeroChip({ icon: Icon, label }: { icon: React.ComponentType<{ size?: number; color?: string }>; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 999, background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.12)', fontWeight: 800, fontSize: '0.82rem' }}>
      <Icon size={14} color="#fff" />
      {label}
    </span>
  )
}

function MixRow({ label, value, tone }: { label: string; value: string; tone: 'blue' | 'amber' | 'green' | 'red' }) {
  const palette = {
    blue: { dot: '#60a5fa', bg: 'rgba(96,165,250,0.16)' },
    amber: { dot: '#f59e0b', bg: 'rgba(245,158,11,0.16)' },
    green: { dot: '#22c55e', bg: 'rgba(34,197,94,0.16)' },
    red: { dot: '#f87171', bg: 'rgba(248,113,113,0.16)' },
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
  tone: 'blue' | 'amber' | 'green' | 'red'
}) {
  const palette = {
    blue: { bg: '#eff6ff', fg: '#1d4ed8', ring: '#bfdbfe' },
    amber: { bg: '#fffbeb', fg: '#92400e', ring: '#fde68a' },
    green: { bg: '#f0fdf4', fg: '#166534', ring: '#bbf7d0' },
    red: { bg: '#fef2f2', fg: '#991b1b', ring: '#fecaca' },
  }[tone]

  return (
    <div style={{ border: '1px solid #dbe4f0', borderRadius: 22, background: '#fff', padding: 16, boxShadow: '0 10px 28px rgba(15,23,42,0.04)' }}>
      <div style={{ width: 44, height: 44, borderRadius: 14, background: palette.bg, border: `1px solid ${palette.ring}`, display: 'grid', placeItems: 'center' }}>
        <Icon size={18} color={palette.fg} />
      </div>
      <p style={{ margin: '14px 0 0', color: '#64748b', fontWeight: 800, fontSize: '0.84rem' }}>{label}</p>
      <p style={{ margin: '6px 0 0', color: '#0f172a', fontWeight: 950, fontSize: '1.72rem', letterSpacing: '-0.03em' }}>{value}</p>
      <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: '0.8rem', lineHeight: 1.55 }}>{hint}</p>
    </div>
  )
}

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 14, background: '#f8fafc', padding: 12 }}>
      <p style={{ margin: 0, color: '#64748b', fontWeight: 800, fontSize: '0.75rem' }}>{label}</p>
      <p style={{ margin: '8px 0 0', color: '#0f172a', fontWeight: 900, fontSize: '0.9rem' }}>{value}</p>
    </div>
  )
}

const selectStyle = {
  borderRadius: 12,
  border: '1.5px solid #cbd5e1',
  padding: '10px 12px',
  fontSize: '0.82rem',
  background: '#fff',
  color: '#0f172a',
} satisfies React.CSSProperties

const inputStyle = {
  borderRadius: 12,
  border: '1.5px solid #cbd5e1',
  padding: '10px 12px',
  fontSize: '0.82rem',
  background: '#fff',
  color: '#0f172a',
} satisfies React.CSSProperties

const buttonStyle = {
  border: 'none',
  borderRadius: 12,
  background: 'linear-gradient(135deg, #0f766e 0%, #0ea5a4 100%)',
  color: '#fff',
  padding: '10px 14px',
  fontSize: '0.82rem',
  fontWeight: 900,
  cursor: 'pointer',
} satisfies React.CSSProperties
