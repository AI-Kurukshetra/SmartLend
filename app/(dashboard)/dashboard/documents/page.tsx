import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrgId } from '@/lib/authz'
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
    ? await supabase
      .from('loan_applications')
      .select('id,borrower_id,status')
      .in('id', appIds)
    : { data: [] as any[] }

  const borrowerIds = Array.from(new Set((appsRes.data || []).map((app: any) => app.borrower_id as string)))
  const borrowersRes = borrowerIds.length > 0
    ? await supabase
      .from('borrower_profiles')
      .select('id,full_name')
      .in('id', borrowerIds)
    : { data: [] as any[] }

  const appMap = new Map((appsRes.data || []).map((app: any) => [app.id, app]))
  const borrowerMap = new Map((borrowersRes.data || []).map((borrower: any) => [borrower.id, borrower]))

  const docsWithUrls = await Promise.all((docsRes.data || []).map(async (doc: any) => {
    const signedRes = await supabase.storage.from('loan-documents').createSignedUrl(doc.storage_path, 60 * 30)
    return { ...doc, signedUrl: signedRes.data?.signedUrl || null }
  }))

  return (
    <div>
      <h1 style={{ margin: 0, fontSize: '1.9rem', fontWeight: 900, color: '#0f172a' }}>Document management</h1>
      <p style={{ marginTop: 8, color: '#64748b', lineHeight: 1.7 }}>
        Review uploaded files, verify compliance paperwork, and keep a secure audit trail for every borrower application.
      </p>

      <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
        {docsWithUrls.length === 0 && (
          <div style={{ border: '1px dashed #cbd5e1', borderRadius: 14, background: '#fff', padding: 16, color: '#64748b' }}>
            No borrower documents uploaded yet.
          </div>
        )}
        {docsWithUrls.map((doc: any) => {
          const app = appMap.get(doc.application_id)
          const borrower = app ? borrowerMap.get(app.borrower_id) : null
          return (
            <div key={doc.id} style={{ border: '1px solid #e2e8f0', borderRadius: 14, background: '#fff', padding: 14, display: 'grid', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <p style={{ margin: 0, color: '#0f172a', fontWeight: 900 }}>{doc.doc_type}</p>
                  <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                    {borrower?.full_name || 'Borrower'} | App #{doc.application_id.slice(0, 8)} | v{doc.version}
                  </p>
                </div>
                <span style={badgeStyle(doc.status)}>{doc.status}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
                <Metric label="File" value={doc.file_name || 'document'} />
                <Metric label="Type" value={doc.mime_type || 'unknown'} />
                <Metric label="Size" value={doc.file_size_bytes ? `${Math.ceil(Number(doc.file_size_bytes) / 1024)} KB` : 'n/a'} />
                <Metric label="App status" value={app?.status || 'n/a'} />
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                {doc.signedUrl && (
                  <Link href={doc.signedUrl} target="_blank" style={{ color: '#0f766e', fontWeight: 800, textDecoration: 'none' }}>
                    Open secure file
                  </Link>
                )}
                {doc.reviewed_at && <span style={{ color: '#64748b', fontSize: '0.84rem' }}>Reviewed {new Date(doc.reviewed_at).toLocaleString()}</span>}
              </div>
              <form action={reviewLoanDocument} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <input type="hidden" name="document_id" value={doc.id} />
                <select name="status" defaultValue={doc.status} style={inputStyle}>
                  <option value="pending">pending</option>
                  <option value="verified">verified</option>
                  <option value="rejected">rejected</option>
                </select>
                <input name="review_note" defaultValue={doc.review_note || ''} placeholder="Review note" style={{ ...inputStyle, minWidth: 240 }} />
                <button type="submit" style={buttonStyle}>Save review</button>
              </form>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, background: '#f8fafc', padding: 10 }}>
      <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b', fontWeight: 700 }}>{label}</p>
      <p style={{ margin: '6px 0 0', fontSize: '0.92rem', color: '#0f172a', fontWeight: 800 }}>{value}</p>
    </div>
  )
}

function badgeStyle(status: string) {
  const palette: Record<string, { bg: string; text: string }> = {
    pending: { bg: '#fef3c7', text: '#92400e' },
    verified: { bg: '#dcfce7', text: '#166534' },
    rejected: { bg: '#fee2e2', text: '#991b1b' },
  }
  const colors = palette[status] || { bg: '#e2e8f0', text: '#334155' }
  return {
    borderRadius: 999,
    padding: '6px 10px',
    background: colors.bg,
    color: colors.text,
    fontWeight: 800,
    fontSize: '0.8rem',
  } as const
}

const inputStyle = {
  borderRadius: 8,
  border: '1px solid #cbd5e1',
  padding: '7px 10px',
  fontSize: '0.84rem',
} as const

const buttonStyle = {
  border: 'none',
  borderRadius: 8,
  background: '#0f766e',
  color: '#fff',
  padding: '8px 12px',
  fontWeight: 800,
  cursor: 'pointer',
} as const
