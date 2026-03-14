import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getCurrentOrgId, requirePermission } from '@/lib/authz'
import LoanProductsPanel from '@/components/lender/LoanProductsPanel'

export const metadata: Metadata = {
  title: 'Loan Products',
  description: 'Configure SmartLend loan products for origination.',
}

export default async function LoanProductsPage() {
  await requirePermission('pricing.manage')
  const supabase = await createClient()
  const orgId = await getCurrentOrgId()
  const productsRes = await supabase
    .from('loan_products')
    .select('id,name,status,min_amount,max_amount,min_term_months,max_term_months,pricing_strategy,market_rate_index,workflow_template')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(40)

  const products = (productsRes.data || []).map((row: any) => ({
    id: row.id as string,
    name: row.name as string,
    status: row.status as string,
    min_amount: Number(row.min_amount),
    max_amount: Number(row.max_amount),
    min_term_months: Number(row.min_term_months),
    max_term_months: Number(row.max_term_months),
    pricing_strategy: row.pricing_strategy as string,
    market_rate_index: row.market_rate_index ? Number(row.market_rate_index) : null,
    workflow_template: Array.isArray(row.workflow_template) ? row.workflow_template : [],
    auto_decision_enabled: Boolean(row.auto_decision_enabled),
    min_credit_score: row.min_credit_score ? Number(row.min_credit_score) : null,
    min_annual_income: row.min_annual_income ? Number(row.min_annual_income) : null,
    max_debt_to_income: row.max_debt_to_income ? Number(row.max_debt_to_income) : null,
  }))

  return <LoanProductsPanel products={products} />
}
