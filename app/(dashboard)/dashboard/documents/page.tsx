import type { Metadata } from 'next'
import Link from 'next/link'
import { FileCheck2, FileText, FolderOpen, ShieldAlert } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrgId } from '@/lib/authz'
import { formatUiLabel } from '@/lib/utils'
import { reviewLoanDocument } from './actions'

export const metadata: Metadata = {
  title: 'Documents',
  description: 'Secure lender-side document review and compliance workflow.',
}

export default async function DocumentsPage() {
  const supabase = await createClient()
  const orgId = await getCurrentOrgId()

  const docsRes = await supabase
    .from('loan_documents')
    .select('id,application_id,doc_type,status,storage_path,file_name,mime_type,file_size_bytes,version,review_note,reviewed_at,created_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(100)

  const appIds = Array.from(new Set((docsRes.data || []).map((doc: any) => doc.application_id as string)))
  const appsRes = appIds.length > 0
    ? await supabase.from('loan_applications').select('id,borrower_id,status').in('id', appIds)
    : { data: [] as any[] }

  const borrowerIds = Array.from(new Set((appsRes.data || []).map((app: any) => app.borrower_id as string)))
  const borrowersRes = borrowerIds.length > 0
    ? await supabase.from('borrower_profiles').select('id,full_name').in('id', borrowerIds)
    : { data: [] as any[] }

  const appMap = new Map((appsRes.data || []).map((app: any) => [app.id, app]))
  const borrowerMap = new Map((borrowersRes.data || []).map((borrower: any) => [borrower.id, borrower]))

  const docsWithUrls = await Promise.all((docsRes.data || []).map(async (doc: any) => {
    const signedRes = await supabase.storage.from('loan-documents').createSignedUrl(doc.storage_path, 60 * 30)
    return { ...doc, signedUrl: signedRes.data?.signedUrl || null }
  }))

  const verifiedCount = docsWithUrls.filter((doc: any) => doc.status === 'verified').length
  const pendingCount = docsWithUrls.filter((doc: any) => doc.status === 'pending').length
  const rejectedCount = docsWithUrls.filter((doc: any) => doc.status === 'rejected').length

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <section style={{ borderRadius: 28, padding: 24, background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 42%, #0f766e 100%)', color: '#fff' }}>
        <p style={eyebrowStyle}>Documents</p>
        <h1 style={heroTitleStyle}>Review borrower files with a cleaner verification and exception workflow</h1>
        <p style={heroCopyStyle}>
          Move from pending uploads to verified paperwork with secure file access, clear review status, and readable borrower context on every document row.
        </p>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
        <StatCard icon={FolderOpen} label="Documents" value={String(docsWithUrls.length)} tone="blue" />
        <StatCard icon={FileCheck2} label="Verified" value={String(verifiedCount)} tone="teal" />
        <StatCard icon={FileText} label="Pending review" value={String(pendingCount)} tone="amber" />
        <StatCard icon={ShieldAlert} label="Rejected" value={String(rejectedCount)} tone="rose" />
      </section>

      <section style={{ display: 'grid', gap: 14 }}>
        {docsWithUrls.length === 0 && <EmptyState text="No borrower documents uploaded yet." />}
        {docsWithUrls.map((doc: any) => {
          const app = appMap.get(doc.application_id)
          const borrower = app ? borrowerMap.get(app.borrower_id) : null
          return (
            <article key={doc.id} style={panelStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ margin: 0, color: 'var(--color-text-primary)', fontWeight: 950, fontSize: '1.05rem' }}>{formatUiLabel(doc.doc_type)}</p>
                  <p style={{ margin: '6px 0 0', color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
                    {borrower?.full_name || 'Borrower'} • Application #{String(doc.application_id || '').slice(0, 8)} • Version {doc.version}
                  </p>
                </div>
                <Badge value={doc.status} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
                <Metric label="File name" value={doc.file_name || 'Document'} />
                <Metric label="File type" value={doc.mime_type || 'Unknown'} />
                <Metric label="File size" value={doc.file_size_bytes ? `${Math.ceil(Number(doc.file_size_bytes) / 1024)} KB` : 'Not available'} />
                <Metric label="Application status" value={formatUiLabel(app?.status || 'not_available')} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', gap: 14 }}>
                <div style={sectionCardStyle}>
                  <h2 style={sectionTitleStyle}>Review document</h2>
                  <p style={sectionSubtitleStyle}>Save the document decision and note what the borrower must correct, if anything.</p>
                  <form action={reviewLoanDocument} style={{ marginTop: 14, display: 'grid', gap: 10 }}>
                    <input type="hidden" name="document_id" value={doc.id} />
                    <select name="status" defaultValue={doc.status} style={inputStyle}>
                      <option value="pending">Pending</option>
                      <option value="verified">Verified</option>
                      <option value="rejected">Rejected</option>
                    </select>
                    <textarea name="review_note" defaultValue={doc.review_note || ''} rows={4} placeholder="Review note or remediation request" style={{ ...inputStyle, resize: 'vertical' }} />
                    <button type="submit" style={primaryButtonStyle}>Save review</button>
                  </form>
                </div>

                <div style={sectionCardStyle}>
                  <h2 style={sectionTitleStyle}>Secure access</h2>
                  <p style={sectionSubtitleStyle}>Open the signed file link or review the latest verification metadata.</p>
                  <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
                    {doc.signedUrl ? (
                      <Link href={doc.signedUrl} target="_blank" style={linkButtonStyle}>
                        Open secure file
                      </Link>
                    ) : (
                      <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.88rem' }}>Secure link not available.</div>
                    )}
                    <MiniRow label="Reviewed at" value={doc.reviewed_at ? new Date(doc.reviewed_at).toLocaleString() : 'Not reviewed'} />
                    <MiniRow label="Uploaded" value={new Date(doc.created_at).toLocaleDateString()} />
                  </div>
                </div>
              </div>
            </article>
          )
        })}
      </section>

      <style>{`
        @media (max-width: 1080px) {
          section[style*='grid-template-columns: repeat(4'] { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          div[style*='grid-template-columns: 1.05fr 0.95fr'] { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 760px) {
          section[style*='grid-template-columns: repeat(4'] { grid-template-columns: 1fr !important; }
          div[style*='grid-template-columns: repeat(4, minmax(0, 1fr))'] { grid-template-columns: 1fr !important; }
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={metricCardStyle}>
      <p style={metricLabelStyle}>{label}</p>
      <p style={metricValueStyle}>{value}</p>
    </div>
  )
}

function MiniRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', border: '1px solid var(--color-border)', borderRadius: 14, background: 'var(--gray-50)', padding: '12px 14px' }}>
      <span style={{ color: 'var(--color-text-secondary)', fontWeight: 800, fontSize: '0.82rem' }}>{label}</span>
      <span style={{ color: 'var(--color-text-primary)', fontWeight: 900, fontSize: '0.84rem', textAlign: 'right' }}>{value}</span>
    </div>
  )
}

function Badge({ value }: { value: string }) {
  const tone = value === 'verified'
    ? { bg: '#dcfce7', fg: '#166534' }
    : value === 'rejected'
      ? { bg: '#fee2e2', fg: '#991b1b' }
      : { bg: '#fffbeb', fg: '#b45309' }

  return (
    <span style={{ borderRadius: 999, padding: '7px 11px', background: tone.bg, color: tone.fg, fontSize: '0.78rem', fontWeight: 900 }}>
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
  lineHeight: 1.45,
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

const linkButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 14,
  padding: '12px 14px',
  background: 'var(--gray-50)',
  color: 'var(--brand-primary)',
  textDecoration: 'none',
  fontWeight: 900,
} satisfies React.CSSProperties
