'use server'

import { revalidatePath } from 'next/cache'
import { requireOrgMembership } from '@/lib/authz'
import { createClient } from '@/lib/supabase/server'
import { createAuditEvent, createNotification } from '@/lib/events'
import { pullCreditReport } from '@/lib/creditBureau'
import { runUnderwritingForApplication } from '@/lib/underwriting'
import { runComplianceChecksForApplication } from '@/lib/compliance'

export async function pullBureauCredit(formData: FormData) {
  const applicationId = String(formData.get('application_id') || '')
  const bureau = String(formData.get('bureau') || '') as 'experian' | 'equifax' | 'transunion'
  const pullType = String(formData.get('pull_type') || 'soft') as 'soft' | 'hard' | 'monitoring'
  const monitoringEnabled = formData.get('monitoring_enabled') === 'true'
  if (!applicationId || !['experian', 'equifax', 'transunion'].includes(bureau)) return

  const membership = await requireOrgMembership()
  const supabase = await createClient()
  const result = await pullCreditReport({ applicationId, bureau, pullType, monitoringEnabled })
  if ('error' in result) return

  const appRes = await supabase
    .from('loan_applications')
    .select('borrower_id')
    .eq('id', applicationId)
    .limit(1)
    .maybeSingle()
  if (appRes.data?.borrower_id) {
    const borrowerUserRes = await supabase
      .from('borrower_profiles')
      .select('user_id')
      .eq('id', appRes.data.borrower_id)
      .limit(1)
      .maybeSingle()
    if (borrowerUserRes.data?.user_id) {
      await createNotification({
        orgId: membership.orgId,
        userId: borrowerUserRes.data.user_id as string,
        actorType: 'system',
        type: 'credit_report_pulled',
        title: 'Credit report pulled',
        message: `${bureau} ${pullType} credit pull completed with score ${result.score}.`,
      })
    }
  }

  await createAuditEvent({
    orgId: membership.orgId,
    actorType: 'lender',
    eventType: 'credit_report.pulled',
    resourceType: 'loan_application',
    resourceId: applicationId,
    payload: { bureau, pull_type: pullType, score: result.score, monitoring_enabled: monitoringEnabled },
  })

  await runUnderwritingForApplication(applicationId)
  await runComplianceChecksForApplication(applicationId)

  revalidatePath('/dashboard/underwriting')
  revalidatePath('/dashboard/applications')
}
