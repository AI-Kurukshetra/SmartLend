import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrgId } from '@/lib/authz'
import DashboardHome from '@/components/dashboard/DashboardHome'

function toHeadline(value: string) {
  return value
    .replaceAll('.', ' ')
    .replaceAll('_', ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatAuditDetail(resourceType: string | null, payload: Record<string, unknown> | null) {
  const label = resourceType ? toHeadline(resourceType) : 'Activity'

  if (!payload || Object.keys(payload).length === 0) {
    return label
  }

  if (typeof payload.email === 'string' && payload.email.length > 0) {
    return `${label} for ${payload.email}`
  }

  const summary = Object.entries(payload)
    .slice(0, 2)
    .map(([key, value]) => `${toHeadline(key)}: ${String(value)}`)
    .join(' • ')

  return summary ? `${label} • ${summary}` : label
}

export const metadata: Metadata = {
    title: 'Dashboard',
    description: 'Your SmartLend overview for lending operations, servicing, and portfolio activity.',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const orgId = await getCurrentOrgId()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [
    orgRes,
    borrowerCountRes,
    applicationsRes,
    accountsRes,
    paymentsRes,
    riskRes,
    complianceRes,
    auditRes,
    borrowerNamesRes,
  ] = await Promise.all([
    supabase.from('organizations').select('name').eq('id', orgId).limit(1).maybeSingle(),
    supabase.from('borrower_profiles').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'active'),
    supabase
      .from('loan_applications')
      .select('id,borrower_id,requested_amount,status,current_stage,underwriting_recommendation,created_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(200),
    supabase
      .from('loan_accounts')
      .select('id,borrower_id,principal_balance,status,next_payment_due_date,scheduled_payment_amount,autopay_enabled,created_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(200),
    supabase
      .from('loan_payments')
      .select('amount,status,posted_at,due_date')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(500),
    supabase
      .from('risk_assessments')
      .select('application_id,band,score')
      .eq('org_id', orgId)
      .limit(200),
    supabase
      .from('compliance_events')
      .select('status')
      .eq('org_id', orgId)
      .limit(200),
    supabase
      .from('audit_events')
      .select('id,event_type,resource_type,created_at,payload')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(12),
    supabase
      .from('borrower_profiles')
      .select('id,full_name')
      .eq('org_id', orgId)
      .limit(300),
  ])

  const applications = applicationsRes.data || []
  const accounts = accountsRes.data || []
  const payments = paymentsRes.data || []
  const risks = riskRes.data || []
  const compliance = complianceRes.data || []
  const borrowerMap = new Map((borrowerNamesRes.data || []).map((row: any) => [row.id, row.full_name || 'Borrower']))
  const riskMap = new Map((risks || []).map((row: any) => [row.application_id, row]))

  const now = new Date()
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(now.getDate() - 30)
  const sevenDaysAhead = new Date(now)
  sevenDaysAhead.setDate(now.getDate() + 7)

  const postedLast30 = payments.filter((payment: any) => payment.status === 'posted' && payment.posted_at && new Date(payment.posted_at) >= thirtyDaysAgo)
  const monthlyCollections = postedLast30.reduce((sum: number, payment: any) => sum + Number(payment.amount || 0), 0)
  const outstandingPrincipal = accounts.reduce((sum: number, account: any) => sum + Number(account.principal_balance || 0), 0)
  const approvedCount = applications.filter((item: any) => item.status === 'approved' || item.status === 'funded').length
  const pendingApplications = applications.filter((item: any) => ['draft', 'submitted', 'under_review'].includes(item.status)).length
  const activeAccounts = accounts.filter((item: any) => ['active', 'delinquent', 'forbearance'].includes(item.status))
  const delinquentAccounts = accounts.filter((item: any) => item.status === 'delinquent').length
  const highRiskApplications = risks.filter((item: any) => item.band === 'high').length
  const complianceFailures = compliance.filter((item: any) => item.status === 'failed').length
  const fundingReadyCount = applications.filter((item: any) => item.status === 'approved').length
  const dueSoonCount = accounts.filter((item: any) => item.next_payment_due_date && new Date(item.next_payment_due_date) <= sevenDaysAhead).length

  const approvalRate = applications.length > 0 ? ((approvedCount / applications.length) * 100).toFixed(1) : '0.0'

  const recentApplications = applications.slice(0, 5).map((item: any) => ({
    id: item.id as string,
    borrowerName: borrowerMap.get(item.borrower_id) || 'Borrower',
    amount: Number(item.requested_amount || 0),
    status: item.status as string,
    currentStage: (item.current_stage as string) || 'application_submitted',
    recommendation: item.underwriting_recommendation as string | null,
    createdAt: item.created_at as string,
  }))

  const activeServicing = activeAccounts.slice(0, 5).map((item: any) => ({
    id: item.id as string,
    borrowerName: borrowerMap.get(item.borrower_id) || 'Borrower',
    balance: Number(item.principal_balance || 0),
    status: item.status as string,
    nextDue: item.next_payment_due_date as string | null,
    scheduledPayment: item.scheduled_payment_amount ? Number(item.scheduled_payment_amount) : null,
    autopayEnabled: Boolean(item.autopay_enabled),
  }))

  const recentEvents = (auditRes.data || []).map((item: any) => ({
    id: item.id as string,
    title: toHeadline(String(item.event_type || 'event')),
    detail: formatAuditDetail(
      (item.resource_type as string | null) ?? null,
      (item.payload as Record<string, unknown> | null) ?? null
    ),
    createdAt: item.created_at as string,
  }))

  return (
    <DashboardHome
      user={user}
      data={{
        orgName: orgRes.data?.name || 'SmartLend',
        approvalRate,
        metrics: {
          activeBorrowers: borrowerCountRes.count ?? 0,
          activeAccounts: activeAccounts.length,
          pendingApplications,
          outstandingPrincipal,
          monthlyCollections,
          delinquentAccounts,
          highRiskApplications,
          complianceFailures,
          fundingReadyCount,
          dueSoonCount,
        },
        pipeline: [
          { label: 'Pending applications', count: pendingApplications, tone: pendingApplications > 8 ? 'warning' : 'neutral' },
          { label: 'Approved to fund', count: fundingReadyCount, tone: fundingReadyCount > 0 ? 'good' : 'neutral' },
          { label: 'High-risk files', count: highRiskApplications, tone: highRiskApplications > 0 ? 'danger' : 'good' },
          { label: 'Compliance failures', count: complianceFailures, tone: complianceFailures > 0 ? 'danger' : 'good' },
        ],
        recentApplications,
        activeAccounts: activeServicing,
        recentEvents,
      }}
    />
  )
}
