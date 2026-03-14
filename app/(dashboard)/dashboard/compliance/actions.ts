'use server'

import { revalidatePath } from 'next/cache'
import { requireOrgMembership } from '@/lib/authz'
import { createAuditEvent } from '@/lib/events'
import { generateLoanStatementsForOrg, runComplianceChecksForApplication } from '@/lib/compliance'

export async function runApplicationComplianceScan(formData: FormData) {
  const applicationId = String(formData.get('application_id') || '')
  if (!applicationId) return

  const membership = await requireOrgMembership()
  const result = await runComplianceChecksForApplication(applicationId)
  if ('error' in result) return

  await createAuditEvent({
    orgId: membership.orgId,
    actorType: 'lender',
    eventType: 'compliance.application_scanned',
    resourceType: 'loan_application',
    resourceId: applicationId,
    payload: { checks: result.length },
  })

  revalidatePath('/dashboard/compliance')
  revalidatePath('/dashboard/applications')
}

export async function generateMonthlyStatements() {
  const membership = await requireOrgMembership()
  const result = await generateLoanStatementsForOrg(membership.orgId)
  if ('error' in result) return

  await createAuditEvent({
    orgId: membership.orgId,
    actorType: 'lender',
    eventType: 'reporting.statements_generated',
    resourceType: 'loan_statement',
    payload: { generated: result.generated },
  })

  revalidatePath('/dashboard/reports')
  revalidatePath('/borrower/statements')
}
