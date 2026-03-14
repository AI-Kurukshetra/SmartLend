'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAuditEvent, createNotification } from '@/lib/events'
import { runUnderwritingForApplication } from '@/lib/underwriting'

async function requireBorrowerApplication(applicationId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, application: null, borrowerId: null }

  const borrowerRes = await supabase
    .from('borrower_profiles')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()
  if (!borrowerRes.data?.id) return { supabase, user, application: null, borrowerId: null }

  const applicationRes = await supabase
    .from('loan_applications')
    .select('id,org_id,borrower_id,status')
    .eq('id', applicationId)
    .eq('borrower_id', borrowerRes.data.id)
    .limit(1)
    .maybeSingle()

  return {
    supabase,
    user,
    application: applicationRes.data ?? null,
    borrowerId: borrowerRes.data.id as string,
  }
}

export async function saveApplicationDraft(formData: FormData) {
  const applicationId = String(formData.get('application_id') || '')
  if (!applicationId) redirect('/borrower/applications?error=Application%20id%20is%20required')

  const payload = {
    full_name: String(formData.get('full_name') || '').trim(),
    email: String(formData.get('email') || '').trim(),
    phone: String(formData.get('phone') || '').trim(),
    date_of_birth: String(formData.get('date_of_birth') || '').trim(),
    employment_status: String(formData.get('employment_status') || '').trim(),
    annual_income: Number(formData.get('annual_income') || 0),
    loan_purpose: String(formData.get('loan_purpose') || '').trim(),
    address_line1: String(formData.get('address_line1') || '').trim(),
    city: String(formData.get('city') || '').trim(),
    state: String(formData.get('state') || '').trim(),
    postal_code: String(formData.get('postal_code') || '').trim(),
  }

  const { supabase, application } = await requireBorrowerApplication(applicationId)
  if (!application) redirect('/borrower/applications?error=Application%20not%20found')

  const updateRes = await supabase
    .from('loan_applications')
    .update({
      ...payload,
      annual_income: Number.isFinite(payload.annual_income) && payload.annual_income > 0 ? payload.annual_income : null,
      date_of_birth: payload.date_of_birth || null,
      draft_data: payload,
      updated_at: new Date().toISOString(),
    })
    .eq('id', applicationId)

  if (updateRes.error) {
    redirect(`/borrower/applications/${applicationId}?error=${encodeURIComponent(updateRes.error.message)}`)
  }

  await createAuditEvent({
    orgId: application.org_id as string,
    actorType: 'borrower',
    eventType: 'application.draft_saved',
    resourceType: 'loan_application',
    resourceId: applicationId,
    payload,
  })

  revalidatePath(`/borrower/applications/${applicationId}`)
  redirect(`/borrower/applications/${applicationId}?success=Draft%20saved`)
}

