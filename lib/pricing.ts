import { createClient } from '@/lib/supabase/server'

type PricingRule = {
  minScore?: number
  maxScore?: number
  adjustmentApr?: number
}

export async function calculateOfferPricing(applicationId: string) {
  const supabase = await createClient()
  const [appRes, riskRes] = await Promise.all([
    supabase
      .from('loan_applications')
      .select('id,loan_product_id,requested_amount,requested_term_months')
      .eq('id', applicationId)
      .limit(1)
      .maybeSingle(),
    supabase
      .from('risk_assessments')
      .select('score,band')
      .eq('application_id', applicationId)
      .limit(1)
      .maybeSingle(),
  ])
  if (!appRes.data?.loan_product_id) return { error: 'Product missing for pricing.' }

  const productRes = await supabase
    .from('loan_products')
    .select('id,min_apr,max_apr,pricing_strategy,pricing_rate_adjustments,market_rate_index')
    .eq('id', appRes.data.loan_product_id)
    .limit(1)
    .maybeSingle()
  if (!productRes.data) return { error: 'Pricing policy missing.' }

  const minApr = Number(productRes.data.min_apr || 0)
  const maxApr = Number(productRes.data.max_apr || minApr)
  const riskScore = Number(riskRes.data?.score || 50)
  const marketRate = Number(productRes.data.market_rate_index || 0)
  const rules = Array.isArray(productRes.data.pricing_rate_adjustments)
    ? productRes.data.pricing_rate_adjustments as PricingRule[]
    : []

  let apr = minApr
  if (productRes.data.pricing_strategy === 'risk_based') {
    const normalized = 1 - Math.min(100, Math.max(0, riskScore)) / 100
    apr = minApr + (maxApr - minApr) * normalized
  } else if (productRes.data.pricing_strategy === 'market_adjusted') {
    apr = Math.max(minApr, Math.min(maxApr, minApr + marketRate))
  }

  for (const rule of rules) {
    const minScore = typeof rule.minScore === 'number' ? rule.minScore : 0
    const maxScore = typeof rule.maxScore === 'number' ? rule.maxScore : 100
    if (riskScore >= minScore && riskScore <= maxScore) {
      apr += Number(rule.adjustmentApr || 0)
    }
  }

  apr = Math.max(minApr, Math.min(maxApr, Number(apr.toFixed(4))))

  return {
    apr,
    reason: `Pricing strategy ${productRes.data.pricing_strategy} with risk score ${riskScore}${marketRate ? ` and market index ${marketRate}` : ''}.`,
  }
}
