import { createClient } from '@/lib/supabase/server'
import { uploadBorrowerDocument } from './actions'

export default async function BorrowerDocumentsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const borrowerRes = user
    ? await supabase
      .from('borrower_profiles')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()
    : { data: null as any }

  let apps: any[] = []
  let docs: any[] = []
  if (borrowerRes.data?.id) {
    const appsRes = await supabase
      .from('loan_applications')
      .select('id,status')
      .eq('borrower_id', borrowerRes.data.id)
      .order('created_at', { ascending: false })
      .limit(30)
    apps = appsRes.data || []
    const appIds = apps.map((a: any) => a.id)
    if (appIds.length > 0) {
      const docsRes = await supabase
        .from('loan_documents')
        .select('id,doc_type,status,created_at,application_id,file_name,file_size_bytes,version,review_note,storage_path')
        .in('application_id', appIds)
        .order('created_at', { ascending: false })
        .limit(40)
      docs = await Promise.all((docsRes.data || []).map(async (doc: any) => {
        const signedRes = await supabase.storage.from('loan-documents').createSignedUrl(doc.storage_path, 60 * 30)
        return { ...doc, signedUrl: signedRes.data?.signedUrl || null }
      }))
    }
  }

  return (
    <div>
      <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900, color: '#0f172a' }}>Documents</h1>
      <p style={{ marginTop: 8, color: '#64748b', lineHeight: 1.7 }}>
        Upload application documents and track verification status per loan application.
      </p>
      <form action={uploadBorrowerDocument} style={{ marginTop: 14, border: '1px solid #e2e8f0', borderRadius: 14, background: '#fff', padding: 14, display: 'grid', gap: 8, maxWidth: 680 }}>
        <p style={{ margin: 0, color: '#0f172a', fontWeight: 800 }}>Upload secure document</p>
        <select required name="application_id" style={{ borderRadius: 10, border: '1.5px solid #e2e8f0', padding: '10px 12px' }}>
          <option value="">Select application</option>
          {apps.map((app: any) => <option key={app.id} value={app.id}>#{app.id.slice(0, 8)} | {app.status}</option>)}
        </select>
        <input required name="doc_type" placeholder="Document type (e.g. paystub, ID)" style={{ borderRadius: 10, border: '1.5px solid #e2e8f0', padding: '10px 12px' }} />
        <input required type="file" name="file" accept=".pdf,.png,.jpg,.jpeg,.webp" style={{ borderRadius: 10, border: '1.5px solid #e2e8f0', padding: '10px 12px', background: '#fff' }} />
        <button type="submit" style={{ border: 'none', borderRadius: 10, background: '#0f766e', color: '#fff', fontWeight: 800, padding: '10px 12px', cursor: 'pointer' }}>
          Submit document
        </button>
      </form>
      <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
        {docs.length === 0 && (
          <div style={{ border: '1px dashed #cbd5e1', borderRadius: 14, background: '#fff', padding: 16, color: '#64748b' }}>
            No documents uploaded yet.
          </div>
        )}
        {docs.map((doc: any) => (
          <div key={doc.id} style={{ border: '1px solid #e2e8f0', borderRadius: 14, background: '#fff', padding: 14, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <p style={{ margin: 0, color: '#0f172a', fontWeight: 800 }}>
                {doc.doc_type} | App #{doc.application_id.slice(0, 8)} | v{doc.version}
              </p>
              <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '0.84rem' }}>
                {doc.file_name || 'document'}{doc.file_size_bytes ? ` | ${Math.ceil(Number(doc.file_size_bytes) / 1024)} KB` : ''}{doc.review_note ? ` | ${doc.review_note}` : ''}
              </p>
              {doc.signedUrl && (
                <a href={doc.signedUrl} target="_blank" rel="noreferrer" style={{ color: '#0f766e', fontWeight: 800, textDecoration: 'none', fontSize: '0.84rem' }}>
                  Open secure file
                </a>
              )}
            </div>
            <span style={{ color: '#334155', fontWeight: 700 }}>{doc.status}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
