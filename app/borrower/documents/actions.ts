'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAuditEvent, createNotification } from '@/lib/events'

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-').slice(0, 120)
}

export async function uploadBorrowerDocument(formData: FormData) {
  const applicationId = String(formData.get('application_id') || '')
  const docType = String(formData.get('doc_type') || '').trim()
  const file = formData.get('file')
  if (!applicationId || !docType || !(file instanceof File) || file.size === 0) return

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const borrowerRes = await supabase
    .from('borrower_profiles')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()
  if (!borrowerRes.data?.id) return

  const appRes = await supabase
    .from('loan_applications')
    .select('id,org_id,borrower_id')
    .eq('id', applicationId)
    .eq('borrower_id', borrowerRes.data.id)
    .limit(1)
    .maybeSingle()
  if (!appRes.data) return

  const versionRes = await supabase
    .from('loan_documents')
    .select('version')
    .eq('application_id', applicationId)
    .eq('doc_type', docType)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextVersion = Number(versionRes.data?.version || 0) + 1

  const safeName = sanitizeFileName(file.name || `${docType}.bin`)
  const storagePath = `${user.id}/${applicationId}/${Date.now()}-v${nextVersion}-${safeName}`
  const uploadRes = await supabase.storage
    .from('loan-documents')
    .upload(storagePath, Buffer.from(await file.arrayBuffer()), {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    })
  if (uploadRes.error) return

  await supabase.from('loan_documents').insert({
    org_id: appRes.data.org_id,
    application_id: applicationId,
    uploaded_by: user.id,
    doc_type: docType,
    storage_path: storagePath,
    file_name: file.name,
    mime_type: file.type || null,
    file_size_bytes: file.size,
    version: nextVersion,
    status: 'pending',
  })

  await createAuditEvent({
    orgId: appRes.data.org_id as string,
    actorType: 'borrower',
    eventType: 'document.uploaded',
    resourceType: 'loan_document',
    payload: { application_id: applicationId, doc_type: docType },
  })
  await createNotification({
    orgId: appRes.data.org_id as string,
    userId: user.id,
    actorType: 'borrower',
    type: 'document_uploaded',
    title: 'Document uploaded',
    message: `${docType} uploaded successfully and is pending review.`,
  })

  const membersRes = await supabase
    .from('org_members')
    .select('user_id')
    .eq('org_id', appRes.data.org_id)
    .eq('status', 'active')
    .limit(20)
  for (const member of membersRes.data || []) {
    if (!member.user_id) continue
    await createNotification({
      orgId: appRes.data.org_id as string,
      userId: member.user_id as string,
      actorType: 'borrower',
      type: 'document_uploaded',
      title: 'New borrower document',
      message: `${docType} was uploaded for application ${applicationId.slice(0, 8)}.`,
    })
  }

  revalidatePath('/borrower/documents')
  revalidatePath(`/borrower/applications/${applicationId}`)
  revalidatePath('/dashboard/documents')
}
