import { createClient } from '@/lib/supabase/server'

type ComplianceCheck = {
  regulation: 'tila' | 'respa' | 'fcra'
  checkType: string
  status: 'passed' | 'failed' | 'waived'
  detail: string
  payload?: Record<string, unknown>
}

export async function runComplianceChecksForApplication(applicationId: string) {
  const supabase = await createClient()

  const appRes = await supabase
    .from('loan_applications')
    .select('id,org_id,borrower_id,status,decision_code,consent_credit_pull,loan_purpose,requested_amount,requested_term_months,underwriting_recommendation')
    .eq('id', applicationId)
    .limit(1)
    .maybeSingle()
  if (!appRes.data) return { error: 'Application not found.' }

  const [offerRes, agreementRes, reportsRes, accountRes] = await Promise.all([
    supabase
      .from('loan_offers')
      .select('id,apr,term_months,principal_amount,monthly_payment,fee_amount,status')
      .eq('application_id', applicationId)
      .limit(1)
      .maybeSingle(),
    supabase
      .from('loan_agreements')
      .select('id,status,signed_at')
      .eq('application_id', applicationId)
      .limit(1)
      .maybeSingle(),
    supabase
      .from('credit_reports')
      .select('id,pull_type,score')
      .eq('application_id', applicationId)
      .limit(20),
    supabase
      .from('loan_accounts')
      .select('id,apr,term_months,scheduled_payment_amount')
      .eq('application_id', applicationId)
      .limit(1)
      .maybeSingle(),
  ])

  const checks: ComplianceCheck[] = []

  const tilaReady = Boolean(
    offerRes.data?.apr &&
    offerRes.data?.term_months &&
    (offerRes.data?.monthly_payment || accountRes.data?.scheduled_payment_amount) &&
    offerRes.data?.principal_amount,
  )
  checks.push({
    regulation: 'tila',
    checkType: 'disclosure_completeness',
    status: tilaReady ? 'passed' : 'failed',
    detail: tilaReady
      ? 'APR, payment amount, term, and principal disclosures are present.'
      : 'Missing one or more TILA disclosure fields such as APR, payment, term, or principal.',
    payload: {
      offer_id: offerRes.data?.id || null,
      loan_account_id: accountRes.data?.id || null,
    },
  })

  const reports = reportsRes.data || []
  const fcraReady = !reports.length || Boolean(appRes.data.consent_credit_pull)
  checks.push({
    regulation: 'fcra',
    checkType: 'credit_consent_and_pull',
    status: fcraReady ? 'passed' : 'failed',
    detail: fcraReady
      ? 'Credit pull activity matches borrower consent requirements.'
      : 'Credit report exists without recorded borrower credit consent.',
    payload: {
      report_count: reports.length,
      consent_credit_pull: Boolean(appRes.data.consent_credit_pull),
    },
  })

  const isHousingFlow = /home|mortgage|equity|property/i.test(String(appRes.data.loan_purpose || ''))
  const respaReady = !isHousingFlow || Boolean(agreementRes.data?.id)
  checks.push({
    regulation: 'respa',
    checkType: 'settlement_disclosure_readiness',
    status: isHousingFlow ? (respaReady ? 'passed' : 'failed') : 'waived',
    detail: isHousingFlow
      ? respaReady
        ? 'Housing-related application has agreement/disclosure artifacts on record.'
        : 'Housing-related application is missing agreement/disclosure artifacts.'
      : 'RESPA check waived for non-housing product.',
    payload: {
      agreement_id: agreementRes.data?.id || null,
      housing_flow: isHousingFlow,
    },
  })

  await supabase
    .from('compliance_events')
    .delete()
    .eq('application_id', applicationId)

  const rows = checks.map((check) => ({
    org_id: appRes.data?.org_id,
    application_id: applicationId,
    regulation: check.regulation,
    check_type: check.checkType,
    status: check.status,
    detail: check.detail,
    payload: check.payload || {},
    completed_at: new Date().toISOString(),
  }))

  const insertRes = await supabase.from('compliance_events').insert(rows)
  if (insertRes.error) return { error: insertRes.error.message }

  return checks
}

export async function generateLoanStatementsForOrg(orgId: string) {
  const supabase = await createClient()
  const accountsRes = await supabase
    .from('loan_accounts')
    .select('id,borrower_id,principal_balance,next_payment_due_date,scheduled_payment_amount')
    .eq('org_id', orgId)
    .in('status', ['active', 'delinquent', 'forbearance'])
    .limit(500)

  const accounts = accountsRes.data || []
  const periodEnd = new Date()
  const periodStart = new Date(periodEnd.getFullYear(), periodEnd.getMonth(), 1)
  const statementRows = []

  for (const account of accounts as any[]) {
    const paymentsRes = await supabase
      .from('loan_payments')
      .select('id,amount,status,due_date,posted_at,payment_method,principal_component,interest_component,fee_component')
      .eq('loan_account_id', account.id)
      .gte('created_at', periodStart.toISOString())
      .lte('created_at', periodEnd.toISOString())
      .order('created_at', { ascending: false })
      .limit(50)

    const payments = paymentsRes.data || []
    const postedPayments = payments.filter((payment: any) => payment.status === 'posted')
    const postedAmount = postedPayments.reduce((sum: number, payment: any) => sum + Number(payment.amount || 0), 0)
    const amountDue = Number(account.scheduled_payment_amount || 0)
    const openingBalance = Number(account.principal_balance || 0) + postedAmount

    statementRows.push({
      org_id: orgId,
      loan_account_id: account.id,
      borrower_id: account.borrower_id,
      statement_period_start: periodStart.toISOString().slice(0, 10),
      statement_period_end: periodEnd.toISOString().slice(0, 10),
      due_date: account.next_payment_due_date || null,
      opening_balance: Number(openingBalance.toFixed(2)),
      closing_balance: Number(account.principal_balance || 0),
      amount_due: Number(amountDue.toFixed(2)),
      status: 'generated',
      statement_data: {
        payments,
        generated_at: new Date().toISOString(),
      },
    })
  }

  if (statementRows.length === 0) return { generated: 0 }
  const upsertRes = await supabase
    .from('loan_statements')
    .upsert(statementRows, { onConflict: 'loan_account_id,statement_period_start,statement_period_end' })

  if (upsertRes.error) return { error: upsertRes.error.message }
  return { generated: statementRows.length }
}
