import { createClient } from '@/lib/supabase/server'

const DEFAULT_WORKFLOW = [
  'application_submitted',
  'documents_pending',
  'underwriting',
  'decision',
  'offer',
  'agreement',
  'funding',
  'servicing',
]

export async function getWorkflowTemplateForApplication(applicationId: string) {
  const supabase = await createClient()
  const appRes = await supabase
    .from('loan_applications')
    .select('id,loan_product_id,current_stage,workflow_history')
    .eq('id', applicationId)
    .limit(1)
    .maybeSingle()
  if (!appRes.data?.loan_product_id) return { stages: DEFAULT_WORKFLOW, currentStage: appRes.data?.current_stage || DEFAULT_WORKFLOW[0] }

  const productRes = await supabase
    .from('loan_products')
    .select('workflow_template')
    .eq('id', appRes.data.loan_product_id)
    .limit(1)
    .maybeSingle()

  const configured = Array.isArray(productRes.data?.workflow_template)
    ? productRes.data?.workflow_template.filter(Boolean)
    : []

  return {
    stages: configured.length > 0 ? configured : DEFAULT_WORKFLOW,
    currentStage: appRes.data.current_stage || configured[0] || DEFAULT_WORKFLOW[0],
    history: Array.isArray(appRes.data.workflow_history) ? appRes.data.workflow_history : [],
  }
}

export async function advanceApplicationStage(applicationId: string, nextStage: string) {
  const supabase = await createClient()
  const appRes = await supabase
    .from('loan_applications')
    .select('id,current_stage,workflow_history')
    .eq('id', applicationId)
    .limit(1)
    .maybeSingle()
  if (!appRes.data) return { error: 'Application not found.' }

  const history = Array.isArray(appRes.data.workflow_history) ? appRes.data.workflow_history : []
  history.push({
    from: appRes.data.current_stage,
    to: nextStage,
    changed_at: new Date().toISOString(),
  })

  const updateRes = await supabase
    .from('loan_applications')
    .update({
      current_stage: nextStage,
      workflow_history: history,
      updated_at: new Date().toISOString(),
    })
    .eq('id', applicationId)

  if (updateRes.error) return { error: updateRes.error.message }
  return { success: true }
}