export async function submitApplicationDetails(formData: FormData) {
  const applicationId = String(formData.get('application_id') || '')
  if (!applicationId) redirect('/borrower/applications?error=Application%20id%20is%20required')

  const fullName = String(formData.get('full_name') || '').trim()
  const email = String(formData.get('email') || '').trim()
  const phone = String(formData.get('phone') || '').trim()
  const employmentStatus = String(formData.get('employment_status') || '').trim()
  const loanPurpose = String(formData.get('loan_purpose') || '').trim()
  const annualIncome = Number(formData.get('annual_income') || 0)
  const creditScore = Number(formData.get('credit_score') || 0)
  const monthlyDebtObligations = Number(formData.get('monthly_debt_obligations') || 0)
  const consentCreditPull = formData.get('consent_credit_pull') === 'true'
  const consentTerms = formData.get('consent_terms') === 'true'

  if (!fullName || !email || !phone || !employmentStatus || !loanPurpose) {
    redirect(`/borrower/applications/${applicationId}?error=${encodeURIComponent('Complete all required borrower fields.')}`)
  }
  if (!Number.isFinite(annualIncome) || annualIncome <= 0) {
    redirect(`/borrower/applications/${applicationId}?error=${encodeURIComponent('Enter a valid annual income.')}`)
  }
  if (!Number.isFinite(creditScore) || creditScore < 300 || creditScore > 900) {
    redirect(`/borrower/applications/${applicationId}?error=${encodeURIComponent('Enter a valid credit score.')}`)
  }
  if (!Number.isFinite(monthlyDebtObligations) || monthlyDebtObligations < 0) {
    redirect(`/borrower/applications/${applicationId}?error=${encodeURIComponent('Enter a valid monthly debt obligation.')}`)
  }
  if (!consentCreditPull || !consentTerms) {
    redirect(`/borrower/applications/${applicationId}?error=${encodeURIComponent('Credit and terms consent are required.')}`)
  }

  const { supabase, user, application, borrowerId } = await requireBorrowerApplication(applicationId)
  if (!application || !user || !borrowerId) redirect('/borrower/applications?error=Application%20not%20found')

  const payload = {
    full_name: fullName,
    email,
    phone,
    date_of_birth: String(formData.get('date_of_birth') || '').trim() || null,
    employment_status: employmentStatus,
    annual_income: annualIncome,
    credit_score: creditScore,
    monthly_debt_obligations: monthlyDebtObligations,
    loan_purpose: loanPurpose,
    address_line1: String(formData.get('address_line1') || '').trim() || null,
    city: String(formData.get('city') || '').trim() || null,
    state: String(formData.get('state') || '').trim() || null,
    postal_code: String(formData.get('postal_code') || '').trim() || null,
    consent_credit_pull: consentCreditPull,
    consent_terms: consentTerms,
    status: 'submitted',
    submitted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    draft_data: {},
  }

  const updateRes = await supabase
    .from('loan_applications')
    .update(payload)
    .eq('id', applicationId)
  if (updateRes.error) {
    redirect(`/borrower/applications/${applicationId}?error=${encodeURIComponent(updateRes.error.message)}`)
  }

  const agreementText = `SmartLend loan application consent for ${fullName}. By signing, you confirm the application details are accurate and authorize the lender to review submitted documents and proceed with underwriting.`
  const agreementUpsert = await supabase
    .from('loan_agreements')
    .upsert({
      application_id: applicationId,
      org_id: application.org_id,
      borrower_id: borrowerId,
      agreement_text: agreementText,
      status: 'pending_signature',
    }, { onConflict: 'application_id' })
  if (agreementUpsert.error) {
    redirect(`/borrower/applications/${applicationId}?error=${encodeURIComponent(agreementUpsert.error.message)}`)
  }

  await createAuditEvent({
    orgId: application.org_id as string,
    actorType: 'borrower',
    eventType: 'application.details_submitted',
    resourceType: 'loan_application',
    resourceId: applicationId,
    payload: { employment_status: employmentStatus, annual_income: annualIncome, loan_purpose: loanPurpose },
  })
  await createNotification({
    orgId: application.org_id as string,
    userId: user.id,
    actorType: 'borrower',
    type: 'application_ready_for_signature',
    title: 'Application ready for signature',
    message: 'Your application details were submitted. Review and sign the agreement to complete the portal flow.',
  })

  const underwritingResult = await runUnderwritingForApplication(applicationId)
  if ('error' in underwritingResult) {
    redirect(`/borrower/applications/${applicationId}?success=${encodeURIComponent('Application details submitted, but underwriting could not run yet.')}`)
  }

  redirect(`/borrower/applications/${applicationId}?success=${encodeURIComponent(`Application details submitted. Engine recommendation: ${underwritingResult.recommendation}.`)}`)
}

export async function signLoanAgreement(formData: FormData) {
  const applicationId = String(formData.get('application_id') || '')
  if (!applicationId) redirect('/borrower/applications?error=Application%20id%20is%20required')

  const { supabase, user, application } = await requireBorrowerApplication(applicationId)
  if (!application || !user) redirect('/borrower/applications?error=Application%20not%20found')

  const agreementRes = await supabase
    .from('loan_agreements')
    .select('id,status')
    .eq('application_id', applicationId)
    .eq('borrower_id', application.borrower_id)
    .limit(1)
    .maybeSingle()
  if (!agreementRes.data) redirect(`/borrower/applications/${applicationId}?error=Agreement%20not%20found`)
  if (agreementRes.data.status === 'signed') {
    redirect(`/borrower/applications/${applicationId}`)
  }

  const updateRes = await supabase
    .from('loan_agreements')
    .update({
      status: 'signed',
      signed_by_user_id: user.id,
      signed_at: new Date().toISOString(),
    })
    .eq('id', agreementRes.data.id)
  if (updateRes.error) {
    redirect(`/borrower/applications/${applicationId}?error=${encodeURIComponent(updateRes.error.message)}`)
  }

  await createAuditEvent({
    orgId: application.org_id as string,
    actorType: 'borrower',
    eventType: 'agreement.signed',
    resourceType: 'loan_agreement',
    resourceId: agreementRes.data.id,
    payload: { application_id: applicationId },
  })
  await createNotification({
    orgId: application.org_id as string,
    userId: user.id,
    actorType: 'borrower',
    type: 'agreement_signed',
    title: 'Agreement signed',
    message: 'Your electronic signature has been recorded.',
  })

  revalidatePath(`/borrower/applications/${applicationId}`)
  redirect(`/borrower/applications/${applicationId}?success=Agreement%20signed`)
}
