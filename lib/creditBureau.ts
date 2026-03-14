import { createClient } from '@/lib/supabase/server'

type Bureau = 'experian' | 'equifax' | 'transunion'
type PullType = 'soft' | 'hard' | 'monitoring'

function bureauOffset(bureau: Bureau) {
  if (bureau === 'experian') return 6
  if (bureau === 'equifax') return -4
  return 2
}

export async function pullCreditReport(input: {
  applicationId: string
  bureau: Bureau
  pullType: PullType
  monitoringEnabled?: boolean
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const appRes = await supabase
    .from('loan_applications')
    .select('id,org_id,borrower_id,credit_score,annual_income,monthly_debt_obligations')
    .eq('id', input.applicationId)
    .limit(1)
    .maybeSingle()
  if (!appRes.data) return { error: 'Application not found.' }

  const baseScore = Number(appRes.data.credit_score || 680)
  const score = Math.max(300, Math.min(850, baseScore + bureauOffset(input.bureau)))
  const utilization = appRes.data.annual_income
    ? Number(appRes.data.monthly_debt_obligations || 0) / (Number(appRes.data.annual_income) / 12)
    : null

  const reportData = {
    trade_lines: Math.max(1, Math.round(score / 100)),
    delinquencies: score < 620 ? 2 : score < 680 ? 1 : 0,
    utilization_ratio: utilization,
    provider: input.bureau,
    monitoring_enabled: Boolean(input.monitoringEnabled),
  }

  const insertRes = await supabase
    .from('credit_reports')
    .insert({
      org_id: appRes.data.org_id,
      application_id: input.applicationId,
      borrower_id: appRes.data.borrower_id,
      bureau: input.bureau,
      pull_type: input.pullType,
      score,
      report_data: reportData,
      monitoring_enabled: Boolean(input.monitoringEnabled),
      pulled_by: user?.id ?? null,
    })
    .select('id')
    .single()
  if (insertRes.error) return { error: insertRes.error.message }

  await supabase
    .from('loan_applications')
    .update({
      credit_score: score,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.applicationId)

  return { score, reportId: insertRes.data.id as string, reportData }
}
