import { createClient } from '@/lib/supabase/server'

type RiskBand = 'low' | 'moderate' | 'elevated' | 'high'
type RecommendedAction = 'approve' | 'review' | 'decline'

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

export async function runRiskAssessmentForApplication(applicationId: string) {
  const supabase = await createClient()

  const appRes = await supabase
    .from('loan_applications')
    .select('id,org_id,borrower_id,requested_amount,requested_term_months,annual_income,monthly_debt_obligations,credit_score,employment_status')
    .eq('id', applicationId)
    .limit(1)
    .maybeSingle()
  if (!appRes.data) return { error: 'Application not found.' }

  const reportsRes = await supabase
    .from('credit_reports')
    .select('bureau,score,pull_type,monitoring_enabled,created_at')
    .eq('application_id', applicationId)
    .order('created_at', { ascending: false })
    .limit(10)

  const reports = reportsRes.data || []
  const reportScores = reports.map((report: any) => Number(report.score || 0)).filter(Boolean)
  const latestScore = Number(appRes.data.credit_score || reportScores[0] || 0)
  const avgReportScore = reportScores.length > 0
    ? reportScores.reduce((sum: number, score: number) => sum + score, 0) / reportScores.length
    : latestScore

  const annualIncome = Number(appRes.data.annual_income || 0)
  const monthlyDebt = Number(appRes.data.monthly_debt_obligations || 0)
  const monthlyIncome = annualIncome > 0 ? annualIncome / 12 : 0
  const debtToIncome = monthlyIncome > 0 ? monthlyDebt / monthlyIncome : 1
  const requestedAmount = Number(appRes.data.requested_amount || 0)
  const requestedTermMonths = Number(appRes.data.requested_term_months || 0)
  const incomeCoverage = annualIncome > 0 ? requestedAmount / annualIncome : 1
  const employment = String(appRes.data.employment_status || '').toLowerCase()

  const factors: Array<{ code: string; impact: 'positive' | 'neutral' | 'negative'; detail: string }> = []
  let score = 50

  if (avgReportScore >= 740) {
    score += 25
    factors.push({ code: 'strong_credit', impact: 'positive', detail: 'Credit profile is above prime threshold.' })
  } else if (avgReportScore >= 680) {
    score += 12
    factors.push({ code: 'stable_credit', impact: 'positive', detail: 'Credit profile is within a healthy lending range.' })
  } else if (avgReportScore >= 620) {
    score -= 8
    factors.push({ code: 'borderline_credit', impact: 'negative', detail: 'Credit profile is borderline and needs closer review.' })
  } else {
    score -= 22
    factors.push({ code: 'weak_credit', impact: 'negative', detail: 'Credit profile is below the platform risk floor.' })
  }

  if (debtToIncome <= 0.25) {
    score += 15
    factors.push({ code: 'low_dti', impact: 'positive', detail: 'Debt-to-income ratio is low.' })
  } else if (debtToIncome <= 0.4) {
    score += 4
    factors.push({ code: 'manageable_dti', impact: 'neutral', detail: 'Debt-to-income ratio is manageable.' })
  } else if (debtToIncome <= 0.55) {
    score -= 12
    factors.push({ code: 'elevated_dti', impact: 'negative', detail: 'Debt-to-income ratio is elevated.' })
  } else {
    score -= 22
    factors.push({ code: 'high_dti', impact: 'negative', detail: 'Debt-to-income ratio is too high.' })
  }

  if (incomeCoverage <= 0.2) {
    score += 10
    factors.push({ code: 'conservative_amount', impact: 'positive', detail: 'Requested amount is conservative relative to income.' })
  } else if (incomeCoverage <= 0.45) {
    factors.push({ code: 'balanced_amount', impact: 'neutral', detail: 'Requested amount is reasonable for reported income.' })
  } else {
    score -= 10
    factors.push({ code: 'aggressive_amount', impact: 'negative', detail: 'Requested amount is high relative to income.' })
  }

  if (['full_time', 'salaried', 'permanent'].includes(employment)) {
    score += 8
    factors.push({ code: 'stable_employment', impact: 'positive', detail: 'Employment status indicates stable income.' })
  } else if (['part_time', 'contract', 'self_employed'].includes(employment)) {
    factors.push({ code: 'variable_employment', impact: 'neutral', detail: 'Employment is variable and may need supporting documents.' })
  } else {
    score -= 8
    factors.push({ code: 'unclear_employment', impact: 'negative', detail: 'Employment status is missing or unsupported.' })
  }

  if (requestedTermMonths >= 60) {
    score -= 6
    factors.push({ code: 'long_term', impact: 'negative', detail: 'Long repayment term increases portfolio exposure.' })
  } else if (requestedTermMonths > 0 && requestedTermMonths <= 24) {
    score += 4
    factors.push({ code: 'short_term', impact: 'positive', detail: 'Shorter repayment term lowers risk exposure.' })
  }

  if (reports.some((report: any) => report.pull_type === 'hard')) {
    factors.push({ code: 'hard_pull_recorded', impact: 'neutral', detail: 'A hard pull has been recorded for final decisioning.' })
  }

  const finalScore = clampScore(score)
  let band: RiskBand = 'moderate'
  let recommendedAction: RecommendedAction = 'review'

  if (finalScore >= 78) {
    band = 'low'
    recommendedAction = 'approve'
  } else if (finalScore >= 60) {
    band = 'moderate'
    recommendedAction = 'review'
  } else if (finalScore >= 40) {
    band = 'elevated'
    recommendedAction = 'review'
  } else {
    band = 'high'
    recommendedAction = 'decline'
  }

  const summary =
    band === 'low'
      ? 'Low portfolio risk based on credit, debt load, and requested exposure.'
      : band === 'moderate'
        ? 'Moderate risk profile with manageable exposure but some review signals.'
        : band === 'elevated'
          ? 'Elevated risk profile that should be reviewed before approval.'
          : 'High risk profile with multiple adverse signals.'

  const payload = {
    org_id: appRes.data.org_id,
    application_id: appRes.data.id,
    borrower_id: appRes.data.borrower_id,
    score: finalScore,
    band,
    summary,
    recommended_action: recommendedAction,
    factors,
    metrics: {
      latest_credit_score: latestScore || null,
      average_credit_score: avgReportScore || null,
      annual_income: annualIncome || null,
      monthly_debt_obligations: monthlyDebt || null,
      debt_to_income: Number.isFinite(debtToIncome) ? Number(debtToIncome.toFixed(4)) : null,
      income_coverage_ratio: annualIncome > 0 ? Number(incomeCoverage.toFixed(4)) : null,
      requested_amount: requestedAmount,
      requested_term_months: requestedTermMonths,
      employment_status: appRes.data.employment_status || null,
      bureau_reports_count: reports.length,
    },
    updated_at: new Date().toISOString(),
  }

  const upsertRes = await supabase
    .from('risk_assessments')
    .upsert(payload, { onConflict: 'application_id' })
    .select('score,band,recommended_action,summary,factors,metrics')
    .single()

  if (upsertRes.error) return { error: upsertRes.error.message }
  return upsertRes.data
}
