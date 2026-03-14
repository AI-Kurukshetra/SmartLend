import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrgId, requirePermission } from '@/lib/authz'
import { generateMonthlyStatements, runApplicationComplianceScan } from './actions'

export const metadata: Metadata = {
  title: 'Compliance & Audit',
  description: 'Audit event stream and compliance controls.',
}

export default async function CompliancePage() {
  await requirePermission('compliance.manage')
  const supabase = await createClient()
  const orgId = await getCurrentOrgId()
  const eventsRes = await supabase
    .from('audit_events')
    .select('id,event_type,resource_type,created_at,actor_type')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(60)
  const [applicationsRes, complianceRes] = await Promise.all([
    supabase
      .from('loan_applications')
      .select('id,status,loan_purpose,underwriting_recommendation')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('compliance_events')
      .select('id,application_id,regulation,check_type,status,detail,created_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  const events = eventsRes.data || []
  const applications = applicationsRes.data || []
  const complianceEvents = complianceRes.data || []
  const byApp = new Map<string, any[]>()
  for (const item of complianceEvents) {
    const current = byApp.get(item.application_id) || []
    current.push(item)
    byApp.set(item.application_id, current)
  }

  return (
    <div>
      <h1 style={{ margin: 0, fontSize: '1.9rem', fontWeight: 900, color: '#0f172a' }}>Compliance and audit</h1>
      <p style={{ marginTop: 8, color: '#64748b', lineHeight: 1.7 }}>
        Event history to support auditability, governance, and regulator-ready reporting.
      </p>
      <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <form action={generateMonthlyStatements}>
          <button type="submit" style={{ border: 'none', borderRadius: 10, background: '#0f766e', color: '#fff', fontWeight: 800, padding: '10px 14px', cursor: 'pointer' }}>
            Generate monthly statements
          </button>
        </form>
      </div>
      <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
        {applications.map((application: any) => {
          const checks = byApp.get(application.id) || []
          return (
            <div key={application.id} style={{ border: '1px solid #e2e8f0', borderRadius: 14, background: '#fff', padding: 14, display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <p style={{ margin: 0, color: '#0f172a', fontWeight: 800 }}>Application #{application.id.slice(0, 8)}</p>
                  <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '0.84rem' }}>
                    {application.status} | {application.loan_purpose || 'loan'} | {application.underwriting_recommendation || 'n/a'}
                  </p>
                </div>
                <form action={runApplicationComplianceScan}>
                  <input type="hidden" name="application_id" value={application.id} />
                  <button type="submit" style={{ border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff', color: '#0f172a', padding: '8px 12px', fontWeight: 800, cursor: 'pointer' }}>
                    Run compliance scan
                  </button>
                </form>
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                {checks.length === 0 && <div style={{ color: '#64748b', fontSize: '0.84rem' }}>No compliance checks recorded yet.</div>}
                {checks.map((check: any) => (
                  <div key={check.id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, background: '#f8fafc', padding: 10, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <div>
                      <p style={{ margin: 0, color: '#0f172a', fontWeight: 800 }}>{check.regulation.toUpperCase()} | {check.check_type}</p>
                      <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.84rem' }}>{check.detail}</p>
                    </div>
                    <span style={{ color: '#334155', fontWeight: 800 }}>{check.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
      <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
        {events.length === 0 && (
          <div style={{ border: '1px dashed #cbd5e1', borderRadius: 14, background: '#fff', padding: 16, color: '#64748b' }}>
            No audit events recorded yet.
          </div>
        )}
        {events.map((event: any) => (
          <div key={event.id} style={{ border: '1px solid #e2e8f0', borderRadius: 14, background: '#fff', padding: 14, display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <p style={{ margin: 0, color: '#0f172a', fontWeight: 800 }}>{event.event_type}</p>
              <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '0.84rem' }}>{event.resource_type} | {event.actor_type}</p>
            </div>
            <span style={{ color: '#64748b', fontSize: '0.82rem' }}>{new Date(event.created_at).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
