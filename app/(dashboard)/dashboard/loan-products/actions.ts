'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentOrgId, requirePermission } from '@/lib/authz'

export async function createLoanProduct(formData: FormData) {
  await requirePermission('pricing.manage')
  const supabase = await createClient()
  const orgId = await getCurrentOrgId()

  const name = ((formData.get('name') as string) || '').trim()
  const minAmount = Number(formData.get('min_amount') || 0)
  const maxAmount = Number(formData.get('max_amount') || 0)
  const minTerm = Number(formData.get('min_term') || 0)
  const maxTerm = Number(formData.get('max_term') || 0)
  const minApr = Number(formData.get('min_apr') || 0)
  const maxApr = Number(formData.get('max_apr') || 0)
  const autoDecisionEnabled = formData.get('auto_decision_enabled') === 'true'
  const minCreditScore = Number(formData.get('min_credit_score') || 0)
  const minAnnualIncome = Number(formData.get('min_annual_income') || 0)
  const maxDebtToIncomePercent = Number(formData.get('max_debt_to_income_percent') || 0)
  const pricingStrategy = String(formData.get('pricing_strategy') || 'fixed_band')
  const marketRateIndex = Number(formData.get('market_rate_index') || 0)
  const pricingRateAdjustments = String(formData.get('pricing_rate_adjustments') || '')
  const workflowTemplate = String(formData.get('workflow_template') || '')
  const allowedEmploymentStatuses = String(formData.get('allowed_employment_statuses') || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  if (!name) return { error: 'Product name is required.' as const }
  if (minAmount <= 0 || maxAmount < minAmount) return { error: 'Amount range is invalid.' as const }
  if (minTerm <= 0 || maxTerm < minTerm) return { error: 'Term range is invalid.' as const }

  let parsedPricingAdjustments: any[] = []
  if (pricingRateAdjustments.trim()) {
    try {
      parsedPricingAdjustments = JSON.parse(pricingRateAdjustments)
    } catch {
      return { error: 'Pricing adjustments must be valid JSON.' as const }
    }
  }
  const parsedWorkflowTemplate = workflowTemplate
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const insertRes = await supabase.from('loan_products').insert({
    org_id: orgId,
    name,
    min_amount: minAmount,
    max_amount: maxAmount,
    min_term_months: minTerm,
    max_term_months: maxTerm,
    min_apr: minApr || null,
    max_apr: maxApr || null,
    auto_decision_enabled: autoDecisionEnabled,
    min_credit_score: minCreditScore || null,
    min_annual_income: minAnnualIncome || null,
    max_debt_to_income: maxDebtToIncomePercent > 0 ? maxDebtToIncomePercent / 100 : null,
    allowed_employment_statuses: allowedEmploymentStatuses,
    pricing_strategy: pricingStrategy,
    market_rate_index: marketRateIndex || null,
    pricing_rate_adjustments: parsedPricingAdjustments,
    workflow_template: parsedWorkflowTemplate,
    status: 'draft',
    created_by: user?.id ?? null,
  })

  if (insertRes.error) return { error: insertRes.error.message }
  return { success: true as const }
}
