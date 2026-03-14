'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function chooseActor(actor: 'lender' | 'borrower') {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await supabase.from('profiles').upsert({
    id: user.id,
    email: user.email,
    first_name: user.user_metadata?.first_name ?? '',
    last_name: user.user_metadata?.last_name ?? '',
    last_actor: actor,
    updated_at: new Date().toISOString(),
  })

  redirect(actor === 'lender' ? '/dashboard' : '/borrower')
}
