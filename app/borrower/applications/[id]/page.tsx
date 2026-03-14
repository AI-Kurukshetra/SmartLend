import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { CSSProperties } from 'react'
import { createClient } from '@/lib/supabase/server'
import { saveApplicationDraft, signLoanAgreement, submitApplicationDetails } from './actions'

export default async function BorrowerApplicationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string; success?: string }>
}) {
  const { id } = await params
  const { error, success } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()

  const borrowerRes = await supabase
    .from('borrower_profiles')
    .select('id,full_name')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()
  if (!borrowerRes.data?.id) notFound()

  const applicationRes = await supabase
    .from('loan_applications')
    .select('*')
    .eq('id', id)
    .eq('borrower_id', borrowerRes.data.id)
    .limit(1)
    .maybeSingle()
  if (!applicationRes.data) notFound()

  const docsRes = await supabase
    .from('loan_documents')
    .select('id,doc_type,status,storage_path,file_name,version,review_note,created_at')
    .eq('application_id', id)
    .order('created_at', { ascending: false })
    .limit(20)

  const agreementRes = await supabase
    .from('loan_agreements')
    .select('id,status,agreement_text,signed_at')
    .eq('application_id', id)
    .limit(1)
    .maybeSingle()

  const reportsRes = await supabase
    .from('credit_reports')
    .select('id,bureau,pull_type,score,monitoring_enabled,created_at')
    .eq('application_id', id)
    .order('created_at', { ascending: false })
    .limit(10)

  const riskRes = await supabase
    .from('risk_assessments')
    .select('score,band,summary,recommended_action,factors,metrics,updated_at')
    .eq('application_id', id)
    .limit(1)
    .maybeSingle()

  const app = applicationRes.data as any
  const agreement = agreementRes.data as any
  const docs = await Promise.all((docsRes.data || []).map(async (doc: any) => {
    const signedRes = await supabase.storage.from('loan-documents').createSignedUrl(doc.storage_path, 60 * 30)
    return { ...doc, signedUrl: signedRes.data?.signedUrl || null }
  }))
  const reports = reportsRes.data || []
  const risk = riskRes.data as any

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div>
        <Link href="/borrower/applications" style={{ color: '#0f766e', textDecoration: 'none', fontWeight: 800 }}>
          Back to applications
        </Link>
        <h1 style={{ margin: '10px 0 0', fontSize: '1.9rem', fontWeight: 900, color: '#0f172a' }}>
          Application portal
        </h1>
        <p style={{ marginTop: 8, color: '#64748b', lineHeight: 1.7 }}>
          Complete the borrower application, upload required documents, and sign the consent agreement.
        </p>
        {error && <div style={errorBannerStyle}>{error}</div>}
        {success && <div style={successBannerStyle}>{success}</div>}
      </div>

      <div style={gridStyle}>
        <section style={panelStyle}>
          <h2 style={sectionTitle}>1. Application details</h2>
          <form action={submitApplicationDetails} style={{ display: 'grid', gap: 10 }}>
            <input type="hidden" name="application_id" value={app.id} />
            <div style={twoColStyle}>
              <Field name="full_name" label="Full name" defaultValue={app.full_name || borrowerRes.data.full_name || ''} required />
              <Field name="email" label="Email" defaultValue={app.email || user.email || ''} required />
            </div>
            <div style={twoColStyle}>
              <Field name="phone" label="Phone" defaultValue={app.phone || ''} required />
              <Field name="date_of_birth" label="Date of birth" defaultValue={app.date_of_birth || ''} type="date" />
            </div>
            <div style={twoColStyle}>
              <Field name="employment_status" label="Employment status" defaultValue={app.employment_status || ''} required />
              <Field name="annual_income" label="Annual income" defaultValue={app.annual_income || ''} type="number" required />
            </div>
            <div style={twoColStyle}>
              <Field name="credit_score" label="Credit score" defaultValue={app.credit_score || ''} type="number" required />
              <Field name="monthly_debt_obligations" label="Monthly debt obligations" defaultValue={app.monthly_debt_obligations || ''} type="number" required />
            </div>
            <Field name="loan_purpose" label="Loan purpose" defaultValue={app.loan_purpose || ''} required />
            <Field name="address_line1" label="Address" defaultValue={app.address_line1 || ''} />
            <div style={threeColStyle}>
              <Field name="city" label="City" defaultValue={app.city || ''} />
              <Field name="state" label="State" defaultValue={app.state || ''} />
              <Field name="postal_code" label="Postal code" defaultValue={app.postal_code || ''} />
            </div>
            <div style={{ display: 'grid', gap: 8, color: '#334155' }}>
              <label style={checkLabel}><input type="checkbox" name="consent_credit_pull" value="true" defaultChecked={Boolean(app.consent_credit_pull)} /> Authorize credit and underwriting review.</label>
              <label style={checkLabel}><input type="checkbox" name="consent_terms" value="true" defaultChecked={Boolean(app.consent_terms)} /> Confirm application accuracy and consent to SmartLend terms.</label>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button type="submit" style={primaryButton}>
                {app.status === 'submitted' ? 'Update application' : 'Submit details'}
              </button>
            </div>
          </form>
          <form action={saveApplicationDraft} style={{ marginTop: 10, display: 'grid', gap: 8 }}>
            <input type="hidden" name="application_id" value={app.id} />
            <input type="hidden" name="full_name" value={app.full_name || borrowerRes.data.full_name || ''} />
            <input type="hidden" name="email" value={app.email || user.email || ''} />
            <input type="hidden" name="phone" value={app.phone || ''} />
            <input type="hidden" name="date_of_birth" value={app.date_of_birth || ''} />
            <input type="hidden" name="employment_status" value={app.employment_status || ''} />
            <input type="hidden" name="annual_income" value={app.annual_income || ''} />
            <input type="hidden" name="loan_purpose" value={app.loan_purpose || ''} />
            <input type="hidden" name="address_line1" value={app.address_line1 || ''} />
            <input type="hidden" name="city" value={app.city || ''} />
            <input type="hidden" name="state" value={app.state || ''} />
            <input type="hidden" name="postal_code" value={app.postal_code || ''} />
            <button type="submit" style={secondaryButton}>Save draft snapshot</button>
          </form>
        </section>

        <section style={panelStyle}>
          <h2 style={sectionTitle}>2. Documents</h2>
          <p style={mutedText}>Upload supporting documents from the Documents section for this application.</p>
          <div style={{ display: 'grid', gap: 8 }}>
            {docs.length === 0 && <div style={emptyStyle}>No documents uploaded for this application yet.</div>}
            {docs.map((doc: any) => (
              <div key={doc.id} style={listRowStyle}>
                <div>
                  <p style={{ margin: 0, fontWeight: 800, color: '#0f172a' }}>{doc.doc_type}</p>
                  <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                    {doc.file_name || doc.storage_path} | v{doc.version}{doc.review_note ? ` | ${doc.review_note}` : ''}
                  </p>
                  {doc.signedUrl && (
                    <a href={doc.signedUrl} target="_blank" rel="noreferrer" style={{ color: '#0f766e', fontWeight: 800, textDecoration: 'none', fontSize: '0.84rem' }}>
                      Open secure file
                    </a>
                  )}
                </div>
                <span style={badgeStyle(doc.status)}>{doc.status}</span>
              </div>
            ))}
            <Link href="/borrower/documents" style={{ ...secondaryLinkStyle, marginTop: 4 }}>
              Manage documents
            </Link>
          </div>
        </section>
      </div>

      <section style={panelStyle}>
        <h2 style={sectionTitle}>Workflow progress</h2>
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={listRowStyle}>
            <span style={{ color: '#475569', fontWeight: 700 }}>Current stage</span>
            <span style={badgeStyle(app.current_stage || 'application_submitted')}>{app.current_stage || 'application_submitted'}</span>
          </div>
          {Array.isArray(app.workflow_history) && app.workflow_history.slice(-5).reverse().map((entry: any, index: number) => (
            <div key={`${entry.changed_at}-${index}`} style={{ border: '1px solid #e2e8f0', borderRadius: 10, background: '#f8fafc', padding: 10 }}>
              <p style={{ margin: 0, color: '#0f172a', fontWeight: 800 }}>{entry.from || 'start'} {'->'} {entry.to}</p>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.82rem' }}>{entry.changed_at ? new Date(entry.changed_at).toLocaleString() : ''}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={panelStyle}>
        <h2 style={sectionTitle}>Underwriting snapshot</h2>
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={listRowStyle}>
            <span style={{ color: '#475569', fontWeight: 700 }}>Recommendation</span>
            <span style={badgeStyle(app.underwriting_recommendation || 'pending')}>{app.underwriting_recommendation || 'pending'}</span>
          </div>
          <div style={listRowStyle}>
            <span style={{ color: '#475569', fontWeight: 700 }}>Decision code</span>
            <span style={{ color: '#0f172a', fontWeight: 800 }}>{app.decision_code || 'none'}</span>
          </div>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, background: '#f8fafc', padding: 14, color: '#475569', lineHeight: 1.7 }}>
            {app.underwriting_summary || 'Submit the application details to generate an underwriting recommendation.'}
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {reports.length === 0 && <div style={emptyStyle}>No credit bureau pull recorded yet.</div>}
            {reports.map((report: any) => (
              <div key={report.id} style={listRowStyle}>
                <div>
                  <p style={{ margin: 0, color: '#0f172a', fontWeight: 800 }}>
                    {report.bureau} {report.pull_type} pull
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                    Score {report.score ?? 'n/a'} | {new Date(report.created_at).toLocaleString()}{report.monitoring_enabled ? ' | monitoring on' : ''}
                  </p>
                </div>
                <span style={badgeStyle('verified')}>credit</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={panelStyle}>
        <h2 style={sectionTitle}>Risk assessment</h2>
        {!risk && <div style={emptyStyle}>Risk scoring will appear after underwriting runs on this application.</div>}
        {risk && (
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={listRowStyle}>
              <span style={{ color: '#475569', fontWeight: 700 }}>Risk band</span>
              <span style={badgeStyle(risk.band)}>{risk.band} | {risk.score}/100</span>
            </div>
            <div style={listRowStyle}>
              <span style={{ color: '#475569', fontWeight: 700 }}>Recommended action</span>
              <span style={{ color: '#0f172a', fontWeight: 800 }}>{risk.recommended_action}</span>
            </div>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, background: '#f8fafc', padding: 14, color: '#475569', lineHeight: 1.7 }}>
              {risk.summary}
            </div>
          </div>
        )}
      </section>

      <section style={panelStyle}>
        <h2 style={sectionTitle}>3. E-sign consent</h2>
        {!agreement && (
          <div style={emptyStyle}>
            Submit application details first. SmartLend will prepare the electronic consent agreement afterward.
          </div>
        )}
        {agreement && (
          <>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, background: '#f8fafc', padding: 14, color: '#334155', lineHeight: 1.7 }}>
              {agreement.agreement_text}
            </div>
            <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={badgeStyle(agreement.status)}>
                {agreement.status === 'signed' && agreement.signed_at
                  ? `signed on ${new Date(agreement.signed_at).toLocaleString()}`
                  : agreement.status}
              </span>
              {agreement.status !== 'signed' && (
                <form action={signLoanAgreement}>
                  <input type="hidden" name="application_id" value={app.id} />
                  <button type="submit" style={primaryButton}>Sign electronically</button>
                </form>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  )
}

function Field({
  label,
  name,
  defaultValue,
  required,
  type = 'text',
}: {
  label: string
  name: string
  defaultValue?: string | number
  required?: boolean
  type?: string
}) {
  return (
    <label style={{ display: 'grid', gap: 6 }}>
      <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#475569' }}>{label}</span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        required={required}
        style={inputStyle}
      />
    </label>
  )
}

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)',
  gap: 16,
}

const panelStyle: CSSProperties = {
  border: '1px solid #e2e8f0',
  borderRadius: 18,
  background: '#fff',
  padding: 18,
}

const sectionTitle: CSSProperties = {
  margin: 0,
  fontSize: '1.1rem',
  fontWeight: 900,
  color: '#0f172a',
}

const mutedText: CSSProperties = {
  margin: '8px 0 14px',
  color: '#64748b',
  lineHeight: 1.7,
}

const twoColStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 10,
}

const threeColStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: 10,
}

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  border: '1.5px solid #e2e8f0',
  outline: 'none',
}

const primaryButton: CSSProperties = {
  border: 'none',
  borderRadius: 10,
  background: '#0f766e',
  color: '#fff',
  fontWeight: 800,
  padding: '10px 14px',
  cursor: 'pointer',
}

const secondaryButton: CSSProperties = {
  border: '1px solid #cbd5e1',
  borderRadius: 10,
  background: '#fff',
  color: '#0f172a',
  fontWeight: 800,
  padding: '10px 14px',
  cursor: 'pointer',
}

const secondaryLinkStyle: CSSProperties = {
  display: 'inline-block',
  textDecoration: 'none',
  border: '1px solid #cbd5e1',
  borderRadius: 10,
  background: '#fff',
  color: '#0f172a',
  fontWeight: 800,
  padding: '10px 14px',
}

const emptyStyle: CSSProperties = {
  border: '1px dashed #cbd5e1',
  borderRadius: 12,
  padding: 14,
  color: '#64748b',
  background: '#fff',
}

const listRowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 10,
  padding: 12,
  border: '1px solid #e2e8f0',
  borderRadius: 12,
}

const checkLabel: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
}

function badgeStyle(status: string): CSSProperties {
  const tone =
    status === 'signed' || status === 'verified'
      ? { bg: '#dcfce7', fg: '#166534' }
      : status === 'rejected' || status === 'cancelled'
        ? { bg: '#fee2e2', fg: '#991b1b' }
        : { bg: '#eef2ff', fg: '#3730a3' }
  return {
    borderRadius: 999,
    padding: '6px 10px',
    background: tone.bg,
    color: tone.fg,
    fontWeight: 800,
    fontSize: '0.8rem',
  }
}

const errorBannerStyle: CSSProperties = {
  marginTop: 12,
  border: '1px solid #fecaca',
  background: '#fef2f2',
  color: '#b91c1c',
  borderRadius: 12,
  padding: '10px 12px',
  fontWeight: 700,
}

const successBannerStyle: CSSProperties = {
  marginTop: 12,
  border: '1px solid #bbf7d0',
  background: '#f0fdf4',
  color: '#166534',
  borderRadius: 12,
  padding: '10px 12px',
  fontWeight: 700,
}
