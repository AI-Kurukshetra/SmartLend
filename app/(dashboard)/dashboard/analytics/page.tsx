import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrgId, requirePermission } from '@/lib/authz'

export const metadata: Metadata = { title: 'Analytics' }

type Tone = 'slate' | 'teal' | 'green' | 'amber' | 'red' | 'blue'

function money(value: number) {
  return `$${Math.round(value).toLocaleString()}`
}

function pct(value: number) {
  return `${value.toFixed(1)}%`
}

function avg(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
}

function ratio(part: number, whole: number) {
  return whole > 0 ? (part / whole) * 100 : 0
}

function startOfWindow(days: number) {
  const value = new Date()
  value.setDate(value.getDate() - days)
  return value.toISOString()
}

export default async function AnalyticsPage() {
  await requirePermission('reports.view')
  const supabase = await createClient()
  const orgId = await getCurrentOrgId()

  const [
    appsRes,
    accountsRes,
    paymentsRes,
    collectionsRes,
    riskRes,
    complianceRes,
    offersRes,
    decisionsRes,
    documentsRes,
    commsRes,
    modificationsRes,
    auditRes,
  ] = await Promise.all([
    supabase
      .from('loan_applications')
      .select('status,requested_amount,requested_term_months,created_at')
      .eq('org_id', orgId)
      .limit(1000),
    supabase
      .from('loan_accounts')
      .select('status,principal_balance,funded_at,created_at')
      .eq('org_id', orgId)
      .limit(1000),
    supabase
      .from('loan_payments')
      .select('status,amount,principal_component,interest_component,fee_component,posted_at,created_at')
      .eq('org_id', orgId)
      .limit(1000),
    supabase
      .from('collection_cases')
      .select('status,days_past_due,created_at')
      .eq('org_id', orgId)
      .limit(1000),
    supabase
      .from('risk_assessments')
      .select('band,score,recommended_action,created_at')
      .eq('org_id', orgId)
      .limit(1000),
    supabase
      .from('compliance_events')
      .select('status,regulation,created_at')
      .eq('org_id', orgId)
      .limit(1000),
    supabase
      .from('loan_offers')
      .select('apr,term_months,principal_amount,fee_amount,status,created_at')
      .in(
        'application_id',
        (
          await supabase.from('loan_applications').select('id').eq('org_id', orgId).limit(1000)
        ).data?.map((row: { id: string }) => row.id) ?? ['00000000-0000-0000-0000-000000000000']
      ),
    supabase
      .from('underwriting_decisions')
      .select('decision_source,recommendation,created_at')
      .eq('org_id', orgId)
      .limit(1000),
    supabase
      .from('loan_documents')
      .select('status,doc_type,created_at')
      .eq('org_id', orgId)
      .limit(1000),
    supabase
      .from('communication_events')
      .select('direction,channel,status,created_at')
      .eq('org_id', orgId)
      .limit(1000),
    supabase
      .from('loan_modifications')
      .select('status,modification_type,created_at')
      .eq('org_id', orgId)
      .limit(1000),
    supabase
      .from('audit_events')
      .select('id,created_at')
      .eq('org_id', orgId)
      .limit(1000),
  ])

  const apps = appsRes.data || []
  const accounts = accountsRes.data || []
  const payments = paymentsRes.data || []
  const collections = collectionsRes.data || []
  const risks = riskRes.data || []
  const compliance = complianceRes.data || []
  const offers = offersRes.data || []
  const decisions = decisionsRes.data || []
  const documents = documentsRes.data || []
  const communications = commsRes.data || []
  const modifications = modificationsRes.data || []
  const audits = auditRes.data || []

  const approvedCount = apps.filter((item: { status: string }) => item.status === 'approved' || item.status === 'funded').length
  const declinedCount = apps.filter((item: { status: string }) => item.status === 'declined').length
  const underReviewCount = apps.filter((item: { status: string }) => item.status === 'under_review').length
  const submittedCount = apps.filter((item: { status: string }) => item.status === 'submitted').length
  const fundedAccounts = accounts.filter((item: { funded_at: string | null }) => Boolean(item.funded_at))
  const delinquentAccounts = accounts.filter((item: { status: string }) => item.status === 'delinquent').length
  const chargedOffAccounts = accounts.filter((item: { status: string }) => item.status === 'charged_off').length
  const outstanding = accounts.reduce((sum: number, item: { principal_balance: number | string | null }) => sum + Number(item.principal_balance || 0), 0)

  const postedPayments = payments.filter((item: { status: string }) => item.status === 'posted')
  const failedPayments = payments.filter((item: { status: string }) => item.status === 'failed')
  const postedVolume = postedPayments.reduce((sum: number, item: { amount: number | string | null }) => sum + Number(item.amount || 0), 0)
  const principalCollected = postedPayments.reduce((sum: number, item: { principal_component: number | string | null }) => sum + Number(item.principal_component || 0), 0)
  const interestCollected = postedPayments.reduce((sum: number, item: { interest_component: number | string | null }) => sum + Number(item.interest_component || 0), 0)
  const feeCollected = postedPayments.reduce((sum: number, item: { fee_component: number | string | null }) => sum + Number(item.fee_component || 0), 0)

  const avgRiskScore = avg(risks.map((item: { score: number | string }) => Number(item.score || 0)))
  const highRiskCount = risks.filter((item: { band: string }) => item.band === 'high').length
  const reviewRecommended = risks.filter((item: { recommended_action: string }) => item.recommended_action === 'review').length
  const declineRecommended = risks.filter((item: { recommended_action: string }) => item.recommended_action === 'decline').length

  const complianceFailures = compliance.filter((item: { status: string }) => item.status === 'failed').length
  const uniqueRegulations = new Set(compliance.map((item: { regulation: string | null }) => item.regulation).filter(Boolean)).size

  const openCollections = collections.filter((item: { status: string }) => item.status !== 'resolved').length
  const avgDaysPastDue = avg(
    collections
      .filter((item: { status: string }) => item.status !== 'resolved')
      .map((item: { days_past_due: number | string }) => Number(item.days_past_due || 0))
  )

  const acceptedOffers = offers.filter((item: { status: string }) => item.status === 'accepted')
  const avgOfferApr = avg(acceptedOffers.map((item: { apr: number | string }) => Number(item.apr || 0)))
  const avgOfferTerm = avg(acceptedOffers.map((item: { term_months: number | string }) => Number(item.term_months || 0)))
  const totalOfferFees = acceptedOffers.reduce((sum: number, item: { fee_amount: number | string | null }) => sum + Number(item.fee_amount || 0), 0)

  const engineDecisions = decisions.filter((item: { decision_source: string }) => item.decision_source === 'engine').length
  const manualDecisions = decisions.filter((item: { decision_source: string }) => item.decision_source === 'manual').length
  const approvedRecommendations = decisions.filter((item: { recommendation: string }) => item.recommendation === 'approve').length

  const verifiedDocuments = documents.filter((item: { status: string }) => item.status === 'verified').length
  const rejectedDocuments = documents.filter((item: { status: string }) => item.status === 'rejected').length
  const uniqueDocumentTypes = new Set(documents.map((item: { doc_type: string }) => item.doc_type)).size

  const outboundComms = communications.filter((item: { direction: string }) => item.direction === 'outbound').length
  const failedComms = communications.filter((item: { status: string }) => item.status === 'failed').length
  const inAppComms = communications.filter((item: { channel: string }) => item.channel === 'in_app').length

  const activeModifications = modifications.filter((item: { status: string }) => ['proposed', 'active'].includes(item.status)).length
  const paymentPlans = modifications.filter((item: { modification_type: string }) => item.modification_type === 'payment_plan').length

  const recentWindow = startOfWindow(30)
  const appsLast30 = apps.filter((item: { created_at: string }) => item.created_at >= recentWindow).length
  const paymentsLast30 = postedPayments.filter((item: { posted_at: string | null; created_at: string }) => (item.posted_at || item.created_at) >= recentWindow).length
  const auditsLast30 = audits.filter((item: { created_at: string }) => item.created_at >= recentWindow).length

  const approvalRate = ratio(approvedCount, apps.length)
  const declineRate = ratio(declinedCount, apps.length)
  const paymentSuccessRate = ratio(postedPayments.length, postedPayments.length + failedPayments.length)
  const verificationRate = ratio(verifiedDocuments, documents.length)
  const communicationFailureRate = ratio(failedComms, communications.length)
  const engineCoverage = ratio(engineDecisions, decisions.length)

  const kpis: Array<{ label: string; value: string; hint: string; tone: Tone }> = [
    { label: 'Approval rate', value: pct(approvalRate), hint: `${approvedCount} approved or funded applications`, tone: 'green' },
    { label: 'Decline rate', value: pct(declineRate), hint: `${declinedCount} declined applications`, tone: 'red' },
    { label: 'Payment success rate', value: pct(paymentSuccessRate), hint: `${postedPayments.length} posted vs ${failedPayments.length} failed`, tone: 'teal' },
    { label: 'Posted payment volume', value: money(postedVolume), hint: `${paymentsLast30} posted payments in the last 30 days`, tone: 'blue' },
    { label: 'Outstanding principal', value: money(outstanding), hint: `${accounts.length} total loan accounts`, tone: 'slate' },
    { label: 'Funded accounts', value: String(fundedAccounts.length), hint: `${chargedOffAccounts} charged off`, tone: 'blue' },
    { label: 'Delinquent accounts', value: String(delinquentAccounts), hint: `${openCollections} open collection cases`, tone: 'amber' },
    { label: 'Average days past due', value: avgDaysPastDue.toFixed(1), hint: 'Across open collections cases', tone: 'amber' },
    { label: 'Average risk score', value: avgRiskScore.toFixed(1), hint: `${highRiskCount} applications in high-risk band`, tone: 'slate' },
    { label: 'Review recommended', value: String(reviewRecommended), hint: `${declineRecommended} decline recommendations`, tone: 'red' },
    { label: 'Engine decision coverage', value: pct(engineCoverage), hint: `${engineDecisions} engine vs ${manualDecisions} manual`, tone: 'teal' },
    { label: 'Engine approve mix', value: pct(ratio(approvedRecommendations, decisions.length)), hint: `${approvedRecommendations} approve recommendations`, tone: 'green' },
    { label: 'Accepted offer APR', value: `${avgOfferApr.toFixed(2)}%`, hint: `${acceptedOffers.length} accepted offers`, tone: 'teal' },
    { label: 'Average offer term', value: `${avgOfferTerm.toFixed(1)} mo`, hint: money(totalOfferFees) + ' total accepted offer fees', tone: 'blue' },
    { label: 'Document verification', value: pct(verificationRate), hint: `${verifiedDocuments} verified, ${rejectedDocuments} rejected`, tone: 'green' },
    { label: 'Document coverage', value: String(uniqueDocumentTypes), hint: 'Unique document types collected', tone: 'slate' },
    { label: 'Communication volume', value: String(outboundComms), hint: `${inAppComms} in-app communications logged`, tone: 'blue' },
    { label: 'Communication failure rate', value: pct(communicationFailureRate), hint: `${failedComms} failed communications`, tone: 'red' },
    { label: 'Active modifications', value: String(activeModifications), hint: `${paymentPlans} payment plan modifications`, tone: 'amber' },
    { label: 'Compliance failures', value: String(complianceFailures), hint: `${uniqueRegulations} regulations monitored`, tone: 'red' },
    { label: 'New applications (30d)', value: String(appsLast30), hint: `${submittedCount} submitted and ${underReviewCount} in review`, tone: 'blue' },
    { label: 'Audit events (30d)', value: String(auditsLast30), hint: 'Recorded operational actions in the last month', tone: 'slate' },
    { label: 'Principal collected', value: money(principalCollected), hint: money(interestCollected) + ' interest and ' + money(feeCollected) + ' fees', tone: 'green' },
  ]

  return (
    <div>
      <h1 style={{ margin: 0, fontSize: '1.9rem', fontWeight: 900, color: 'var(--color-text-primary)' }}>Analytics</h1>
      <p style={{ marginTop: 8, color: 'var(--color-text-secondary)', maxWidth: 760 }}>
        Operational KPIs generated from live SmartLend data across origination, underwriting, servicing, collections, documents, and communications.
      </p>
      <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(4, minmax(220px, 1fr))', gap: 12 }}>
        {kpis.map((item) => (
          <KpiCard key={item.label} label={item.label} value={item.value} hint={item.hint} tone={item.tone} />
        ))}
      </div>
      <style>{`
        @media (max-width: 1280px) {
          div[style*='grid-template-columns: repeat(4'] { grid-template-columns: repeat(3, minmax(220px, 1fr)) !important; }
        }
        @media (max-width: 980px) {
          div[style*='grid-template-columns: repeat(4'] { grid-template-columns: repeat(2, minmax(220px, 1fr)) !important; }
        }
        @media (max-width: 620px) {
          div[style*='grid-template-columns: repeat(4'] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

function KpiCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: string
  hint: string
  tone: Tone
}) {
  const palette: Record<Tone, { bg: string; fg: string; ring: string }> = {
    slate: { bg: '#f8fafc', fg: '#334155', ring: '#e2e8f0' },
    teal: { bg: '#ecfeff', fg: '#155e75', ring: '#bae6fd' },
    green: { bg: '#f0fdf4', fg: '#166534', ring: '#bbf7d0' },
    amber: { bg: '#fffbeb', fg: '#92400e', ring: '#fde68a' },
    red: { bg: '#fef2f2', fg: '#991b1b', ring: '#fecaca' },
    blue: { bg: '#eff6ff', fg: '#1d4ed8', ring: '#bfdbfe' },
  }

  const colors = palette[tone]

  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: 18, background: 'var(--color-surface)', padding: 16, boxShadow: 'var(--shadow-lg)' }}>
      <div style={{ display: 'inline-flex', padding: '5px 10px', borderRadius: 999, background: colors.bg, color: colors.fg, border: `1px solid ${colors.ring}`, fontSize: '0.75rem', fontWeight: 800 }}>
        {label}
      </div>
      <p style={{ margin: '14px 0 0', color: 'var(--color-text-primary)', fontWeight: 950, fontSize: '1.85rem', letterSpacing: '-0.03em' }}>{value}</p>
      <p style={{ margin: '8px 0 0', color: 'var(--color-text-secondary)', fontSize: '0.84rem', lineHeight: 1.55 }}>{hint}</p>
    </div>
  )
}
