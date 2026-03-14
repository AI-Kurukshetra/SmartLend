import { createClient } from '@/lib/supabase/server'
import NewApplicationForm from '@/components/borrower/NewApplicationForm'

export default async function BorrowerNewApplicationPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return <NewApplicationForm orgOptions={[]} productOptions={[]} />

  const invitesRes = await supabase
    .from('org_invites')
    .select('org_id')
    .eq('role', 'borrower')
    .eq('accepted_by', user.id)
    .not('accepted_at', 'is', null)
    .limit(100)

  const orgIds = Array.from(new Set((invitesRes.data || []).map((x: any) => x.org_id as string)))
  let orgOptions: Array<{ id: string; name: string }> = []
  let productOptions: Array<{ id: string; name: string; orgId: string; minAmount: number; maxAmount: number; minTerm: number; maxTerm: number }> = []
  if (orgIds.length > 0) {
    const orgsRes = await supabase
      .from('organizations')
      .select('id,name')
      .in('id', orgIds)
      .order('created_at', { ascending: false })

    orgOptions = (orgsRes.data || []).map((row: any) => ({
      id: row.id as string,
      name: row.name as string,
    }))

    const productsRes = await supabase
      .from('loan_products')
      .select('id,name,org_id,min_amount,max_amount,min_term_months,max_term_months,status')
      .in('org_id', orgIds)
      .eq('status', 'published')
      .order('created_at', { ascending: false })

    productOptions = (productsRes.data || []).map((row: any) => ({
      id: row.id as string,
      name: row.name as string,
      orgId: row.org_id as string,
      minAmount: Number(row.min_amount),
      maxAmount: Number(row.max_amount),
      minTerm: Number(row.min_term_months),
      maxTerm: Number(row.max_term_months),
    }))
  }

  return <NewApplicationForm orgOptions={orgOptions} productOptions={productOptions} />
}
