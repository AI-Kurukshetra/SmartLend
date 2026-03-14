'use server'

import { revalidatePath } from 'next/cache'
import { requireOrgMembership } from '@/lib/authz'
import { createClient } from '@/lib/supabase/server'
import { createAuditEvent, createNotification } from '@/lib/events'

const DOC_STATUS = new Set(['pending', 'verified', 'rejected'])

export async function reviewLoanDocument(formData: FormData) {
  const documentId = String(formData.get('document_id') || '')
  const status = String(formData.get('status') || '')
  const reviewNote = String(formData.get('review_note') || '').trim()
  if (!documentId || !DOC_STATUS.has(status)) return

  const membership = await requireOrgMembership()
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const docRes = await supabase
    .from('loan_documents')
    .select('id,org_id,application_id,doc_type,uploaded_by')
    .eq('id', documentId)
    .eq('org_id', membership.orgId)
    .limit(1)
    .maybeSingle()
  if (!docRes.data) return

  await supabase
    .from('loan_documents')
    .update({
      status,
      review_note: reviewNote || null,
      reviewed_by: user?.id ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', documentId)

  const appRes = await supabase
    .from('loan_applications')
    .select('borrower_id')
    .eq('id', docRes.data.application_id)
    .limit(1)
    .maybeSingle()

  if (appRes.data?.borrower_id) {
    const borrowerRes = await supabase
      .from('borrower_profiles')
      .select('user_id')
      .eq('id', appRes.data.borrower_id)
      .limit(1)
      .maybeSingle()
    if (borrowerRes.data?.user_id) {
      await createNotification({
        orgId: membership.orgId,
        userId: borrowerRes.data.user_id as string,
        actorType: 'lender',
        type: 'document_reviewed',
        title: 'Document review updated',
        message: `${docRes.data.doc_type} is now ${status}.${reviewNote ? ` ${reviewNote}` : ''}`,
      })
    }
  }

  await createAuditEvent({
    orgId: membership.orgId,
    actorType: 'lender',
    eventType: 'document.reviewed',
    resourceType: 'loan_document',
    resourceId: documentId,
    payload: { status, review_note: reviewNote || null },
  })

  revalidatePath('/dashboard/documents')
  revalidatePath(`/borrower/applications/${docRes.data.application_id}`)
  revalidatePath('/borrower/documents')
}
