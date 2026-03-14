import { createClient } from '@/lib/supabase/server'
import Onboarding from '@/components/onboarding/Onboarding'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <Onboarding
      userId={user?.id ?? null}
      inviteToken={(user?.user_metadata as { invite_token?: string } | null)?.invite_token ?? null}
    />
  )
}
