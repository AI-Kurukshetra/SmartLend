import { createClient } from '@/lib/supabase/server'
import { runRiskAssessmentForApplication } from '@/lib/risk'

type ProductPolicy = {
  id: string
  org_id: string
  auto_decision_enabled: boolean
  min_credit_score: number | null
  min_annual_income: number | null
  max_debt_to_income: number | null
  allowed_employment_statuses: string[] | null
}

type ApplicationInput = {
  id: string
  org_id: string
  loan_product_id: string | null
  requested_amount: number
  requested_term_months: number
  annual_income: number | null
  monthly_debt_obligations: number | null
  credit_score: number | null
  employment_status: string | null
}

export function evaluateUnderwritingRules(product: ProductPolicy, application: ApplicationInput) {
  const reasonCodes: string[] = []
  const annualIncome = Number(application.annual_income || 0)
  const monthlyDebt = Number(application.monthly_debt_obligations || 0)
  const monthlyIncome = annualIncome > 0 ? annualIncome / 12 : 0
  const debtToIncome = monthlyIncome > 0 ? monthlyDebt / monthlyIncome : null
  const allowedStatuses = Array.isArray(product.allowed_employment_statuses)
    ? product.allowed_employment_statuses.filter(Boolean)
    : []

  if (product.min_credit_score && (!application.credit_score || application.credit_score < product.min_credit_score)) {
    reasonCodes.push('credit_score_below_minimum')
  }
  if (product.min_annual_income && annualIncome < product.min_annual_income) {
    reasonCodes.push('income_below_minimum')
  }
  if (product.max_debt_to_income !== null && product.max_debt_to_income !== undefined) {
    if (debtToIncome === null || debtToIncome > product.max_debt_to_income) {
      reasonCodes.push('debt_to_income_exceeded')
    }
  }
  if (allowedStatuses.length > 0) {
    const normalized = String(application.employment_status || '').trim().toLowerCase()
    const match = allowedStatuses.map((s) => s.toLowerCase()).includes(normalized)
    if (!match) reasonCodes.push('employment_status_not_allowed')
  }

  let recommendation: 'approve' | 'review' | 'decline' = 'approve'
  if (reasonCodes.length > 1) recommendation = 'decline'
  else if (reasonCodes.length === 1) recommendation = 'review'

  return {
    recommendation,
    reasonCodes,
    metrics: {
      credit_score: application.credit_score,
      annual_income: annualIncome || null,
      monthly_debt_obligations: monthlyDebt || null,
      monthly_income: monthlyIncome || null,
      debt_to_income: debtToIncome,
      requested_amount: application.requested_amount,
      requested_term_months: application.requested_term_months,
      employment_status: application.employment_status,
    },
  }
}

export async function runUnderwritingForApplication(applicationId: string) {
  const supabase = await createClient()
  const appRes = await supabase
    .from('loan_applications')
    .select('id,org_id,loan_product_id,requested_amount,requested_term_months,annual_income,monthly_debt_obligations,credit_score,employment_status')
    .eq('id', applicationId)
    .limit(1)
    .maybeSingle()
  if (!appRes.data?.loan_product_id) return { error: 'Loan product not found for application.' }

  const productRes = await supabase
    .from('loan_products')
    .select('id,org_id,auto_decision_enabled,min_credit_score,min_annual_income,max_debt_to_income,allowed_employment_statuses')
    .eq('id', appRes.data.loan_product_id)
    .limit(1)
    .maybeSingle()
  if (!productRes.data) return { error: 'Underwriting policy not found.' }

  const result = evaluateUnderwritingRules(productRes.data as ProductPolicy, appRes.data as ApplicationInput)
  const summary = result.reasonCodes.length === 0
    ? 'All configured underwriting rules passed.'
    : `Triggered: ${result.reasonCodes.join(', ')}`

  const desiredStatus =
    productRes.data.auto_decision_enabled
      ? result.recommendation === 'approve'
        ? 'approved'
        : result.recommendation === 'decline'
          ? 'declined'
          : 'under_review'
      : 'under_review'

  const decisionRes = await supabase
    .from('underwriting_decisions')
    .upsert({
      org_id: appRes.data.org_id,
      application_id: applicationId,
      decision_source: 'engine',
      recommendation: result.recommendation,
      reason_codes: result.reasonCodes,
      metrics: result.metrics,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'application_id' })
  if (decisionRes.error) return { error: decisionRes.error.message }

  const appUpdateRes = await supabase
    .from('loan_applications')
    .update({
      status: desiredStatus,
      decision_code: result.reasonCodes[0] ?? null,
      underwriting_recommendation: result.recommendation,
      underwriting_summary: summary,
      updated_at: new Date().toISOString(),
    })
    .eq('id', applicationId)
  if (appUpdateRes.error) return { error: appUpdateRes.error.message }

  const risk = await runRiskAssessmentForApplication(applicationId)

  return {
    status: desiredStatus,
    recommendation: result.recommendation,
    reasonCodes: result.reasonCodes,
    summary,
    risk,
  }
}
