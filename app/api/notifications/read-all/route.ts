import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/notifications/read-all — mark every notification as read
export async function POST() {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error, count } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false)

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ updated: count ?? 0 })
}
