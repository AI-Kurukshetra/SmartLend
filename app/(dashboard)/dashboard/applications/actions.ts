'use server'

import { revalidatePath } from 'next/cache'
import { requireOrgMembership } from '@/lib/authz'
import { createClient } from '@/lib/supabase/server'
import { createAuditEvent, createNotification } from '@/lib/events'
import { runUnderwritingForApplication } from '@/lib/underwriting'
import { runComplianceChecksForApplication } from '@/lib/compliance'
import { calculateOfferPricing } from '@/lib/pricing'
import { advanceApplicationStage } from '@/lib/workflows'

const ALLOWED_TARGETS = new Set(['under_review', 'approved', 'declined', 'funded'])

export async function updateApplicationStatus(formData: FormData) {
  const applicationId = String(formData.get('application_id') || '')
  const nextStatus = String(formData.get('status') || '')
  const decisionCode = String(formData.get('decision_code') || '').trim()
  if (!applicationId || !ALLOWED_TARGETS.has(nextStatus)) {
    return
  }

  const membership = await requireOrgMembership()
  const supabase = await createClient()
  const appRes = await supabase
    .from('loan_applications')
    .select('id,org_id,borrower_id,status')
    .eq('id', applicationId)
    .eq('org_id', membership.orgId)
    .limit(1)
    .maybeSingle()
  if (!appRes.data) return

  const updateRes = await supabase
    .from('loan_applications')
    .update({
      status: nextStatus,
      decision_code: decisionCode || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', applicationId)
  if (updateRes.error) return

  await runComplianceChecksForApplication(applicationId)
  if (nextStatus === 'approved') {
    const pricing = await calculateOfferPricing(applicationId)
    if (!('error' in pricing)) {
      const offerBase = await supabase
        .from('loan_applications')
        .select('requested_amount,requested_term_months')
        .eq('id', applicationId)
        .limit(1)
        .maybeSingle()
      if (offerBase.data) {
        const monthlyPayment = offerBase.data.requested_term_months > 0
          ? Number(((Number(offerBase.data.requested_amount) * (pricing.apr / 100 / 12)) / (1 - Math.pow(1 + pricing.apr / 100 / 12, -Number(offerBase.data.requested_term_months)))).toFixed(2))
          : null
        await supabase.from('loan_offers').upsert({
          application_id: applicationId,
          apr: pricing.apr,
          term_months: offerBase.data.requested_term_months,
          principal_amount: offerBase.data.requested_amount,
          fee_amount: 0,
          monthly_payment: monthlyPayment,
          status: 'offered',
        }, { onConflict: 'application_id' })
      }
    }
    await advanceApplicationStage(applicationId, 'offer')
  } else if (nextStatus === 'under_review') {
    await advanceApplicationStage(applicationId, 'underwriting')
  } else if (nextStatus === 'declined') {
    await advanceApplicationStage(applicationId, 'decision')
  }

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
      type: 'decision_posted',
      title: 'Application status updated',
      message: `Your application is now ${nextStatus.replace('_', ' ')}.`,
    })
  }

  await createAuditEvent({
    orgId: membership.orgId,
    actorType: 'lender',
    eventType: 'application.status_updated',
    resourceType: 'loan_application',
    resourceId: applicationId,
    payload: { from: appRes.data.status, to: nextStatus, decision_code: decisionCode || null },
  })

  revalidatePath('/dashboard/applications')
  revalidatePath('/borrower/applications')
  return
}

export async function rerunApplicationUnderwriting(formData: FormData) {
  const applicationId = String(formData.get('application_id') || '')
  if (!applicationId) return

  const membership = await requireOrgMembership()
  const result = await runUnderwritingForApplication(applicationId)
  if ('error' in result) return
  await runComplianceChecksForApplication(applicationId)
  await advanceApplicationStage(applicationId, 'underwriting')

  await createAuditEvent({
    orgId: membership.orgId,
    actorType: 'lender',
    eventType: 'underwriting.rerun',
    resourceType: 'loan_application',
    resourceId: applicationId,
    payload: { recommendation: result.recommendation, reason_codes: result.reasonCodes },
  })

  revalidatePath('/dashboard/underwriting')
  revalidatePath('/dashboard/applications')
  revalidatePath(`/borrower/applications/${applicationId}`)
}
